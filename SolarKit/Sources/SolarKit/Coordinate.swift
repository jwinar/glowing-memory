import Foundation

/// A geographic position in degrees. Latitude is north-positive, longitude
/// east-positive, matching `CLLocationCoordinate2D` so the two map across
/// without a sign flip.
public struct Coordinate: Hashable, Sendable {
    public let latitude: Double
    public let longitude: Double

    public init(latitude: Double, longitude: Double) {
        self.latitude = latitude
        self.longitude = longitude
    }

    public var isValid: Bool {
        latitude >= -90 && latitude <= 90
            && longitude >= -180 && longitude <= 180
            && latitude.isFinite && longitude.isFinite
    }
}

extension Coordinate {
    /// Used when the widget has no location fix yet, so a first render shows a
    /// plausible sky instead of an empty state. Greenwich, fittingly.
    public static let fallback = Coordinate(latitude: 51.4779, longitude: -0.0015)
}
