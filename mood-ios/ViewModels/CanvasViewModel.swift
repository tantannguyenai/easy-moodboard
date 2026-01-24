import SwiftUI
import Combine

class CanvasViewModel: ObservableObject {
    @Published var items: [BoardItem] = []
    @Published var activeIndex: Int = 0
    @Published var layoutMode: LayoutMode = .organic
    @Published var isDockExpanded: Bool = true
    @Published var globalZIndex: Int = 10
    
    enum LayoutMode {
        case organic
        case grid
        case animate
    }
    
    init() {
        // Load initial data or demo data
        loadDemoData()
    }
    
    // MARK: - Actions
    
    func addItem(type: MediaType, content: String) {
        let newItem = BoardItem(
            id: UUID().uuidString,
            type: type,
            content: content,
            x: CGFloat.random(in: 100...300),
            y: CGFloat.random(in: 100...600),
            width: type == .text ? 300 : 250,
            height: type == .text ? 150 : 350, // Aspect ratio placeholder
            rotation: Double.random(in: -5...5),
            zIndex: globalZIndex + 1
        )
        items.append(newItem)
        globalZIndex += 1
    }
    
    func bringToFront(item: BoardItem) {
        if let index = items.firstIndex(where: { $0.id == item.id }) {
            var updatedItem = items[index]
            updatedItem.zIndex = globalZIndex + 1
            items[index] = updatedItem
            globalZIndex += 1
        }
    }
    
    func updateItemPosition(id: String, x: CGFloat, y: CGFloat, rotation: Double, scale: CGFloat) {
        if let index = items.firstIndex(where: { $0.id == id }) {
            items[index].x = x
            items[index].y = y
            items[index].rotation = rotation
            items[index].scale = scale
        }
    }
    
    func removeItem(id: String) {
        items.removeAll(where: { $0.id == id })
    }
    
    // MARK: - Demo Data
    func loadDemoData() {
        // Add some placeholders
        items = [
            BoardItem(id: "1", type: .image, content: "https://images.unsplash.com/photo-1523726491678-bf852e717f63?q=80&w=2940&auto=format&fit=crop", x: 150, y: 300, width: 220, height: 300, rotation: -4, zIndex: 1),
            BoardItem(id: "2", type: .text, content: "Simplicity is the ultimate sophistication.", x: 200, y: 500, width: 280, height: 120, rotation: 2, zIndex: 2),
             BoardItem(id: "3", type: .image, content: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop", x: 100, y: 150, width: 250, height: 180, rotation: 6, zIndex: 0)
        ]
    }
}
