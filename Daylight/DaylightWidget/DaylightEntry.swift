import Foundation
import WidgetKit
import SolarKit
import SkyPalette

struct DaylightEntry: TimelineEntry {
    let date: Date
    let snapshot: SkySnapshot
    /// Only populated for the medium family, which is the only one that draws
    /// the strip. Sampling it costs 48 solar solves, so the small and
    /// accessory families skip it.
    let dayColors: [SkyColor]

    static func make(date: Date,
                     coordinate: Coordinate,
                     timeZone: TimeZone,
                     includeDayColors: Bool,
                     engine: PaletteEngine = PaletteEngine()) -> DaylightEntry {
        DaylightEntry(
            date: date,
            snapshot: SkySnapshot(date: date,
                                  coordinate: coordinate,
                                  timeZone: timeZone,
                                  engine: engine),
            dayColors: includeDayColors
                ? engine.dayColors(for: date, coordinate: coordinate, timeZone: timeZone)
                : []
        )
    }

    /// Shown in the widget gallery and while a real location is still
    /// resolving. A fixed golden-hour moment, because that is the app at its
    /// most recognisable.
    static var placeholder: DaylightEntry {
        var components = DateComponents()
        components.year = 2024
        components.month = 6
        components.day = 21
        components.hour = 20
        components.minute = 40

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/London") ?? .gmt

        let date = calendar.date(from: components) ?? Date()
        return make(date: date,
                    coordinate: .fallback,
                    timeZone: calendar.timeZone,
                    includeDayColors: true)
    }
}
