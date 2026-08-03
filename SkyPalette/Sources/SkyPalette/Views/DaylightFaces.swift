#if canImport(SwiftUI)
import SwiftUI
import SolarKit

/// Home Screen small face: clock, sky, one line of type.
public struct DaylightSmallFace: View {
    private let snapshot: SkySnapshot

    public init(snapshot: SkySnapshot) {
        self.snapshot = snapshot
    }

    public var body: some View {
        ZStack(alignment: .topLeading) {
            SkyBackground(gradient: snapshot.gradient)

            VStack(alignment: .leading, spacing: 0) {
                Text(snapshot.timeText)
                    .font(.system(size: 30, weight: .semibold, design: .rounded))
                    .foregroundStyle(snapshot.gradient.ink.color)

                Spacer(minLength: 0)

                Text(snapshot.caption)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(snapshot.gradient.ink.color.opacity(0.92))
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
            }
            .padding(14)
        }
    }
}

/// Home Screen medium face: adds the whole day as a strip.
public struct DaylightMediumFace: View {
    private let snapshot: SkySnapshot
    private let dayColors: [SkyColor]

    public init(snapshot: SkySnapshot, dayColors: [SkyColor]) {
        self.snapshot = snapshot
        self.dayColors = dayColors
    }

    public var body: some View {
        ZStack(alignment: .topLeading) {
            SkyBackground(gradient: snapshot.gradient)

            VStack(alignment: .leading, spacing: 0) {
                Text(snapshot.timeText)
                    .font(.system(size: 38, weight: .semibold, design: .rounded))
                    .foregroundStyle(snapshot.gradient.ink.color)

                Text(snapshot.caption)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(snapshot.gradient.ink.color.opacity(0.92))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)

                Spacer(minLength: 8)

                DayStrip(colors: dayColors, progress: dayProgress)
                    .frame(height: 16)

                HStack {
                    Text(edgeLabel(snapshot.sunrise))
                    Spacer()
                    Text(edgeLabel(snapshot.sunset))
                }
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(snapshot.gradient.ink.color.opacity(0.85))
                .padding(.top, 4)
            }
            .padding(16)
        }
    }

    /// How far through the local day the render sits, 0...1.
    private var dayProgress: Double {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = snapshot.timeZone
        let start = calendar.startOfDay(for: snapshot.date)
        let end = calendar.date(byAdding: .day, value: 1, to: start) ?? start.addingTimeInterval(86_400)
        let span = end.timeIntervalSince(start)
        guard span > 0 else { return 0 }
        return min(1, max(0, snapshot.date.timeIntervalSince(start) / span))
    }

    private func edgeLabel(_ date: Date?) -> String {
        guard let date else { return "—" }
        return snapshot.timeText(date)
    }
}

/// The day's sky sampled across its width, with a marker at now.
public struct DayStrip: View {
    private let colors: [SkyColor]
    private let progress: Double

    public init(colors: [SkyColor], progress: Double) {
        self.colors = colors
        self.progress = progress
    }

    public var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                LinearGradient(
                    colors: colors.isEmpty ? [.black] : colors.map(\.color),
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))

                Capsule()
                    .fill(.white)
                    .frame(width: 2.5, height: proxy.size.height + 6)
                    .offset(x: proxy.size.width * progress - 1.25)
            }
        }
    }
}

/// Lock Screen face.
///
/// iOS renders accessory widgets through a vibrancy pass that discards hue, so
/// this path encodes the sky as luminance and layout instead of colour. It is
/// a different design, not the Home Screen face scaled down — that is the
/// mistake that makes these look like grey smears.
public struct DaylightAccessoryFace: View {
    private let snapshot: SkySnapshot

    public init(snapshot: SkySnapshot) {
        self.snapshot = snapshot
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(snapshot.timeText)
                .font(.system(size: 22, weight: .semibold, design: .rounded))

            Text(snapshot.caption)
                .font(.system(size: 11, weight: .medium))
                .lineLimit(1)
                .minimumScaleFactor(0.8)

            AltitudeBar(fraction: altitudeFraction)
                .frame(height: 4)
                .padding(.top, 2)
        }
    }

    /// Altitude mapped across the twilight-to-noon span, so the bar still
    /// moves during polar night rather than sitting empty.
    private var altitudeFraction: Double {
        min(1, max(0.02, (snapshot.altitude + 18) / 78))
    }
}

public struct AltitudeBar: View {
    private let fraction: Double

    public init(fraction: Double) {
        self.fraction = fraction
    }

    public var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(.white.opacity(0.25))
                Capsule()
                    .fill(.white)
                    .frame(width: max(2, proxy.size.width * fraction))
            }
        }
    }
}
#endif
