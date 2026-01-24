import SwiftUI

struct CanvasView: View {
    @StateObject var vm = CanvasViewModel()
    
    var body: some View {
        ZStack {
            // Background
            Color(hex: "#F3F4F6").ignoresSafeArea()
            
            // Shader Layer (Placeholder for Metal View integration)
            // FluidShaderView()
            
            // Canvas Area
            GeometryReader { geo in
                ZStack {
                    ForEach($vm.items) { $item in
                        CardView(item: $item)
                            .environmentObject(vm)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .contentShape(Rectangle())
                // .onDrop(...) // Add DropDelegate implementation here
            }
            
            // UI Overlay (Dock)
            VStack {
                Spacer()
                DockView()
                    .padding(.bottom, 20)
            }
        }
        .statusBar(hidden: true)
    }
}

struct DockView: View {
    var body: some View {
        HStack(spacing: 20) {
            CircleButton(icon: "plus")
            CircleButton(icon: "textformat")
            CircleButton(icon: "photo")
            CircleButton(icon: "square.and.arrow.up")
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(30)
        .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
    }
}

struct CircleButton: View {
    let icon: String
    var body: some View {
        Button(action: {}) {
            Image(systemName: icon)
                .font(.system(size: 20, weight: .light))
                .foregroundColor(.black)
                .frame(width: 50, height: 50)
                .background(Color.white.opacity(0.8))
                .clipShape(Circle())
        }
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
