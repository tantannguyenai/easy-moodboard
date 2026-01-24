import SwiftUI
import CoreGraphics

enum MediaType: String, Codable {
    case image
    case video
    case text
}

struct BoardItem: Identifiable, Codable, Equatable {
    var id: String
    var type: MediaType
    var content: String // URL or text
    var author: String?
    
    // Position & Transform
    var x: CGFloat
    var y: CGFloat
    var width: CGFloat
    var height: CGFloat
    var rotation: Double // in degrees
    var zIndex: Int
    
    // Visuals
    var scale: CGFloat = 1.0
    
    // Equatable for performance optimization in SwiftUI
    static func == (lhs: BoardItem, rhs: BoardItem) -> Bool {
        return lhs.id == rhs.id &&
               lhs.x == rhs.x &&
               lhs.y == rhs.y &&
               lhs.rotation == rhs.rotation &&
               lhs.scale == rhs.scale &&
               lhs.zIndex == rhs.zIndex &&
               lhs.content == rhs.content
    }
}

struct Moodboard: Identifiable, Codable {
    var id: String
    var title: String
    var author: String
    var items: [BoardItem]
    var createdAt: Date
    var thumbnail: String? // Base64 or URL
}
