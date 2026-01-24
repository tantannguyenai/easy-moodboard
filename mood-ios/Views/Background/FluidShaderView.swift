import SwiftUI
import MetalKit

struct FluidShaderView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    func makeUIView(context: Context) -> MTKView {
        let mtkView = MTKView()
        mtkView.delegate = context.coordinator
        mtkView.device = MTLCreateSystemDefaultDevice()
        mtkView.framebufferOnly = false
        mtkView.clearColor = MTLClearColor(red: 1, green: 1, blue: 1, alpha: 1)
        mtkView.drawableSize = mtkView.frame.size
        return mtkView
    }
    
    func updateUIView(_ uiView: MTKView, context: Context) {}
    
    class Coordinator: NSObject, MTKViewDelegate {
        var parent: FluidShaderView
        var device: MTLDevice!
        var commandQueue: MTLCommandQueue!
        var pipelineState: MTLRenderPipelineState!
        var startTime: Date = Date()
        
        init(_ parent: FluidShaderView) {
            self.parent = parent
            super.init()
            
            guard let device = MTLCreateSystemDefaultDevice() else { return }
            self.device = device
            self.commandQueue = device.makeCommandQueue()
            
            // In a real project, you would load the shader from the library
            // let library = device.makeDefaultLibrary()
            // let vertexFunction = library?.makeFunction(name: "vertexShader")
            // let fragmentFunction = library?.makeFunction(name: "fluidShader")
            
            // Pipeline State creation would go here
        }
        
        func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}
        
        func draw(in view: MTKView) {
            guard let drawable = view.currentDrawable,
                  let descriptor = view.currentRenderPassDescriptor,
                  let pipelineState = pipelineState else { return }
            
            let commandBuffer = commandQueue.makeCommandBuffer()
            let encoder = commandBuffer?.makeRenderCommandEncoder(descriptor: descriptor)
            
            encoder?.setRenderPipelineState(pipelineState)
            
            // Set verify buffers here (Time, Resolution)
            var time = Float(Date().timeIntervalSince(startTime))
            var resolution = SIMD2<Float>(Float(view.drawableSize.width), Float(view.drawableSize.height))
            
            encoder?.setFragmentBytes(&time, length: MemoryLayout<Float>.stride, index: 0)
            encoder?.setFragmentBytes(&resolution, length: MemoryLayout<SIMD2<Float>>.stride, index: 1)
            
            encoder?.drawPrimitives(type: .triangleStrip, vertexStart: 0, vertexCount: 4)
            encoder?.endEncoding()
            
            commandBuffer?.present(drawable)
            commandBuffer?.commit()
        }
    }
}
