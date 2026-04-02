import { useEffect, useRef, useState, useCallback } from 'react';

export type GestureType = 'pinch-grab' | 'pinch-drag' | 'pinch-release' | 'clear-wipe' | 'palm-wave' | null;

interface HandGestureState {
  isActive: boolean;
  gesture: GestureType;
  confidence: number;
  landmarks: any[];
  handCursorPosition?: { x: number; y: number };
  isPinching?: boolean;
}

interface UseHandGesturesReturn {
  gestureState: HandGestureState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  isEnabled: boolean;
  error: string | null;
}

interface HandGestureCallbacks {
  onPinchStart: (x: number, y: number) => void;
  onPinchMove: (x: number, y: number) => void;
  onPinchRelease: (x: number, y: number) => void;
  onPinchSwipeUp: (velocity: number) => void;
  onPinchSwipeDown: (velocity: number) => void;
  onClearWipe: () => void;
  onPalmWave: (x: number, y: number, velocity: number) => void;
  onHandMove: (x: number, y: number) => void;
}

const PINCH_THRESHOLD = 0.06;
const PINCH_SWIPE_Y_THRESHOLD = 0.12;
const PINCH_SWIPE_DEBOUNCE_MS = 500;
const CLEAR_WIPE_Y_THRESHOLD = 0.12;
const CLEAR_WIPE_VELOCITY_THRESHOLD = 0.3;

