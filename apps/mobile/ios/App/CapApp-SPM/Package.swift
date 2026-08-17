// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v16)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.2"),
        .package(name: "BelongnetCapacitorPassToWallet", path: "../../../../../node_modules/.deno/@belongnet+capacitor-pass-to-wallet@8.0.4/node_modules/@belongnet/capacitor-pass-to-wallet"),
        .package(name: "CapacitorApp", path: "../../../../../node_modules/.deno/@capacitor+app@8.1.1/node_modules/@capacitor/app"),
        .package(name: "CapacitorBrowser", path: "../../../../../node_modules/.deno/@capacitor+browser@8.0.4/node_modules/@capacitor/browser"),
        .package(name: "CapacitorCamera", path: "../../../../../node_modules/.deno/@capacitor+camera@8.2.2/node_modules/@capacitor/camera"),
        .package(name: "CapacitorFilesystem", path: "../../../../../node_modules/.deno/@capacitor+filesystem@8.1.2/node_modules/@capacitor/filesystem"),
        .package(name: "CapacitorGeolocation", path: "../../../../../node_modules/.deno/@capacitor+geolocation@8.2.0/node_modules/@capacitor/geolocation"),
        .package(name: "CapacitorSplashScreen", path: "../../../../../node_modules/.deno/@capacitor+splash-screen@8.0.2/node_modules/@capacitor/splash-screen"),
        .package(name: "CapgoCapacitorNfc", path: "../../../../../node_modules/.deno/@capgo+capacitor-nfc@8.2.2/node_modules/@capgo/capacitor-nfc"),
        .package(name: "CapgoCapacitorUpdater", path: "../../../../../node_modules/.deno/@capgo+capacitor-updater@8.51.3/node_modules/@capgo/capacitor-updater"),
        .package(name: "PerfoodCapacitorCryptoApi", path: "../../../../../node_modules/.deno/@perfood+capacitor-crypto-api@8.0.0/node_modules/@perfood/capacitor-crypto-api")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "BelongnetCapacitorPassToWallet", package: "BelongnetCapacitorPassToWallet"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorBrowser", package: "CapacitorBrowser"),
                .product(name: "CapacitorCamera", package: "CapacitorCamera"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorGeolocation", package: "CapacitorGeolocation"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen"),
                .product(name: "CapgoCapacitorNfc", package: "CapgoCapacitorNfc"),
                .product(name: "CapgoCapacitorUpdater", package: "CapgoCapacitorUpdater"),
                .product(name: "PerfoodCapacitorCryptoApi", package: "PerfoodCapacitorCryptoApi")
            ]
        )
    ]
)
