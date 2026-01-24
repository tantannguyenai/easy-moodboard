#include <metal_stdlib>
using namespace metal;

struct VertexOut {
    float4 position [[position]];
    float2 uv;
};

// Shader Helper Functions
float3 mod289(float3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
float2 mod289(float2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
float3 permute(float3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(float2 v) {
    const float4 C = float4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    float2 i  = floor(v + dot(v, C.yy) );
    float2 x0 = v -   i + dot(i, C.xx);
    float2 i1;
    i1 = (x0.x > x0.y) ? float2(1.0, 0.0) : float2(0.0, 1.0);
    float4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    float3 p = permute( permute( i.y + float3(0.0, i1.y, 1.0 )) + i.x + float3(0.0, i1.x, 1.0 ));
    float3 m = max(0.5 - float3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    return 105.0 * dot( m*m, float3( dot(p.x,x0), dot(p.y,x12.xy), dot(p.z,x12.zw) ) );
}

// Fragment Shader
fragment float4 fluidShader(VertexOut out [[stage_in]],
                          constant float &time [[buffer(0)]],
                          constant float2 &resolution [[buffer(1)]]) {
    
    float2 uv = out.uv;
    
    // Wave Distortion
    float noise = snoise(uv * 3.0 + time * 0.2);
    
    // Gradient Colors (Pastel)
    float3 color1 = float3(0.96, 0.87, 0.93); // Rose
    float3 color2 = float3(0.85, 0.93, 0.96); // Sky
    float3 color3 = float3(0.91, 0.89, 0.96); // Purple
    
    // Mix based on noise and position
    float3 finalColor = mix(color1, color2, saturate(uv.x + noise * 0.2));
    finalColor = mix(finalColor, color3, saturate(uv.y - noise * 0.1));
    
    // Soft Grain
    float grain = fract(sin(dot(uv + time, float2(12.9898,78.233))) * 43758.5453) * 0.03;
    
    return float4(finalColor + grain, 1.0);
}
