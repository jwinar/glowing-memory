import Foundation
import WidgetKit
import SolarKit
import SkyPalette

/// Builds the widget's timeline.
///
/// The strategy is the reason this app can exist without a backend: sun
/// position is computable offline, so a whole day of renders is scheduled in
/// one pass and the widget is reloaded once, just after local midnight.
/// WidgetKit's refresh allowance is spent on phase transitions, where the sky
/// is actually moving, rather than on identical midday snapshots.
struct DaylightProvider: TimelineProvider {

    private let engine = PaletteEngine()
    private let locationStore: LocationStore

    init(locationStore: LocationStore = .shared) {
        self.locationStore = locationStore
    }

    func placeholder(in context: Context) -> DaylightEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (DaylightEntry) -> Void) {
        // The gallery preview must not depend on a location fix.
        guard !context.isPreview else {
            completion(.placeholder)
            return
        }
        completion(currentEntry(for: context.family))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DaylightEntry>) -> Void) {
        let coordinate = locationStore.coordinate ?? .fallback
        let timeZone = TimeZone.current
        let now = Date()
        let includeDayColors = context.family == .systemMedium

        let day = SolarDay(reference: now, coordinate: coordinate, timeZone: timeZone)

        // Entries from now to end of day, plus one at the start of tomorrow so
        // there is always something to show if the reload is late.
        var dates = day.renderTimes().filter { $0 > now }
        dates.insert(now, at: 0)
        dates.append(day.endOfDay)

        let entries = dates.map {
            DaylightEntry.make(date: $0,
                               coordinate: coordinate,
                               timeZone: timeZone,
                               includeDayColors: includeDayColors,
                               engine: engine)
        }

        // Reloading just after midnight means the next day's timeline is built
        // against that day's sun, not extrapolated from this one.
        let reload = day.endOfDay.addingTimeInterval(60)
        completion(Timeline(entries: entries, policy: .after(reload)))
    }

    private func currentEntry(for family: WidgetFamily) -> DaylightEntry {
        DaylightEntry.make(
            date: Date(),
            coordinate: locationStore.coordinate ?? .fallback,
            timeZone: .current,
            includeDayColors: family == .systemMedium,
            engine: engine
        )
    }
}
