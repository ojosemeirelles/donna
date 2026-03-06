// swift-tools-version: 6.2
// Package manifest for the Donna macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "Donna",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "DonnaIPC", targets: ["DonnaIPC"]),
        .library(name: "DonnaDiscovery", targets: ["DonnaDiscovery"]),
        .executable(name: "Donna", targets: ["Donna"]),
        .executable(name: "donna-mac", targets: ["DonnaMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.2.2"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.1.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.8.0"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.8.1"),
        .package(url: "https://github.com/steipete/Peekaboo.git", branch: "main"),
        .package(path: "../shared/DonnaKit"),
        .package(path: "../../Swabble"),
    ],
    targets: [
        .target(
            name: "DonnaIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "DonnaDiscovery",
            dependencies: [
                .product(name: "DonnaKit", package: "DonnaKit"),
            ],
            path: "Sources/DonnaDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "Donna",
            dependencies: [
                "DonnaIPC",
                "DonnaDiscovery",
                .product(name: "DonnaKit", package: "DonnaKit"),
                .product(name: "DonnaChatUI", package: "DonnaKit"),
                .product(name: "DonnaProtocol", package: "DonnaKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/Donna.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "DonnaMacCLI",
            dependencies: [
                "DonnaDiscovery",
                .product(name: "DonnaKit", package: "DonnaKit"),
                .product(name: "DonnaProtocol", package: "DonnaKit"),
            ],
            path: "Sources/DonnaMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "DonnaIPCTests",
            dependencies: [
                "DonnaIPC",
                "Donna",
                "DonnaDiscovery",
                .product(name: "DonnaProtocol", package: "DonnaKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
