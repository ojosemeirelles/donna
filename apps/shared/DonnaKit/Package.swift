// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "DonnaKit",
    platforms: [
        .iOS(.v18),
        .macOS(.v15),
    ],
    products: [
        .library(name: "DonnaProtocol", targets: ["DonnaProtocol"]),
        .library(name: "DonnaKit", targets: ["DonnaKit"]),
        .library(name: "DonnaChatUI", targets: ["DonnaChatUI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/steipete/ElevenLabsKit", exact: "0.1.0"),
        .package(url: "https://github.com/gonzalezreal/textual", exact: "0.3.1"),
    ],
    targets: [
        .target(
            name: "DonnaProtocol",
            path: "Sources/DonnaProtocol",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "DonnaKit",
            dependencies: [
                "DonnaProtocol",
                .product(name: "ElevenLabsKit", package: "ElevenLabsKit"),
            ],
            path: "Sources/DonnaKit",
            resources: [
                .process("Resources"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "DonnaChatUI",
            dependencies: [
                "DonnaKit",
                .product(
                    name: "Textual",
                    package: "textual",
                    condition: .when(platforms: [.macOS, .iOS])),
            ],
            path: "Sources/DonnaChatUI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "DonnaKitTests",
            dependencies: ["DonnaKit", "DonnaChatUI"],
            path: "Tests/DonnaKitTests",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
