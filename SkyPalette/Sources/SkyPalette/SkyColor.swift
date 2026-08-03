import Foundation

/// An sRGB colour, deliberately independent of SwiftUI so the contrast rules
/// can be unit tested on any platform. Components are 0...1.
public struct SkyColor: Hashable, Sendable {
    public let red: Double
    public let green: Double
    public let blue: Double

    public init(red: Double, green: Double, blue: Double) {
        self.red = min(1, max(0, red))
        self.green = min(1, max(0, green))
        self.blue = min(1, max(0, blue))
    }

    /// `SkyColor(hex: 0xF0BE82)`
    public init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }

    public static let white = SkyColor(red: 1, green: 1, blue: 1)
    public static let black = SkyColor(red: 0, green: 0, blue: 0)

    /// The dark ink. A warm near-black rather than pure black, which reads as
    /// a hole punched in the sky.
    public static let ink = SkyColor(hex: 0x1A1816)

    // MARK: - Blending

    public func mixed(with other: SkyColor, amount: Double) -> SkyColor {
        let t = min(1, max(0, amount))
        return SkyColor(
            red: red + (other.red - red) * t,
            green: green + (other.green - green) * t,
            blue: blue + (other.blue - blue) * t
        )
    }

    /// The result of compositing black at `opacity` over this colour, which is
    /// what a scrim does.
    public func darkened(by opacity: Double) -> SkyColor {
        let factor = 1 - min(1, max(0, opacity))
        return SkyColor(red: red * factor, green: green * factor, blue: blue * factor)
    }

    // MARK: - Contrast

    private static func linearize(_ component: Double) -> Double {
        component <= 0.04045
            ? component / 12.92
            : pow((component + 0.055) / 1.055, 2.4)
    }

    /// WCAG relative luminance.
    public var relativeLuminance: Double {
        0.2126 * Self.linearize(red)
            + 0.7152 * Self.linearize(green)
            + 0.0722 * Self.linearize(blue)
    }

    /// WCAG contrast ratio, 1...21.
    public func contrastRatio(to other: SkyColor) -> Double {
        let a = relativeLuminance
        let b = other.relativeLuminance
        return (max(a, b) + 0.05) / (min(a, b) + 0.05)
    }
}

// MARK: - Scrim

public enum Contrast {
    /// WCAG AA for body text.
    public static let aa: Double = 4.5

    /// Never fully black out a bright sky — the colour is the product.
    public static let scrimCeiling: Double = 0.55

    /// The highest background luminance that still clears `ratio` against
    /// white text.
    public static func maximumBackgroundLuminance(forRatio ratio: Double) -> Double {
        (1 + 0.05) / ratio - 0.05
    }

    /// The ink that holds up best across both ends of a gradient.
    ///
    /// Chosen for the *worse* of the two ends, and applied to the whole face.
    /// Picking per-end would score better on paper and look broken in
    /// practice — a white clock above dark body copy reads as a bug.
    public static func preferredInk(top: SkyColor,
                                    bottom: SkyColor,
                                    candidates: [SkyColor] = [.white, .ink]) -> SkyColor {
        candidates.max { first, second in
            min(first.contrastRatio(to: top), first.contrastRatio(to: bottom))
                < min(second.contrastRatio(to: top), second.contrastRatio(to: bottom))
        } ?? .white
    }

    /// Smallest scrim opacity that lifts `ink` over `background` to `ratio`,
    /// pushing the background away from the ink — darker under white type,
    /// lighter under dark type.
    ///
    /// A single fixed ink cannot avoid this. The gradient sweeps through a
    /// mid-luminance band where neither white nor dark clears AA, bottoming
    /// out near 2.8:1. Choosing the ink per face first shrinks the problem to
    /// about 2% of skies, and those need roughly 0.19 opacity rather than the
    /// 0.45 a fixed-white rule demands — which is the difference between a
    /// golden hour that glows and one that reads as grey.
    public static func scrimOpacity(over background: SkyColor,
                                    ink: SkyColor,
                                    ratio: Double = aa,
                                    ceiling: Double = scrimCeiling) -> Double {
        guard ink.contrastRatio(to: background) < ratio else { return 0 }

        let away: SkyColor = ink.relativeLuminance > 0.5 ? .black : .white

        // Contrast is monotonic as the background moves away from the ink, so
        // bisection converges cleanly. A closed form is blocked by the sRGB
        // transfer curve's knee.
        var low = 0.0
        var high = ceiling
        for _ in 0..<30 {
            let mid = (low + high) / 2
            if ink.contrastRatio(to: background.mixed(with: away, amount: mid)) < ratio {
                low = mid
            } else {
                high = mid
            }
        }
        return high
    }

    /// The colour a scrim overlay paints for a given ink.
    public static func scrimColor(for ink: SkyColor) -> SkyColor {
        ink.relativeLuminance > 0.5 ? .black : .white
    }
}
