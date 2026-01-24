import Foundation

class StorageService {
    static let shared = StorageService()
    private init() {}
    
    private let fileManager = FileManager.default
    
    private var documentsDirectory: URL {
        fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
    }
    
    private var boardsFileUrl: URL {
        documentsDirectory.appendingPathComponent("moodboards.json")
    }
    
    func saveBoards(_ boards: [Moodboard]) throws {
        let data = try JSONEncoder().encode(boards)
        try data.write(to: boardsFileUrl)
    }
    
    func loadBoards() -> [Moodboard] {
        guard fileManager.fileExists(atPath: boardsFileUrl.path) else { return [] }
        
        do {
            let data = try Data(contentsOf: boardsFileUrl)
            return try JSONDecoder().decode([Moodboard].self, from: data)
        } catch {
            print("Failed to load boards: \(error)")
            return []
        }
    }
}
