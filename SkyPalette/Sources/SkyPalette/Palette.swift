import Foundation

/// One colour stop, keyed by sun altitude in degrees.
public struct SkyStop: Hashable, Sendable {
    /// Sun altitude this stop describes.
    public let altitude: Double
    /// Colour at the zenith end of the gradient.
    public let top: SkyColor
    /// Colour at the horizon end, where the sun's warmth pools.
    public let bottom: SkyColor

    public init(altitude: Double, top: SkyColor, bottom: SkyColor) {
        self.altitude = altitude
        self.top = top
        self.bottom = bottom
    }
}

/// A named set of sky colours.
///
/// Keying stops by altitude rather than by phase is what keeps consecutive
/// timeline renders from stepping: altitude is continuous, so interpolating
/// between stops yields a continuous gradient even though the widget only
/// samples it a dozen or so times a day.
public protocol Palette: Sendable {
    var name: String { get }
    /// Ordered by ascending altitude. Must span -90 to 90.
    var stops: [SkyStop] { get }
    /// Evenings run warmer than mornings at the same sun altitude.
    var eveningWarmth: SkyColor { get }
}

public struct DefaultPalette: Palette {
    public let name = "Default"
    public let eveningWarmth = SkyColor(hex: 0xFF8A4A)

    public init() {}

    public let stops: [SkyStop] = [
        SkyStop(altitude: -90, top: SkyColor(hex: 0x050714), bottom: SkyColor(hex: 0x0A0D22)),
        SkyStop(altitude: -18, top: SkyColor(hex: 0x0B1028), bottom: SkyColor(hex: 0x1A1E40)),
        SkyStop(altitude: -12, top: SkyColor(hex: 0x16183C), bottom: SkyColor(hex: 0x332C5E)),
        SkyStop(altitude: -6, top: SkyColor(hex: 0x252555), bottom: SkyColor(hex: 0x6E4266)),
        SkyStop(altitude: -3, top: SkyColor(hex: 0x3A3A6E), bottom: SkyColor(hex: 0xA85564)),
        SkyStop(altitude: -0.833, top: SkyColor(hex: 0x535582), bottom: SkyColor(hex: 0xD26E52)),
        SkyStop(altitude: 2, top: SkyColor(hex: 0x6E8FB4), bottom: SkyColor(hex: 0xE8924E)),
        SkyStop(altitude: 6, top: SkyColor(hex: 0x7FA8CE), bottom: SkyColor(hex: 0xF0BE82)),
        SkyStop(altitude: 14, top: SkyColor(hex: 0x6FA6D6), bottom: SkyColor(hex: 0xC5DBE8)),
        SkyStop(altitude: 35, top: SkyColor(hex: 0x4B93D2), bottom: SkyColor(hex: 0x9CC9E8)),
        SkyStop(altitude: 90, top: SkyColor(hex: 0x3A82CC), bottom: SkyColor(hex: 0x8FC0E4))
    ]
}
