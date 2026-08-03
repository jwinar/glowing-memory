#if canImport(SwiftUI)
import SwiftUI

extension SkyColor {
    public var color: Color {
        Color(.sRGB, red: red, green: green, blue: blue, opacity: 1)
    }
}

/// The full-colour sky: gradient, sun, and the scrims that keep type legible.
///
/// The scrims are edge-weighted rather than flat. A flat overlay heavy enough
/// to clear AA at noon would mute the whole widget, which is the one thing the
/// app is for.
public struct SkyBackground: View {
    private let gradient: SkyGradient
    private let showsSun: Bool

    public init(gradient: SkyGradient, showsSun: Bool = true) {
        self.gradient = gradient
        self.showsSun = showsSun
    }

    public var body: some View {
        GeometryReader { proxy in
            ZStack {
                LinearGradient(
                    colors: [gradient.top.color, gradient.bottom.color],
                    startPoint: .top,
                    endPoint: .bottom
                )

                if showsSun, gradient.sunOpacity > 0 {
                    let diameter = proxy.size.width * 0.22
                    SunDisc(diameter: diameter, opacity: gradient.sunOpacity)
                        .position(
                            x: proxy.size.width * 0.76,
                            y: sunY(in: proxy.size.height)
                        )
                }

                // Scrims are held at full strength across the bands the type
                // occupies, then ramped out. A single ramp across the whole
                // face would clear AA too, but it desaturates the middle —
                // and at golden hour that middle is the entire product.
                LinearGradient(
                    stops: [
                        .init(color: scrim.opacity(gradient.topScrim), location: 0),
                        .init(color: scrim.opacity(gradient.topScrim), location: 0.28),
                        .init(color: scrim.opacity(0), location: 0.46)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )

                LinearGradient(
                    stops: [
                        .init(color: scrim.opacity(0), location: 0.58),
                        .init(color: scrim.opacity(gradient.bottomScrim), location: 0.76),
                        .init(color: scrim.opacity(gradient.bottomScrim), location: 1)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        }
    }

    private var scrim: Color {
        gradient.scrimColor.color
    }

    /// Sun height tracks altitude, clamped so it stays on the face.
    private func sunY(in height: Double) -> Double {
        let clamped = min(60, max(-6, gradient.altitude))
        let fraction = (clamped + 6) / 66
        return height * (0.78 - fraction * 0.58)
    }
}

public struct SunDisc: View {
    private let diameter: Double
    private let opacity: Double

    public init(diameter: Double, opacity: Double) {
        self.diameter = diameter
        self.opacity = opacity
    }

    public var body: some View {
        Circle()
            .fill(
                RadialGradient(
                    colors: [.white, .white.opacity(0.85), .white.opacity(0)],
                    center: .center,
                    startRadius: 0,
                    endRadius: diameter / 2
                )
            )
            .frame(width: diameter, height: diameter)
            .opacity(opacity)
    }
}
#endif
