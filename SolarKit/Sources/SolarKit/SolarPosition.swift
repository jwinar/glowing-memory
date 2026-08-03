import Foundation

/// Where the sun is, for one instant and one place.
public struct SolarPosition: Hashable, Sendable {
    /// Apparent elevation above the horizon in degrees, refraction included.
    /// Negative below the horizon.
    public let altitude: Double

    /// Hour angle in degrees: 0 at solar noon, negative before it.
    public let hourAngle: Double

    public let date: Date
    public let coordinate: Coordinate

    public init(date: Date, coordinate: Coordinate) {
        let result = SolarMath.elevation(date: date, coordinate: coordinate)
        self.altitude = result.altitude
        self.hourAngle = result.hourAngle
        self.date = date
        self.coordinate = coordinate
    }

    /// True while the sun is climbing toward solar noon.
    public var isRising: Bool { hourAngle < 0 }

    public var phase: SunPhase {
        SunPhase(altitude: altitude, isRising: isRising)
    }

    /// Position within the current phase's altitude band, 0 to 1.
    public var phaseProgress: Double {
        phase.progress(at: altitude)
    }

    public var isAboveHorizon: Bool { altitude > -0.833 }
}
