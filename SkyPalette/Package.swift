// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SkyPalette",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "SkyPalette", targets: ["SkyPalette"])
    ],
    dependencies: [
        .package(path: "../SolarKit")
    ],
    targets: [
        .target(
            name: "SkyPalette",
            dependencies: [.product(name: "SolarKit", package: "SolarKit")]
        ),
        .testTarget(name: "SkyPaletteTests", dependencies: ["SkyPalette"])
    ]
)
