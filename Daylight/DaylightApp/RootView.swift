import SwiftUI
import CoreLocation
import SolarKit
import SkyPalette

/// The container app is deliberately thin: explain the location request, show
/// the sky live, and get out of the way. Everything the user came for happens
/// on the Home Screen.
struct RootView: View {
    @StateObject private var location = LocationProvider()
    @State private var now = Date()

    private let engine = PaletteEngine()
    private let tick = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            SkyBackground(gradient: snapshot.gradient)
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Spacer()

                VStack(spacing: 6) {
                    Text(snapshot.timeText)
                        .font(.system(size: 64, weight: .semibold, design: .rounded))
                    Text(snapshot.caption)
                        .font(.system(size: 17, weight: .medium))
                        .multilineTextAlignment(.center)
                }
                .foregroundStyle(.white)

                Spacer()

                if needsPermission {
                    permissionCard
                } else {
                    locationNote
                }
            }
            .padding(28)
        }
        .onReceive(tick) { now = $0 }
        .onAppear { location.refresh() }
    }

    private var snapshot: SkySnapshot {
        SkySnapshot(date: now,
                    coordinate: location.coordinate ?? .fallback,
                    timeZone: .current,
                    engine: engine)
    }

    private var needsPermission: Bool {
        location.authorization == .notDetermined
            || location.authorization == .denied
            || location.authorization == .restricted
    }

    private var permissionCard: some View {
        VStack(spacing: 14) {
            Text("Daylight needs your location")
                .font(.system(size: 18, weight: .semibold))

            Text("Only to work out where the sun is. Nothing leaves your device — "
                 + "there is no account and no server.")
                .font(.system(size: 14))
                .multilineTextAlignment(.center)
                .foregroundStyle(.white.opacity(0.85))

            if location.authorization == .notDetermined {
                Button("Continue") { location.requestAccess() }
                    .buttonStyle(.borderedProminent)
                    .tint(.white.opacity(0.22))
            } else {
                Text("Location is off. You can turn it on in Settings — until then "
                     + "the widget shows Greenwich.")
                    .font(.system(size: 13))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
        .foregroundStyle(.white)
        .padding(20)
        .background(.black.opacity(0.28), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var locationNote: some View {
        VStack(spacing: 4) {
            Text(sunLine)
            if location.coordinate == nil {
                Text("Showing Greenwich until a location arrives.")
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
        .font(.system(size: 13, weight: .medium))
        .foregroundStyle(.white.opacity(0.9))
        .multilineTextAlignment(.center)
    }

    private var sunLine: String {
        if let sunrise = snapshot.sunrise, let sunset = snapshot.sunset {
            return "Sunrise \(snapshot.timeText(sunrise))   ·   Sunset \(snapshot.timeText(sunset))"
        }
        return snapshot.caption
    }
}

#Preview {
    RootView()
}
