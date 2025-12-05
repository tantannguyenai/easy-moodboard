import React, { useEffect, useRef, useState } from 'react';

interface DissolveEffectProps {
    imageUrl: string;
    duration?: number;
    initialColor?: string;
}

export const DissolveEffect: React.FC<DissolveEffectProps> = ({ imageUrl, duration = 2000, initialColor = 'rgba(255,255,255,1)' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [colors, setColors] = useState<number[][]>([
        [0.88, 0.91, 1.0],
        [0.98, 0.91, 1.0],
        [0.95, 0.96, 0.98],
        [0.90, 0.95, 1.0],
        [0.95, 0.90, 0.95]
    ]);

    // Parse initial color for texture placeholder
    const getInitialColorData = () => {
        const match = initialColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            return new Uint8Array([parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), 255]);
        }
        return new Uint8Array([255, 255, 255, 255]);
    };

    // Color extraction (same as ShaderBackground)
    useEffect(() => {
        if (!imageUrl) return;
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            canvas.width = 50;
            canvas.height = 50;
            ctx.drawImage(img, 0, 0, 50, 50);

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
        };
    }, [imageUrl]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl');
        if (!gl) return;

        const vertexShaderSource = `
            attribute vec2 position;
            varying vec2 vUv;
            void main() {
                vUv = position * 0.5 + 0.5;
                vUv.y = 1.0 - vUv.y;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            uniform vec2 u_resolution;
            uniform float u_time;
            uniform float u_progress; // 0.0 to 1.0
            uniform vec3 u_colors[5];
            uniform sampler2D u_image;
            
            varying vec2 vUv;

            // Simplex noise
            vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
            float snoise(vec2 v){
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1;
                i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod(i, 289.0);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m ;
                m = m*m ;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution.xy;
                
                // --- FLUID BACKGROUND ---
                // Softer, slower movement
                float time = u_time * 0.1 + u_progress * 1.0; 
                
                // Lower frequency for landscape feel
                float n1 = snoise(uv * 0.8 + vec2(time * 0.2, time * 0.1)); 
                
                // Simpler distortion
                vec2 distortedUV = uv + vec2(n1) * 0.05;
                
                // Single layer mixing for cleaner look
                float mix1 = snoise(distortedUV * 0.6 + time * 0.1);
                
                vec3 fluidColor = mix(u_colors[0], u_colors[1], smoothstep(-0.8, 0.8, mix1));
                fluidColor = mix(fluidColor, u_colors[2], smoothstep(-0.5, 0.5, n1));
                fluidColor = mix(fluidColor, u_colors[3], smoothstep(0.0, 1.0, n1));
                
                // Soften
                fluidColor = mix(fluidColor, vec3(1.0), 0.1); 

                // --- IMAGE DISSOLVE ---
                // Distort image UVs - Softer waves
                float distort = snoise(vUv * 2.0 + u_progress * 3.0) * u_progress * 0.3;
                vec2 imgUV = vUv + vec2(distort);
                
                vec4 imgColor = texture2D(u_image, imgUV);
                
                // Mix image with fluid
                vec3 finalColor = mix(imgColor.rgb, fluidColor, u_progress);
                
                // Fade out alpha at the end
                float alpha = 1.0 - smoothstep(0.8, 1.0, u_progress);
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `;

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

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const positionLocation = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const locs = {
            resolution: gl.getUniformLocation(program, 'u_resolution'),
            time: gl.getUniformLocation(program, 'u_time'),
            progress: gl.getUniformLocation(program, 'u_progress'),
            colors: gl.getUniformLocation(program, 'u_colors'),
            image: gl.getUniformLocation(program, 'u_image'),
        };

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Use initial color to prevent black flash
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, getInitialColorData());

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        };

        let animationFrameId: number;
        const startTime = Date.now();

        const render = () => {
            const displayWidth = canvas.clientWidth;
            const displayHeight = canvas.clientHeight;
            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
                canvas.width = displayWidth;
                canvas.height = displayHeight;
                gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            }

            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);

            gl.uniform2f(locs.resolution, canvas.width, canvas.height);
            gl.uniform1f(locs.time, elapsed * 0.001);
            gl.uniform1f(locs.progress, progress);
            gl.uniform3fv(locs.colors, new Float32Array(colors.flat()));

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(locs.image, 0);

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            if (progress < 1.0) {
                animationFrameId = requestAnimationFrame(render);
            }
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            gl.deleteProgram(program);
            gl.deleteTexture(texture);
        };
    }, [colors, imageUrl, duration, initialColor]);



    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-50 rounded-inherit"
            style={{ borderRadius: 'inherit' }}
        />
    );
};