export const useHandGestures = (
  callbacks: HandGestureCallbacks
): UseHandGesturesReturn => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gestureState, setGestureState] = useState<HandGestureState>({
    isActive: false,
    gesture: null,
    confidence: 0,
    landmarks: [],
  });

  const isPinching = useRef(false);
  const pinchStartY = useRef<number | null>(null);
  const pinchStartTime = useRef(0);
  const lastSwipeTime = useRef(0);
  const clearWipeTriggered = useRef(false);

  // Per-hand tracking for two-palm wipe
  const previousPalmPositions = useRef<({ x: number; y: number } | null)[]>([null, null]);
  const palmPositionTimes = useRef<number[]>([0, 0]);

  // Single-hand palm wave tracking
  const previousPalmWavePos = useRef<{ x: number; y: number } | null>(null);
  const palmWaveTime = useRef(0);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const calculateDistance = (point1: any, point2: any): number => {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = (point1.z || 0) - (point2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  const isFingerExtended = (landmarks: any[], tipIdx: number, pipIdx: number): boolean => {
    return landmarks[tipIdx].y < landmarks[pipIdx].y;
  };

  const detectOpenPalm = (landmarks: any[]): boolean => {
    const thumbExtended = landmarks[4].x > landmarks[3].x;
    const indexExtended = isFingerExtended(landmarks, 8, 6);
    const middleExtended = isFingerExtended(landmarks, 12, 10);
    const ringExtended = isFingerExtended(landmarks, 16, 14);
    const pinkyExtended = isFingerExtended(landmarks, 20, 18);
    return thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended;
  };

  const detectPinch = (landmarks: any[]): boolean => {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    return calculateDistance(thumbTip, indexTip) < PINCH_THRESHOLD;
  };

  const getPinchMidpoint = (landmarks: any[]): { x: number; y: number } => {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    return {
      x: (thumbTip.x + indexTip.x) / 2,
      y: (thumbTip.y + indexTip.y) / 2,
    };
  };

  const getPalmCenter = (landmarks: any[]): { x: number; y: number } => {
    const palmX = landmarks.reduce((sum: number, p: any) => sum + p.x, 0) / landmarks.length;
    const palmY = landmarks.reduce((sum: number, p: any) => sum + p.y, 0) / landmarks.length;
    return { x: palmX, y: palmY };
  };

  const drawHandSkeleton = (landmarks: any[], currentlyPinching: boolean) => {
    if (!canvasRef.current || !videoRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx || canvasRef.current.width <= 0 || canvasRef.current.height <= 0) return;

    ctx.save();
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.strokeStyle = currentlyPinching ? '#00FF00' : '#00CCFF';
    ctx.lineWidth = 2;

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17],
    ];

    const w = canvasRef.current.width;
    const h = canvasRef.current.height;

    connections.forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[start].x * w, landmarks[start].y * h);
      ctx.lineTo(landmarks[end].x * w, landmarks[end].y * h);
      ctx.stroke();
    });

    landmarks.forEach((lm: any) => {
      ctx.fillStyle = currentlyPinching ? '#00FF00' : '#FF0000';
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    ctx.restore();
  };

  const processGesture = useCallback((results: any) => {
    try {
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        setGestureState(prev => ({ ...prev, isActive: false, gesture: null, landmarks: [] }));
        isPinching.current = false;
        clearWipeTriggered.current = false;
        previousPalmPositions.current = [null, null];
        previousPalmWavePos.current = null;
        return;
      }

      const now = Date.now();
      const handCount = results.multiHandLandmarks.length;

      // --- TWO-HAND DETECTION: clear wipe ---
      if (handCount >= 2) {
        const hand0 = results.multiHandLandmarks[0];
        const hand1 = results.multiHandLandmarks[1];
        const palm0Open = detectOpenPalm(hand0);
        const palm1Open = detectOpenPalm(hand1);

        if (palm0Open && palm1Open) {
          const center0 = getPalmCenter(hand0);
          const center1 = getPalmCenter(hand1);

          const prev0 = previousPalmPositions.current[0];
          const prev1 = previousPalmPositions.current[1];

          if (prev0 && prev1) {
            const dy0 = center0.y - prev0.y;
            const dy1 = center1.y - prev1.y;
            const dt0 = (now - palmPositionTimes.current[0]) / 1000;
            const dt1 = (now - palmPositionTimes.current[1]) / 1000;
            const vel0 = dt0 > 0 ? Math.abs(dy0) / dt0 : 0;
            const vel1 = dt1 > 0 ? Math.abs(dy1) / dt1 : 0;

            // Both palms moving up (y decreasing) fast enough
            if (
              dy0 < -CLEAR_WIPE_Y_THRESHOLD &&
              dy1 < -CLEAR_WIPE_Y_THRESHOLD &&
              vel0 > CLEAR_WIPE_VELOCITY_THRESHOLD &&
              vel1 > CLEAR_WIPE_VELOCITY_THRESHOLD &&
              !clearWipeTriggered.current
            ) {
              clearWipeTriggered.current = true;
              setGestureState({
                isActive: true,
                gesture: 'clear-wipe',
                confidence: 1,
                landmarks: hand0,
              });
              callbacksRef.current.onClearWipe();

              // Reset after delay so gesture can be triggered again
              setTimeout(() => {
                clearWipeTriggered.current = false;
              }, 2000);

              previousPalmPositions.current = [center0, center1];
              palmPositionTimes.current = [now, now];
              return;
            }
          }

          previousPalmPositions.current = [center0, center1];
          palmPositionTimes.current = [now, now];
        } else {
          previousPalmPositions.current = [null, null];
        }
      }

      // --- SINGLE HAND GESTURES (use first hand) ---
      const landmarks = results.multiHandLandmarks[0];
      const currentlyPinching = detectPinch(landmarks);
      const isPalmOpen = detectOpenPalm(landmarks);

      drawHandSkeleton(landmarks, currentlyPinching);

      // Always emit hand position so the cursor tracks the hand
      const cursorPos = currentlyPinching
        ? getPinchMidpoint(landmarks)
        : { x: landmarks[8].x, y: landmarks[8].y }; // index finger tip
      callbacksRef.current.onHandMove(cursorPos.x, cursorPos.y);

      if (currentlyPinching) {
        const pos = getPinchMidpoint(landmarks);
        previousPalmWavePos.current = null;

        if (!isPinching.current) {
          // Pinch just started
          isPinching.current = true;
          pinchStartY.current = pos.y;
          pinchStartTime.current = now;
          setGestureState({
            isActive: true,
            gesture: 'pinch-grab',
            confidence: 0.9,
            landmarks,
            handCursorPosition: pos,
            isPinching: true,
          });
          callbacksRef.current.onPinchStart(pos.x, pos.y);
        } else {
          // Continuing pinch -- check for vertical swipe
          if (
            pinchStartY.current !== null &&
            now - lastSwipeTime.current > PINCH_SWIPE_DEBOUNCE_MS
          ) {
            const deltaY = pos.y - pinchStartY.current;
            const elapsed = (now - pinchStartTime.current) / 1000;
            const velocity = elapsed > 0 ? Math.abs(deltaY) / elapsed : 0;

            if (deltaY < -PINCH_SWIPE_Y_THRESHOLD) {
              // Swiped up (y decreased)
              callbacksRef.current.onPinchSwipeUp(velocity);
              lastSwipeTime.current = now;
              pinchStartY.current = pos.y;
              pinchStartTime.current = now;
            } else if (deltaY > PINCH_SWIPE_Y_THRESHOLD) {
              // Swiped down (y increased)
              callbacksRef.current.onPinchSwipeDown(velocity);
              lastSwipeTime.current = now;
              pinchStartY.current = pos.y;
              pinchStartTime.current = now;
            }
          }

          setGestureState({
            isActive: true,
            gesture: 'pinch-drag',
            confidence: 0.9,
            landmarks,
            handCursorPosition: pos,
            isPinching: true,
          });
          callbacksRef.current.onPinchMove(pos.x, pos.y);
        }
        return;
      }

      // Pinch was active but now released
      if (isPinching.current) {
        isPinching.current = false;
        pinchStartY.current = null;
        const pos = getPinchMidpoint(landmarks);
        setGestureState({
          isActive: true,
          gesture: 'pinch-release',
          confidence: 0.9,
          landmarks,
          handCursorPosition: pos,
          isPinching: false,
        });
        callbacksRef.current.onPinchRelease(pos.x, pos.y);
        return;
      }

      // Open palm = shader wave effect
      if (isPalmOpen) {
        const palmCenter = getPalmCenter(landmarks);

        let velocity = 0;
        if (previousPalmWavePos.current && palmWaveTime.current > 0) {
          const dx = palmCenter.x - previousPalmWavePos.current.x;
          const dy = palmCenter.y - previousPalmWavePos.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const dt = (now - palmWaveTime.current) / 1000;
          velocity = dt > 0 ? dist / dt : 0;
        }

        previousPalmWavePos.current = palmCenter;
        palmWaveTime.current = now;

        setGestureState({
          isActive: true,
          gesture: 'palm-wave',
          confidence: 0.9,
          landmarks,
          handCursorPosition: palmCenter,
          isPinching: false,
        });
        callbacksRef.current.onPalmWave(palmCenter.x, palmCenter.y, velocity);
        return;
      }

      // Hand visible but no recognized gesture
      previousPalmWavePos.current = null;
      const wrist = landmarks[0];
      setGestureState(prev => ({
        ...prev,
        isActive: true,
        landmarks,
        handCursorPosition: { x: wrist.x, y: wrist.y },
        isPinching: false,
      }));
    } catch (err) {
      console.error('[HandGestures] Error in processGesture:', err);
    }
  }, []);

  const initializeHands = useCallback(async () => {
    if (handsRef.current) return;

    try {
      console.log('[HandGestures] Loading MediaPipe Hands from CDN...');

      if (!(window as any).Hands) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load MediaPipe Hands script'));
          document.head.appendChild(script);
        });
      }

      const HandsConstructor = (window as any).Hands;
      if (!HandsConstructor) throw new Error('Hands constructor not found');

      const hands = new HandsConstructor({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      hands.onResults(processGesture);
      handsRef.current = hands;
      console.log('[HandGestures] Hands initialized (maxNumHands: 2)');
    } catch (err) {
      console.error('Failed to load MediaPipe Hands:', err);
      setError('Failed to load hand tracking library');
    }
  }, [processGesture]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      if (!videoRef.current) throw new Error('Video element not ready');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      await initializeHands();

      if (handsRef.current && videoRef.current) {
        if (!(window as any).Camera) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Camera utils script'));
            document.head.appendChild(script);
          });
        }

        const CameraConstructor = (window as any).Camera;
        if (!CameraConstructor) throw new Error('Camera constructor not found');

        const camera = new CameraConstructor(videoRef.current, {
          onFrame: async () => {
            try {
              if (handsRef.current && videoRef.current) {
                await handsRef.current.send({ image: videoRef.current });
              }
            } catch (frameError) {
              console.error('[HandGestures] Frame processing error:', frameError);
            }
          },
          width: 640,
          height: 480,
        });

        cameraRef.current = camera;
        await camera.start();
        setIsEnabled(true);
      } else {
        throw new Error('Failed to initialize hand tracking');
      }
    } catch (err: any) {
      console.error('[HandGestures] Error starting camera:', err);
      setError(err.message || 'Failed to access camera');
      setIsEnabled(false);
    }
  }, [initializeHands]);

  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsEnabled(false);
    setGestureState({ isActive: false, gesture: null, confidence: 0, landmarks: [] });
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
    };
  }, [stopCamera]);

  return {
    gestureState,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    isEnabled,
    error,
  };
};
