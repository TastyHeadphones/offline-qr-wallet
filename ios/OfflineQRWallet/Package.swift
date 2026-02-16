// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "OfflineQRWallet",
    platforms: [
        .iOS(.v16),
        .macOS(.v12)
    ],
    products: [
        .library(
            name: "OfflineQRWallet",
            targets: ["OfflineQRWallet"]
        )
    ],
    targets: [
        .target(
            name: "OfflineQRWallet",
            path: "Sources",
            resources: [
                .process("../Resources")
            ]
        ),
        .testTarget(
            name: "OfflineQRWalletTests",
            dependencies: ["OfflineQRWallet"],
            path: "Tests"
        )
    ]
)
