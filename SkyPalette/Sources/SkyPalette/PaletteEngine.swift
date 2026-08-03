import Foundation
import SolarKit

/// Turns a sun position into a drawable sky.
public struct PaletteEngine: Sendable {
    public let palette: any Palette

    public init(palette: any Palette = DefaultPalette()) {
        self.palette = palette
    }

    public func gradient(for position: SolarPosition) -> SkyGradient {
        gradient(altitude: position.altitude, isRising: position.isRising)
    }

    public func gradient(altitude: Double, isRising: Bool) -> SkyGradient {
        var (top, bottom) = interpolate(altitude: altitude)

        // Evenings run warmer than mornings at the same altitude. The band is
        // limited to the range where the sky is actually taking colour, so it
        // does not tint deep night or high noon.
        if !isRising, altitude > -8, altitude < 12 {
            top = top.mixed(with: palette.eveningWarmth, amount: 0.10)
            bottom = bottom.mixed(with: palette.eveningWarmth, amount: 0.18)
        }

        // Pick the ink first, then scrim only where that ink still falls
        // short. Ordering it this way is what keeps the scrim off roughly 98%
        // of skies.
        let ink = Contrast.preferredInk(top: top, bottom: bottom)

        return SkyGradient(
            top: top,
            bottom: bottom,
            topScrim: Contrast.scrimOpacity(over: top, ink: ink),
            bottomScrim: Contrast.scrimOpacity(over: bottom, ink: ink),
            ink: ink,
            scrimColor: Contrast.scrimColor(for: ink),
            sunOpacity: Self.sunOpacity(altitude: altitude),
            altitude: altitude
        )
    }

    /// The day's sky sampled evenly across the local day, for the medium
    /// face's strip. `samples` is the strip's colour resolution, not a refresh
    /// cost — this runs once per render.
    public func dayColors(for date: Date,
                          coordinate: Coordinate,
                          timeZone: TimeZone,
                          samples: Int = 48) -> [SkyColor] {
        guard samples > 1 else { return [] }

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let start = calendar.startOfDay(for: date)
        let end = calendar.date(byAdding: .day, value: 1, to: start)
            ?? start.addingTimeInterval(86_400)
        let span = end.timeIntervalSince(start)

        return (0..<samples).map { index in
            let fraction = Double(index) / Double(samples - 1)
            let instant = start.addingTimeInterval(span * fraction)
            let position = SolarPosition(date: instant, coordinate: coordinate)
            return gradient(for: position).bottom
        }
    }

    /// The sun disc fades out through civil twilight instead of sitting bright
    /// below the horizon.
    static func sunOpacity(altitude: Double) -> Double {
        switch altitude {
        case ...(-6):
            return 0
        case (-0.833)...:
            return 1
        default:
            return (altitude + 6) / (6 - 0.833)
        }
    }

    private func interpolate(altitude: Double) -> (top: SkyColor, bottom: SkyColor) {
        let stops = palette.stops
        guard let first = stops.first, let last = stops.last else {
            return (.black, .black)
        }
        if altitude <= first.altitude { return (first.top, first.bottom) }
        if altitude >= last.altitude { return (last.top, last.bottom) }

        for index in 0..<(stops.count - 1) {
            let low = stops[index]
            let high = stops[index + 1]
            guard altitude >= low.altitude, altitude <= high.altitude else { continue }

            let span = high.altitude - low.altitude
            guard span > 0 else { return (low.top, low.bottom) }

            let t = (altitude - low.altitude) / span
            return (low.top.mixed(with: high.top, amount: t),
                    low.bottom.mixed(with: high.bottom, amount: t))
        }
        return (last.top, last.bottom)
    }
}
