import React, { useEffect, useRef, useState } from 'react';


interface ShaderBackgroundProps {
    imageUrl?: string;
    isActive: boolean;
    isVideo?: boolean;
    onColorsExtracted?: (colors: string[]) => void;
    enableMotionBlur?: boolean;
    motionBlurIntensity?: number;
    isPaused?: boolean;
    shaderMode?: 'soft' | 'extreme';
}

export const ShaderBackground: React.FC<ShaderBackgroundProps> = ({
    imageUrl,
    isActive,
    isVideo,
    onColorsExtracted,
    enableMotionBlur = false,
    motionBlurIntensity = 0.5,
    isPaused = false,
    shaderMode = 'soft'
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Refs for Motion Blur, Pause, and Mode to access in render loop
    const propsRef = useRef({
        motionBlur: enableMotionBlur,
        blurIntensity: motionBlurIntensity,
        paused: isPaused,
        mode: shaderMode
    });

    useEffect(() => {
        propsRef.current = {
            motionBlur: enableMotionBlur,
            blurIntensity: motionBlurIntensity,
            paused: isPaused,
            mode: shaderMode
        };
    }, [enableMotionBlur, motionBlurIntensity, isPaused, shaderMode]);

    // Color State
    const [colors, setColors] = useState<number[][]>([
        [0.88, 0.91, 1.0], // #e0e7ff
        [0.96, 0.98, 1.0], // #f3f4f6
        [0.80, 0.85, 1.0], // #c7d2fe
        [0.90, 0.95, 1.0], // #e0e7ff
        [0.85, 0.90, 1.0], // #dbeafe
    ]);

    // Refs for GL State to avoid re-initialization
    const glState = useRef<{
        gl: WebGLRenderingContext | null;
        program: WebGLProgram | null;
        textures: { t0: WebGLTexture | null; t1: WebGLTexture | null };
        videos: { t0: HTMLVideoElement | null; t1: HTMLVideoElement | null }; // Store video elements
        activeTextureIndex: number; // 0 means t0 is current, 1 means t1 is current
        transitionStartTime: number;
        isTransitioning: boolean;
        hasImage: boolean;
    }>({
        gl: null,
        program: null,
        textures: { t0: null, t1: null },
        videos: { t0: null, t1: null },
        activeTextureIndex: 0,
        transitionStartTime: 0,
        isTransitioning: false,
        hasImage: false
    });

    // Refs for Color Transition
    const targetColorsRef = useRef<number[][]>(colors);
    const currentColorsRef = useRef<number[][]>(colors);

    // Ref for Mode Transition (0 = soft, 1 = extreme)
    const currentModeRef = useRef<number>(shaderMode === 'extreme' ? 1.0 : 0.0);

    // 1. Color Extraction Logic
    useEffect(() => {
        if (!imageUrl) return;
        let isCancelled = false;

        const extractColors = (source: CanvasImageSource) => {
            if (isCancelled) return;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            canvas.width = 50;
            canvas.height = 50;
            ctx.drawImage(source, 0, 0, 50, 50);

            const getColor = (x: number, y: number) => {
                const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
                return [r / 255, g / 255, b / 255];
            };

            setColors([
                getColor(25, 25),
                getColor(10, 10),
                getColor(40, 40),
                getColor(10, 40),
                getColor(40, 10),
            ]);

            if (onColorsExtracted) {
                const cssColors = [
                    getColor(25, 25),
                    getColor(10, 10),
                    getColor(40, 40),
                    getColor(10, 40),
                    getColor(40, 10),
                ].map(c => `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`);
                onColorsExtracted(cssColors);
            }
        };

        if (isVideo) {
            const video = document.createElement('video');
            video.crossOrigin = "Anonymous";
            video.src = imageUrl;
            video.muted = true;
            video.playsInline = true;
            video.autoplay = true; // Help trigger loading

            const onSeeked = () => {
                if (isCancelled) return;
                extractColors(video);
                // Cleanup
                video.pause();
                video.src = "";
                video.removeEventListener('seeked', onSeeked);
            };

            const onLoadedData = () => {
                if (isCancelled) return;
                // Seek to avoid black start frame
                video.currentTime = 0.5;
            };

            video.addEventListener('loadeddata', onLoadedData);
            video.addEventListener('seeked', onSeeked);
            video.load();
        } else {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = imageUrl;
            img.onload = () => {
                if (isCancelled) return;
                extractColors(img);
            };
        }

        return () => {
            isCancelled = true;
        };
    }, [imageUrl, isVideo]);

    // 2. Sync Colors to Ref
    useEffect(() => {
        targetColorsRef.current = colors;
    }, [colors]);

    // 3. Handle Image/Video Updates (Texture Loading)
    useEffect(() => {
        const state = glState.current;
        if (!state.gl || !state.textures.t0 || !state.textures.t1 || !imageUrl) return;

        let isCancelled = false;
        const gl = state.gl!;
        // Determine which texture is "next"
        const nextTextureIndex = state.activeTextureIndex === 0 ? 1 : 0;
        const nextTexture = nextTextureIndex === 0 ? state.textures.t0 : state.textures.t1;

        // Cleanup previous video in the next slot if any
        if (nextTextureIndex === 0 && state.videos.t0) {
            state.videos.t0.pause();
            state.videos.t0.src = "";
            state.videos.t0 = null;
        } else if (nextTextureIndex === 1 && state.videos.t1) {
            state.videos.t1.pause();
            state.videos.t1.src = "";
            state.videos.t1 = null;
        }

        const triggerTransition = () => {
            if (isCancelled) return;
            if (!state.hasImage) {
                state.hasImage = true;
                state.activeTextureIndex = state.activeTextureIndex === 0 ? 1 : 0;
            } else {
                state.isTransitioning = true;
                state.transitionStartTime = Date.now();
            }
        };

        if (isVideo) {
            const video = document.createElement('video');
            video.crossOrigin = "Anonymous";
            video.src = imageUrl;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.autoplay = true;
            video.setAttribute('playsinline', 'true'); // Explicit attribute

            // Force loop
            video.onended = () => {
                video.currentTime = 0;
                video.play().catch(() => { });
            };

            // Store video ref
            if (nextTextureIndex === 0) state.videos.t0 = video;
            else state.videos.t1 = video;

            const onReady = () => {
                if (isCancelled) return;
                video.play().catch(() => { }); // Ignore play errors
                triggerTransition();
            };

            video.oncanplay = onReady;
            video.onerror = () => {
                console.warn("Failed to load video texture:", imageUrl);
            };

            // Check if already ready
            if (video.readyState >= 3) {
                onReady();
            }
        } else {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = imageUrl;
            img.onload = () => {
                if (isCancelled) return;
                gl.bindTexture(gl.TEXTURE_2D, nextTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                triggerTransition();
            };
            img.onerror = () => {
                console.warn("Failed to load image texture:", imageUrl);
            };
        }

        return () => {
            isCancelled = true;
        };
    }, [imageUrl, isVideo]);

    // 4. Main WebGL Initialization & Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isActive) return;

        const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
        if (!gl) return;

        // Store GL context
        glState.current.gl = gl;

        const vertexShaderSource = `
            attribute vec2 position;
            varying vec2 vUv;
void main() {
    vUv = position * 0.5 + 0.5;
    vUv.y = 1.0 - vUv.y; // Flip Y
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

        const fragmentShaderSource = `
            precision mediump float;
            uniform vec2 u_resolution;
            uniform float u_time;
            uniform vec3 u_colors[5];
            
            uniform sampler2D u_image0;
            uniform sampler2D u_image1;
            uniform float u_imgMix;
            uniform float u_hasImage;
            uniform float u_motionBlur;
            uniform float u_blurIntensity;
            uniform float u_shaderMode; // 0.0 = soft, 1.0 = extreme
            
            varying vec2 vUv;

            // Simplex noise
            vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
            float snoise(vec2 v){
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i = floor(v + dot(v, C.yy));
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1;
                i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod(i, 289.0);
                vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
                m = m * m;
                m = m * m;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
                vec3 g;
                g.x = a0.x * x0.x + h.x * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }

            // Helper for saturation
            vec3 adjustSaturation(vec3 color, float saturation) {
                float gray = dot(color, vec3(0.2126, 0.7152, 0.0722));
                return mix(vec3(gray), color, saturation);
            }

            // Helper to sample texture with blur
            vec4 sampleBlurred(sampler2D tex, vec2 uv, float blurAmount) {
                vec4 c = texture2D(tex, uv);
                vec4 l = texture2D(tex, uv + vec2(blurAmount, 0.0));
                vec4 r = texture2D(tex, uv - vec2(blurAmount, 0.0));
                vec4 u = texture2D(tex, uv + vec2(0.0, blurAmount));
                vec4 d = texture2D(tex, uv - vec2(0.0, blurAmount));
                return (c + l + r + u + d) / 5.0;
            }

            // Motion Blur Sampling
            vec4 sampleMotionBlur(sampler2D tex, vec2 uv, float intensity, float time) {
                vec4 color = vec4(0.0);
                float total = 0.0;
                
                // Randomize direction based on time
                float angle = snoise(vec2(time * 0.2, 0.0)) * 6.28;
                vec2 dir = vec2(cos(angle), sin(angle));
                
                // Randomize strength slightly
                float strength = intensity * 0.02 * (0.8 + 0.4 * snoise(vec2(0.0, time * 0.5)));
                
                for (float i = -4.0; i <= 4.0; i += 1.0) {
                    float weight = 1.0 - abs(i) / 5.0; // Center weighted
                    vec2 offset = dir * strength * i;
                    color += texture2D(tex, uv + offset) * weight;
                    total += weight;
                }
                return color / total;
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution.xy;
                
                // --- MODE ADJUSTMENTS ---
                // --- MODE ADJUSTMENTS ---
                float speedMult = mix(0.05, 0.25, u_shaderMode); // Much faster in extreme mode
                float time = u_time * speedMult;
                
                float waveAmp = mix(0.1, 0.4, u_shaderMode); // Stronger distortion
                // Soft: Balanced frequency. Extreme: Stretched horizontally (low Y freq, high X freq)
                vec2 waveFreq = mix(vec2(1.5, 1.5), vec2(3.0, 0.5), u_shaderMode); 

                // --- FLUID BACKGROUND ---
                // Use waveFreq to scale UVs before noise
                float n1 = snoise(uv * waveFreq + vec2(time * 0.5, time * 0.2)); 
                float n2 = snoise(uv * waveFreq - vec2(time * 0.2, time * 0.5) + n1);
                vec2 distortedUV = uv + vec2(n1, n2) * waveAmp;
                
                float mix1 = snoise(distortedUV * 1.0 + time * 0.3);
                float mix2 = snoise(distortedUV * 2.0 - time * 0.2);
                
                vec3 color = mix(u_colors[0], u_colors[1], smoothstep(-0.8, 0.8, mix1));
                color = mix(color, u_colors[2], smoothstep(-0.8, 0.8, mix2));
                color = mix(color, u_colors[3], smoothstep(-0.8, 0.8, n1));
                color = mix(color, u_colors[4], smoothstep(0.2, 1.0, n2) * 0.5);

                // --- IMAGE INTEGRATION ---
                if (u_hasImage > 0.5) {
                    vec2 center = vec2(0.5);
                    float dist = distance(vUv, center);
                    
                    // In extreme mode, make the mask softer/smaller so waves are more visible around edges
                    float maskEdge = mix(0.7, 0.6, u_shaderMode);
                    float maskSoftness = mix(0.1, 0.3, u_shaderMode);
                    float mask = smoothstep(maskEdge, maskSoftness, dist); 

                    // Dynamic blur based on transition
                    float transitionBlur = sin(u_imgMix * 3.14159) * 0.015;
                    float baseBlur = 0.001; 
                    float totalBlur = baseBlur + transitionBlur;

                    // Subtle wave animation for image - Reduced distortion
                    float imgDistortStr = mix(0.015, 0.04, u_shaderMode); // More image distortion in extreme mode
                    float imgWaveX = snoise(vUv * 3.0 + time * 0.5) * imgDistortStr;
                    float imgWaveY = snoise(vUv * 3.0 - time * 0.4) * imgDistortStr;
                    vec2 waveUV = vUv + vec2(imgWaveX, imgWaveY);

                    vec4 img0, img1;

                    if (u_motionBlur > 0.5) {
                        img0 = sampleMotionBlur(u_image0, waveUV, u_blurIntensity, time);
                        img1 = sampleMotionBlur(u_image1, waveUV, u_blurIntensity, time);
                    } else {
                        img0 = sampleBlurred(u_image0, waveUV, totalBlur);
                        img1 = sampleBlurred(u_image1, waveUV, totalBlur);
                    }

                    // Crossfade images
                    vec4 finalImg = mix(img0, img1, u_imgMix);

                    // Pure Mix for clarity (no additive white)
                    // In extreme mode, reduce image opacity slightly to let waves show through more?
                    float imgOpacity = mix(0.9, 0.7, u_shaderMode);
                    color = mix(color, finalImg.rgb, mask * imgOpacity);
                }

                // Enhance Vibrancy
                color = adjustSaturation(color, 1.2); // Moderate saturation boost
                color = pow(color, vec3(0.95)); // Subtle contrast

                // No Grain
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        // Shader Compile Helper
        const createShader = (type: number, source: string) => {
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        if (!vertexShader || !fragmentShader) return;

        const program = gl.createProgram();
        if (!program) return;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);
        glState.current.program = program;

        // Geometry
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const positionLocation = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Uniforms
        const locs = {
            resolution: gl.getUniformLocation(program, 'u_resolution'),
            time: gl.getUniformLocation(program, 'u_time'),
            colors: gl.getUniformLocation(program, 'u_colors'),
            image0: gl.getUniformLocation(program, 'u_image0'),
            image1: gl.getUniformLocation(program, 'u_image1'),
            imgMix: gl.getUniformLocation(program, 'u_imgMix'),
            hasImage: gl.getUniformLocation(program, 'u_hasImage'),
            motionBlur: gl.getUniformLocation(program, 'u_motionBlur'),
            blurIntensity: gl.getUniformLocation(program, 'u_blurIntensity'),
            shaderMode: gl.getUniformLocation(program, 'u_shaderMode'),
        };

        // Create Textures
        const createTexture = () => {
            const t = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, t);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
            return t;
        };

        glState.current.textures.t0 = createTexture();
        glState.current.textures.t1 = createTexture();

        // Animation Loop
        let animationFrameId: number;
        let lastTime = Date.now();
        let accumulatedTime = 0;
        const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

        const render = () => {
            // Resize
            const displayWidth = canvas.clientWidth;
            const displayHeight = canvas.clientHeight;
            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
                canvas.width = displayWidth;
                canvas.height = displayHeight;
                gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            }

            gl.useProgram(program);

            const now = Date.now();
            const dt = (now - lastTime) * 0.001;
            lastTime = now;

            const props = propsRef.current;
            // Always update time so shader keeps moving even when paused
            accumulatedTime += dt;

            // 1. Update Uniforms
            // 1. Update Uniforms
            gl.uniform2f(locs.resolution, canvas.width, canvas.height);
            gl.uniform1f(locs.time, accumulatedTime);
            gl.uniform1f(locs.hasImage, glState.current.hasImage ? 1.0 : 0.0);

            gl.uniform1f(locs.motionBlur, props.motionBlur ? 1.0 : 0.0);
            gl.uniform1f(locs.blurIntensity, props.blurIntensity);

            // Smoothly interpolate shader mode
            const targetMode = props.mode === 'extreme' ? 1.0 : 0.0;
            currentModeRef.current = lerp(currentModeRef.current, targetMode, 0.005);
            gl.uniform1f(locs.shaderMode, currentModeRef.current);

            // Ensure active video is playing (fix for pause mode)
            const activeIndex = glState.current.activeTextureIndex;
            const activeVideo = activeIndex === 0 ? glState.current.videos.t0 : glState.current.videos.t1;
            if (activeVideo && activeVideo.paused && activeVideo.readyState >= 2) {
                activeVideo.play().catch(() => { });
            }

            // 2. Color Transition
            const target = targetColorsRef.current;
            const current = currentColorsRef.current;
            const newColors = current.map((c, i) => [
                lerp(c[0], target[i][0], 0.02),
                lerp(c[1], target[i][1], 0.02),
                lerp(c[2], target[i][2], 0.02)
            ]);
            currentColorsRef.current = newColors;
            gl.uniform3fv(locs.colors, new Float32Array(newColors.flat()));

            // 3. Image Transition Logic
            const state = glState.current;
            let mixValue = 0.0;

            if (state.isTransitioning) {
                const elapsed = Date.now() - state.transitionStartTime;
                const duration = 2000; // 2 seconds transition
                const progress = Math.min(elapsed / duration, 1.0);

                if (state.activeTextureIndex === 0) {
                    mixValue = progress;
                } else {
                    mixValue = 1.0 - progress;
                }

                if (progress >= 1.0) {
                    state.isTransitioning = false;
                    state.activeTextureIndex = state.activeTextureIndex === 0 ? 1 : 0;
                    mixValue = state.activeTextureIndex === 0 ? 0.0 : 1.0;

                    // Cleanup inactive video to save resources
                    const inactiveIndex = state.activeTextureIndex === 0 ? 1 : 0;
                    if (inactiveIndex === 0 && state.videos.t0) {
                        state.videos.t0.pause();
                    } else if (inactiveIndex === 1 && state.videos.t1) {
                        state.videos.t1.pause();
                    }
                }
            } else {
                mixValue = state.activeTextureIndex === 0 ? 0.0 : 1.0;
            }

            gl.uniform1f(locs.imgMix, mixValue);

            // Update Video Textures if necessary
            if (state.videos.t0 && state.videos.t0.readyState >= 2) {
                gl.bindTexture(gl.TEXTURE_2D, state.textures.t0);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, state.videos.t0);
            }
            if (state.videos.t1 && state.videos.t1.readyState >= 2) {
                gl.bindTexture(gl.TEXTURE_2D, state.textures.t1);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, state.videos.t1);
            }

            // Bind Textures
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, state.textures.t0);
            gl.uniform1i(locs.image0, 0);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, state.textures.t1);
            gl.uniform1i(locs.image1, 1);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            gl.deleteProgram(program);
            if (glState.current.textures.t0) gl.deleteTexture(glState.current.textures.t0);
            if (glState.current.textures.t1) gl.deleteTexture(glState.current.textures.t1);
            // Cleanup videos
            if (glState.current.videos.t0) { glState.current.videos.t0.pause(); glState.current.videos.t0.src = ""; }
            if (glState.current.videos.t1) { glState.current.videos.t1.pause(); glState.current.videos.t1.src = ""; }
        };
    }, [isActive]);

    if (!isActive) return null;

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />
    );
};
