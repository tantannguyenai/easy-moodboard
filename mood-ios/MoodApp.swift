import SwiftUI

@main
struct MoodApp: App {
    var body: some Scene {
        WindowGroup {
            CanvasView()
                .preferredColorScheme(.light)
        }
    }
}
