import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHandGestures, type GestureType } from '../hooks/useHandGestures';

interface HandGestureControllerProps {
  isActive: boolean;
  onPinchStart: (x: number, y: number) => void;
  onPinchMove: (x: number, y: number) => void;
  onPinchRelease: (x: number, y: number) => void;
  onPinchSwipeUp: (velocity: number) => void;
  onPinchSwipeDown: (velocity: number) => void;
  onClearWipe: () => void;
  onPalmWave: (x: number, y: number, velocity: number) => void;
  onHandMove: (x: number, y: number) => void;
  onClose: () => void;
}

const HandGestureController: React.FC<HandGestureControllerProps> = ({
  isActive,
  onPinchStart,
  onPinchMove,
  onPinchRelease,
  onPinchSwipeUp,
  onPinchSwipeDown,
  onClearWipe,
  onPalmWave,
  onHandMove,
  onClose,
}) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackGesture, setFeedbackGesture] = useState<GestureType>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const {
    gestureState,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    isEnabled,
    error,
  } = useHandGestures({
    onPinchStart,
    onPinchMove,
    onPinchRelease,
    onPinchSwipeUp,
    onPinchSwipeDown,
    onClearWipe: () => {
      onClearWipe();
      showGestureFeedback('clear-wipe');
    },
    onPalmWave: (x, y, velocity) => {
      onPalmWave(x, y, velocity);
      if (velocity > 0.1) {
        showGestureFeedback('palm-wave');
      }
    },
    onHandMove,
  });

  const showGestureFeedback = (gesture: GestureType) => {
    setFeedbackGesture(gesture);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 1000);
  };

  useEffect(() => {
    if (isActive) {
      const timeout = setTimeout(() => {
        startCamera();
      }, 100);
      return () => clearTimeout(timeout);
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const getGestureIcon = (gesture: GestureType) => {
    switch (gesture) {
      case 'pinch-grab':
      case 'pinch-drag':
        return '🤏';
      case 'pinch-release':
        return '✋';
      case 'clear-wipe':
        return '🧹';
      case 'palm-wave':
        return '🌊';
      default:
        return '';
    }
  };

  const getGestureText = (gesture: GestureType) => {
    switch (gesture) {
      case 'pinch-grab':
        return 'Grabbed!';
      case 'pinch-drag':
        return 'Dragging...';
      case 'pinch-release':
        return 'Dropped!';
      case 'clear-wipe':
        return 'Canvas Cleared!';
      case 'palm-wave':
        return 'Shader Ripple';
      default:
        return '';
    }
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <motion.div
            animate={{
              width: isMinimized ? '80px' : '280px',
              height: isMinimized ? '60px' : '210px',
            }}
            className="relative bg-black/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20"
          >
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full scale-x-[-1]"
              />

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-4">
                  <div className="text-center">
                    <p className="text-red-400 text-sm mb-2">Camera Error</p>
                    <p className="text-white/60 text-xs">{error}</p>
                  </div>
                </div>
              )}

              {!isEnabled && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
                    <p className="text-white/60 text-xs">Starting camera...</p>
                  </div>
                </div>
              )}

              {isEnabled && gestureState.isActive && !isMinimized && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-2 left-2 px-2 py-1 bg-green-500/80 backdrop-blur-sm rounded-full text-white text-xs font-medium"
                >
                  {gestureState.isPinching ? 'Pinching' : 'Hand Detected'}
                </motion.div>
              )}

              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="absolute top-2 right-2 w-6 h-6 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all"
              >
                <span className="text-white text-xs">
                  {isMinimized ? '□' : '−'}
                </span>
              </button>

              <button
                onClick={onClose}
                className="absolute top-2 right-10 w-6 h-6 bg-red-500/60 hover:bg-red-500/80 backdrop-blur-sm rounded-full flex items-center justify-center transition-all"
              >
                <span className="text-white text-xs font-bold">×</span>
              </button>
            </div>

            {!isMinimized && isEnabled && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3"
              >
                <div className="text-white/80 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤏</span>
                    <span>Pinch to grab & drag</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🙌</span>
                    <span>Two palms wipe up to clear</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🌊</span>
                    <span>Open palm for shader effects</span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          <AnimatePresence>
            {showFeedback && feedbackGesture && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl px-6 py-4 border border-black/10"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getGestureIcon(feedbackGesture)}</span>
                  <span className="text-black font-medium">{getGestureText(feedbackGesture)}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isMinimized && gestureState.isActive && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
              className={`absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-white ${
                gestureState.isPinching ? 'bg-yellow-500' : 'bg-green-500'
              }`}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HandGestureController;
