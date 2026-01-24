# How to Import "Mood" to Xcode

Follow these steps to get your SwiftUI app running in Xcode.

## 1. Create a New Xcode Project
1.  Open **Xcode**.
2.  Select **Create New Project...**.
3.  Choose **iOS** > **App**.
4.  Click **Next**.
5.  **Product Name**: `Mood`
6.  **Interface**: `SwiftUI`
7.  **Language**: `Swift`
8.  **Storage**: `None` (we implemented our own JSON storage).
9.  Click **Next** and save it to a location of your choice (e.g., specific folder on your Desktop).

## 2. Copy Source Files
1.  Open **Finder** and locate the `mood-ios` folder we just created in your workspace:
    `/Users/tantannguyen/organic-board/mood-ios`
2.  Open another Finder window for your new Xcode project folder (where `Mood.xcodeproj` is).
3.  There should be a subfolder named `Mood` (containing `MoodApp.swift`, `ContentView.swift`, etc.).
4.  **Delete** the default `ContentView.swift` and `MoodApp.swift` in your Xcode project folder.
5.  **Copy** the entire contents of `mood-ios` (folders `Models`, `ViewModels`, `Views`, `Services`, `Resources`, and file `MoodApp.swift`) into that `Mood` subfolder in your Xcode project.

## 3. Add Files to Xcode
1.  Go back to **Xcode**.
2.  You won't see the new files yet. Right-click on the yellow folder `Mood` in the Project Navigator (left sidebar).
3.  Select **Add Files to "Mood"...**.
4.  Select the folders you just copied (`Models`, `ViewModels`, `Views`, `Services`, `Resources`) and `MoodApp.swift`.
5.  **Important**: Make sure **"Create groups"** is selected (not "Create folder references").
6.  Ensure your app target (`Mood`) is checked in "Add to targets".
7.  Click **Add**.

## 4. Configure Metal Shader
1.  The file `Resources/Fluid.metal` should now be in your project.
2.  Xcode usually processes `.metal` files automatically.
3.  To be sure, click on your Project (blue icon at the top left) -> Select your Target -> **Build Phases**.
4.  Open **Compile Sources**. Ensure `Fluid.metal` is NOT in this list (it shouldn't be).
5.  Open **Copy Bundle Resources**. Ensure `Fluid.metal` IS in this list. (Actually, for Metal *libraries*, they are usually compiled into a `default.metallib`. If you simply added it to the project, Xcode builds it automatically. You don't typically need to add it to generic resources unless you are loading it as raw text). 
    * *Correction*: Xcode compiles `.metal` files into a library. Just ensuring it is in the project navigator is usually enough.

## 5. Build and Run
1.  Select a Simulator (e.g., iPhone 15 Pro).
2.  Press **Cmd + R** to run.
3.  You should see the "Mood" app launch with the Canvas and Dock.

## Troubleshooting
- **"Redeclaration of MoodApp"**: Make sure you deleted the original `MoodApp.swift` created by Xcode.
- **Metal Errors**: If the shader doesn't load, verify the `FluidShaderView.swift` code is creating the device correctly. The simulator supports Metal, but performance is best on a real device.
