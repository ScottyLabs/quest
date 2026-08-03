// swift-tools-version: 6.0
import PackageDescription

// Wraps the CLI-managed CapApp-SPM so the capacitor-swift-pm pin stays in one
// place. Separate package because an @main in CapApp-SPM would clash with the
// Xcode target's @UIApplicationMain, and cap sync rewrites its manifest.
let package = Package(
    name: "App",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "App",
            targets: ["App"]
        )
    ],
    dependencies: [
        .package(path: "../App/CapApp-SPM")
    ],
    targets: [
        .target(
            name: "App",
            dependencies: [
                .product(name: "CapApp-SPM", package: "CapApp-SPM")
            ]
        )
    ]
)
