import Foundation
import SolarKit

/// Everything one widget render needs, resolved in a single pass.
///
/// This is the seam between SolarKit and the views: the faces never do
/// astronomy, and SolarKit never knows about colour.
public struct SkySnapshot: Hashable, Sendable {
    public let date: Date
    public let coordinate: Coordinate
    public let timeZone: TimeZone

    public let gradient: SkyGradient
    public let phase: SunPhase
    public let altitude: Double

    public let sunrise: Date?
    public let sunset: Date?
    /// The next sunrise, which after dark belongs to tomorrow.
    public let nextSunrise: Date?
    public let polarCondition: PolarCondition?

    public init(date: Date,
                coordinate: Coordinate,
                timeZone: TimeZone,
                engine: PaletteEngine = PaletteEngine()) {
        let position = SolarPosition(date: date, coordinate: coordinate)
        let day = SolarDay(reference: date, coordinate: coordinate, timeZone: timeZone)

        self.date = date
        self.coordinate = coordinate
        self.timeZone = timeZone
        self.gradient = engine.gradient(for: position)
        self.phase = position.phase
        self.altitude = position.altitude
        self.sunrise = day.sunrise
        self.sunset = day.sunset
        self.polarCondition = day.polarCondition

        if let sunrise = day.sunrise, sunrise > date {
            self.nextSunrise = sunrise
        } else {
            // Past today's sunrise, so look to tomorrow. Cheap enough to do
            // eagerly, and it keeps the caption honest after dark.
            let tomorrow = date.addingTimeInterval(86_400)
            self.nextSunrise = SolarDay(reference: tomorrow,
                                        coordinate: coordinate,
                                        timeZone: timeZone).sunrise
        }
    }

    public var isDaylight: Bool {
        altitude > -0.833
    }

    /// Time until sunset, when the sun is up and going to set.
    public var daylightRemaining: TimeInterval? {
        guard let sunset, sunset > date, isDaylight else { return nil }
        return sunset.timeIntervalSince(date)
    }
}

extension SkySnapshot {
    /// The single line of type on the widget face.
    ///
    /// Deliberately one string rather than a formatter chain — the faces are
    /// small enough that any second line costs more than it says.
    public var caption: String {
        switch polarCondition {
        case .polarDay:
            return "the sun does not set today"
        case .polarNight:
            return "the sun does not rise today"
        case nil:
            break
        }

        if let remaining = daylightRemaining {
            return "\(Self.durationText(remaining)) of light left"
        }
        if let nextSunrise {
            return "sunrise at \(timeText(nextSunrise))"
        }
        return phase.captionFallback
    }

    static func durationText(_ interval: TimeInterval) -> String {
        let totalMinutes = max(0, Int(interval.rounded() / 60))
        let hours = totalMinutes / 60
        let minutes = totalMinutes % 60
        return hours > 0 ? "\(hours)h \(minutes)m" : "\(minutes)m"
    }

    public func timeText(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeZone = timeZone
        formatter.locale = .autoupdatingCurrent
        formatter.setLocalizedDateFormatFromTemplate("jm")
        return formatter.string(from: date)
    }

    public var timeText: String {
        timeText(date)
    }
}

extension SunPhase {
    var captionFallback: String {
        switch self {
        case .night: return "night"
        case .astronomicalDawn, .nauticalDawn: return "before dawn"
        case .civilDawn: return "dawn"
        case .goldenHourMorning: return "golden hour"
        case .day: return "daylight"
        case .goldenHourEvening: return "golden hour"
        case .civilDusk: return "dusk"
        case .nauticalDusk, .astronomicalDusk: return "after dusk"
        }
    }
}
