import SwiftUI
import AVKit

struct CardView: View {
    @Binding var item: BoardItem
    @EnvironmentObject var vm: CanvasViewModel
    
    // Gesture States
    @GestureState private var dragOffset = CGSize.zero
    @GestureState private var isDragging = false
    @State private var position: CGPoint = .zero
    @State private var activeRotation: Double = 0
    @State private var activeScale: CGFloat = 1.0
    
    var body: some View {
        GeometryReader { geo in
            ZStack {
                // Content
                if item.type == .image {
                    AsyncImage(url: URL(string: item.content)) { phase in
                        switch phase {
                        case .empty:
                            Rectangle().fill(Color.gray.opacity(0.1))
                                .overlay(ProgressView())
                        case .success(let image):
                            image.resizable()
                                .aspectRatio(contentMode: .fill)
                        case .failure:
                            Rectangle().fill(Color.red.opacity(0.1))
                                .overlay(Image(systemName: "exclamationmark.triangle"))
                        @unknown default:
                            EmptyView()
                        }
                    }
                } else if item.type == .text {
                    Text(item.content)
                        .font(.custom("Piazzolla-Regular", size: 24))
                        .foregroundColor(.black)
                        .padding()
                        .multilineTextAlignment(.center)
                        .background(Color.white.opacity(0.5)) // Slightly more opaque for text
                }
            }
            .frame(width: item.width, height: item.height)
            .background(.ultraThinMaterial)
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(isDragging ? 0.3 : 0.1), radius: isDragging ? 20 : 10, x: 0, y: isDragging ? 10 : 5)
            // Border
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.5), lineWidth: 1)
            )
            // Transforms
            .rotationEffect(Angle(degrees: item.rotation + activeRotation))
            .scaleEffect(item.scale * activeScale)
            .offset(x: item.x + dragOffset.width - (item.width/2), y: item.y + dragOffset.height - (item.height/2)) // Center anchor
            .zIndex(Double(item.zIndex))
            
            // Gestures
            .gesture(
                SimultaneousGesture(
                    DragGesture()
                        .updating($dragOffset) { value, state, _ in
                            state = value.translation
                        }
                        .onChanged { _ in
                            if !isDragging {
                                vm.bringToFront(item: item)
                            }
                        }
                        .onEnded { value in
                            vm.updateItemPosition(
                                id: item.id,
                                x: item.x + value.translation.width,
                                y: item.y + value.translation.height,
                                rotation: item.rotation,
                                scale: item.scale
                            )
                        },
                    MagnificationGesture()
                        .onChanged { val in activeScale = val }
                        .onEnded { val in
                            var newItem = item
                            newItem.scale *= val
                            vm.items[vm.items.firstIndex(of: item)!] = newItem
                            activeScale = 1.0
                        }
                )
            )
            // Tap to bring to front
            .onTapGesture {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    vm.bringToFront(item: item)
                }
            }
        }
        .frame(width: 0, height: 0) // Collapse GeometryReader wrapper
    }
}
