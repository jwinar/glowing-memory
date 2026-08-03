import Foundation

/// When a location's sun never crosses the horizon on a given day.
public enum PolarCondition: String, Sendable {
    case polarDay
    case polarNight
}

/// The start of a phase. The next transition's `start` is this one's end.
public struct PhaseTransition: Hashable, Sendable {
    public let start: Date
    public let phase: SunPhase

    public init(start: Date, phase: SunPhase) {
        self.start = start
        self.phase = phase
    }
}

/// One local day of sun positions for a coordinate.
///
/// "Local day" means the calendar day in `timeZone` containing `reference`.
/// That distinction matters east of about UTC+8 and west of UTC-8, where a
/// local day's sunrise and sunset land on different UTC dates — computing
/// against the UTC day there yields events off by a full day.
public struct SolarDay: Sendable {
    public let reference: Date
    public let coordinate: Coordinate
    public let timeZone: TimeZone

    private let calendar: Calendar

    public init(reference: Date, coordinate: Coordinate, timeZone: TimeZone) {
        self.reference = reference
        self.coordinate = coordinate
        self.timeZone = timeZone

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        self.calendar = calendar
    }

    // MARK: - Day bounds

    public var startOfDay: Date {
        calendar.startOfDay(for: reference)
    }

    public var endOfDay: Date {
        // Adding a day handles DST transitions, where a local day is 23 or 25
        // hours long. Adding 86,400 seconds would not.
        calendar.date(byAdding: .day, value: 1, to: startOfDay) ?? startOfDay.addingTimeInterval(86_400)
    }

    private func containsInLocalDay(_ date: Date) -> Bool {
        date >= startOfDay && date < endOfDay
    }

    // MARK: - Events

    /// The instants at which the sun crosses `altitude` during this local day.
    /// Either element is `nil` when that crossing does not happen today.
    public func crossings(altitude: Double) -> (rising: Date?, setting: Date?) {
        var rising: Date?
        var setting: Date?

        // The crossing bracketing a local day can belong to the previous or
        // next UTC day, so all three are checked and filtered by local date.
        for offset in -1...1 {
            guard let anchor = calendar.date(byAdding: .day, value: offset, to: startOfDay) else {
                continue
            }
            let events = Self.events(utcDayContaining: anchor,
                                     altitude: altitude,
                                     coordinate: coordinate)
            if let candidate = events.rising, containsInLocalDay(candidate) {
                rising = candidate
            }
            if let candidate = events.setting, containsInLocalDay(candidate) {
                setting = candidate
            }
        }
        return (rising, setting)
    }

    public var sunrise: Date? {
        crossings(altitude: -0.833).rising
    }

    public var sunset: Date? {
        crossings(altitude: -0.833).setting
    }

    public var solarNoon: Date {
        Self.solarNoon(utcDayContaining: noonAnchor, coordinate: coordinate)
    }

    /// Local noon, used as the anchor when picking which UTC day to compute
    /// against.
    private var noonAnchor: Date {
        calendar.date(byAdding: .hour, value: 12, to: startOfDay) ?? reference
    }

    public var daylightDuration: TimeInterval? {
        guard let sunrise, let sunset, sunset > sunrise else { return nil }
        return sunset.timeIntervalSince(sunrise)
    }

    /// Set when the sun neither rises nor sets today.
    public var polarCondition: PolarCondition? {
        let events = crossings(altitude: -0.833)
        guard events.rising == nil, events.setting == nil else { return nil }
        let noonAltitude = SolarPosition(date: solarNoon, coordinate: coordinate).altitude
        return noonAltitude > -0.833 ? .polarDay : .polarNight
    }

    // MARK: - Phases

    /// Every phase the day passes through, in order, starting at local
    /// midnight. Polar day and polar night collapse to a single entry.
    public func transitions() -> [PhaseTransition] {
        var boundaries: Set<Date> = [startOfDay]

        for threshold in SunPhase.altitudeThresholds {
            let events = crossings(altitude: threshold)
            if let rising = events.rising { boundaries.insert(rising) }
            if let setting = events.setting { boundaries.insert(setting) }
        }

        // Dawn flips to dusk at solar noon and dusk back to dawn at solar
        // midnight, neither of which is an altitude crossing. Without these,
        // a day with no full darkness — a British June, say — labels its
        // pre-midnight sliver as dawn.
        boundaries.insert(solarNoon)
        for offset in [-43_200.0, 43_200.0] {
            boundaries.insert(solarNoon.addingTimeInterval(offset))
        }

        let ordered = boundaries
            .filter { $0 >= startOfDay && $0 < endOfDay }
            .sorted()

        var result: [PhaseTransition] = []
        for (index, start) in ordered.enumerated() {
            let end = index + 1 < ordered.count ? ordered[index + 1] : endOfDay
            guard end > start else { continue }

            // Classify by the midpoint: the boundary instant itself sits
            // exactly on a threshold, where rounding could fall either way.
            let midpoint = start.addingTimeInterval(end.timeIntervalSince(start) / 2)
            let phase = SolarPosition(date: midpoint, coordinate: coordinate).phase

            if result.last?.phase == phase { continue }
            result.append(PhaseTransition(start: start, phase: phase))
        }
        return result
    }

