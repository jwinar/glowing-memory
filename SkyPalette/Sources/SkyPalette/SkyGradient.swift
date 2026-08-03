import Foundation

/// Everything a widget face needs to draw one moment of sky.
public struct SkyGradient: Hashable, Sendable {
    /// Zenith end of the gradient.
    public let top: SkyColor
    /// Horizon end.
    public let bottom: SkyColor

    /// Black-scrim opacity that guarantees legible white text over `top`.
    public let topScrim: Double
    /// The same, over `bottom`. Larger, because the horizon runs brighter.
    public let bottomScrim: Double

    /// Text colour, chosen per face from the sky it has to sit on.
    public let ink: SkyColor

    /// Colour the scrim overlay paints — black under white type, white under
    /// dark type.
    public let scrimColor: SkyColor

    /// How visible the sun disc should be, 0...1. Fades out as the sun drops
    /// below the horizon rather than hanging bright in a dark sky.
    public let sunOpacity: Double

    /// Sun altitude this gradient was built for.
    public let altitude: Double

    public init(top: SkyColor,
                bottom: SkyColor,
                topScrim: Double,
                bottomScrim: Double,
                ink: SkyColor,
                scrimColor: SkyColor,
                sunOpacity: Double,
                altitude: Double) {
        self.top = top
        self.bottom = bottom
        self.topScrim = topScrim
        self.bottomScrim = bottomScrim
        self.ink = ink
        self.scrimColor = scrimColor
        self.sunOpacity = sunOpacity
        self.altitude = altitude
    }

    /// The background the type actually sits on, once the scrim is applied.
    public var scrimmedTop: SkyColor {
        top.mixed(with: scrimColor, amount: topScrim)
    }

    public var scrimmedBottom: SkyColor {
        bottom.mixed(with: scrimColor, amount: bottomScrim)
    }

    /// Contrast of `ink` against the scrimmed background, worst of the two
    /// ends. Exposed so tests can assert the guarantee directly.
    public var worstContrastRatio: Double {
        min(ink.contrastRatio(to: scrimmedTop),
            ink.contrastRatio(to: scrimmedBottom))
    }

    /// True when the sky needed no help at all — which should be the common
    /// case, and is how the palette keeps its colour.
    public var isUnscrimmed: Bool {
        topScrim == 0 && bottomScrim == 0
    }
}
