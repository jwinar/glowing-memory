import Foundation

/// A named band of sun altitude. The widget's palette keys off this for its
/// broad colour family, then interpolates within the band using the raw
/// altitude — so consecutive timeline snapshots blend instead of jumping.
///
/// The boundaries are the standard twilight definitions rather than arbitrary
/// choices: -18° is the point at which the sky stops scattering any sunlight
/// at all, and -0.833° is geometric sunrise once refraction and the sun's
/// angular radius are accounted for.
public enum SunPhase: String, CaseIterable, Sendable {
    case night
    case astronomicalDawn
    case nauticalDawn
    case civilDawn
    case goldenHourMorning
    case day
    case goldenHourEvening
    case civilDusk
    case nauticalDusk
    case astronomicalDusk

    /// Altitudes in degrees at which the phase changes. Used to find exact
    /// transition instants rather than sampling for them.
    public static let altitudeThresholds: [Double] = [-18, -12, -6, -0.833, 6]

    public init(altitude: Double, isRising: Bool) {
        switch altitude {
        case ..<(-18):
            self = .night
        case ..<(-12):
            self = isRising ? .astronomicalDawn : .astronomicalDusk
        case ..<(-6):
            self = isRising ? .nauticalDawn : .nauticalDusk
        case ..<(-0.833):
            self = isRising ? .civilDawn : .civilDusk
        case ..<6:
            self = isRising ? .goldenHourMorning : .goldenHourEvening
        default:
            self = .day
        }
    }

    /// True for the phases where colour moves fast enough that the widget
    /// needs extra timeline entries to avoid visible stepping.
    public var isTwilight: Bool {
        switch self {
        case .night, .day:
            return false
        default:
            return true
        }
    }

    /// The counterpart phase on the other side of solar noon.
    public var mirrored: SunPhase {
        switch self {
        case .astronomicalDawn: return .astronomicalDusk
        case .nauticalDawn: return .nauticalDusk
        case .civilDawn: return .civilDusk
        case .goldenHourMorning: return .goldenHourEvening
        case .astronomicalDusk: return .astronomicalDawn
        case .nauticalDusk: return .nauticalDawn
        case .civilDusk: return .civilDawn
        case .goldenHourEvening: return .goldenHourMorning
        case .night, .day: return self
        }
    }

    /// Inclusive-lower, exclusive-upper altitude bounds for the phase.
    public var altitudeRange: ClosedRange<Double> {
        switch self {
        case .night: return -90...(-18)
        case .astronomicalDawn, .astronomicalDusk: return -18...(-12)
        case .nauticalDawn, .nauticalDusk: return -12...(-6)
        case .civilDawn, .civilDusk: return -6...(-0.833)
        case .goldenHourMorning, .goldenHourEvening: return -0.833...6
        case .day: return 6...90
        }
    }

    /// Where `altitude` sits inside this phase's band, 0 to 1. The palette
    /// uses this to interpolate between the band's colour stops.
    public func progress(at altitude: Double) -> Double {
        let range = altitudeRange
        let span = range.upperBound - range.lowerBound
        guard span > 0 else { return 0 }
        let fraction = (altitude - range.lowerBound) / span
        return min(1, max(0, fraction))
    }
}