    /// The phase in effect at `date`.
    public func phase(at date: Date) -> SunPhase {
        SolarPosition(date: date, coordinate: coordinate).phase
    }

    // MARK: - Widget timeline

    /// Instants the widget should re-render at.
    ///
    /// Entries land on every phase boundary, plus subdivisions inside the
    /// fast-moving twilight phases. Day and night get one entry each because
    /// nothing visible changes across them — which is what keeps a full day
    /// inside WidgetKit's refresh budget instead of burning it on midday
    /// snapshots that all look identical.
    public func renderTimes(maxEntries: Int = 16) -> [Date] {
        guard maxEntries > 0 else { return [] }

        let phases = transitions()
        guard !phases.isEmpty else { return [startOfDay] }

        var times: [Date] = []
        for (index, transition) in phases.enumerated() {
            let end = index + 1 < phases.count ? phases[index + 1].start : endOfDay
            times.append(transition.start)

            let subdivisions = transition.phase.isTwilight ? 3 : 1
            guard subdivisions > 1 else { continue }

            let span = end.timeIntervalSince(transition.start)
            guard span > 0 else { continue }

            for step in 1..<subdivisions {
                let fraction = Double(step) / Double(subdivisions)
                times.append(transition.start.addingTimeInterval(span * fraction))
            }
        }

        times.sort()

        // A phase can be short enough that a subdivision lands exactly on the
        // next boundary. Collapse those before thinning, so callers always get
        // strictly increasing instants — WidgetKit drops out-of-order entries.
        var unique: [Date] = []
        unique.reserveCapacity(times.count)
        for time in times where unique.last != time {
            unique.append(time)
        }

        return Self.thin(unique, to: maxEntries)
    }

    /// Drops evenly spaced entries until the list fits, always keeping the
    /// first so the widget has something to render immediately.
    private static func thin(_ times: [Date], to limit: Int) -> [Date] {
        guard times.count > limit else { return times }
        guard limit > 1 else { return Array(times.prefix(1)) }

        var kept: [Date] = []
        kept.reserveCapacity(limit)
        for index in 0..<limit {
            let source = Int((Double(index) / Double(limit - 1)) * Double(times.count - 1))
            let candidate = times[source]
            if kept.last != candidate { kept.append(candidate) }
        }
        return kept
    }

    // MARK: - Core solve

    /// Solar noon for the UTC day containing `instant`.
    ///
    /// Declination and the equation of time are evaluated at UTC noon of that
    /// day rather than iterating toward the true solar noon. Both change
    /// slowly enough that the simplification costs well under a minute, which
    /// the validation suite confirms against published times — and it keeps
    /// the solve a single pass with no convergence loop.
    private static func solarNoon(utcDayContaining instant: Date, coordinate: Coordinate) -> Date {
        let dayIndex = (instant.timeIntervalSince1970 / 86_400).rounded(.down)
        let utcMidnight = Date(timeIntervalSince1970: dayIndex * 86_400)
        let utcNoon = utcMidnight.addingTimeInterval(43_200)

        let eqTime = SolarMath.equationOfTime(SolarMath.julianCentury(utcNoon))
        let minutes = 720 - 4 * coordinate.longitude - eqTime
        return utcMidnight.addingTimeInterval(minutes * 60)
    }

    private static func events(utcDayContaining instant: Date,
                               altitude: Double,
                               coordinate: Coordinate) -> (rising: Date?, setting: Date?) {
        let dayIndex = (instant.timeIntervalSince1970 / 86_400).rounded(.down)
        let utcMidnight = Date(timeIntervalSince1970: dayIndex * 86_400)
        let utcNoon = utcMidnight.addingTimeInterval(43_200)

        let t = SolarMath.julianCentury(utcNoon)
        let declination = SolarMath.declination(t)
        let noon = solarNoon(utcDayContaining: instant, coordinate: coordinate)

        guard let hourAngle = SolarMath.hourAngle(zenith: 90 - altitude,
                                                  latitude: coordinate.latitude,
                                                  declination: declination) else {
            return (nil, nil)
        }

        let offset = 4 * hourAngle * 60
        return (noon.addingTimeInterval(-offset), noon.addingTimeInterval(offset))
    }
}
