// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SolarKit",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "SolarKit", targets: ["SolarKit"])
    ],
    targets: [
        .target(name: "SolarKit"),
        .testTarget(name: "SolarKitTests", dependencies: ["SolarKit"])
    ]
)
