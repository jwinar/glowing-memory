import Foundation
import CoreLocation
import SolarKit
import WidgetKit

/// The last known coordinate, shared between the app and its widget.
///
/// Widget extensions get no reliable chance to run CoreLocation, so the app
/// resolves the fix and writes it to the shared container; the widget only
/// ever reads. A stale coordinate is fine — sunrise moves by seconds over the
/// distances a person covers in a day, and the fallback keeps a fresh install
/// showing a plausible sky rather than an empty state.
public final class LocationStore: @unchecked Sendable {

    /// Must match the App Group capability on both targets.
    public static let appGroup = "group.com.example.daylight"

    public static let shared = LocationStore()

    private let defaults: UserDefaults
    private let latitudeKey = "location.latitude"
    private let longitudeKey = "location.longitude"
    private let updatedKey = "location.updatedAt"

    public init(defaults: UserDefaults? = nil) {
        self.defaults = defaults ?? UserDefaults(suiteName: Self.appGroup) ?? .standard
    }

    public var coordinate: Coordinate? {
        guard defaults.object(forKey: latitudeKey) != nil,
              defaults.object(forKey: longitudeKey) != nil else { return nil }

        let candidate = Coordinate(latitude: defaults.double(forKey: latitudeKey),
                                   longitude: defaults.double(forKey: longitudeKey))
        return candidate.isValid ? candidate : nil
    }

    public var updatedAt: Date? {
        defaults.object(forKey: updatedKey) as? Date
    }

    public func store(_ coordinate: Coordinate) {
        guard coordinate.isValid else { return }
        defaults.set(coordinate.latitude, forKey: latitudeKey)
        defaults.set(coordinate.longitude, forKey: longitudeKey)
        defaults.set(Date(), forKey: updatedKey)
    }

    public func clear() {
        defaults.removeObject(forKey: latitudeKey)
        defaults.removeObject(forKey: longitudeKey)
        defaults.removeObject(forKey: updatedKey)
    }
}

/// Resolves the device location and hands it to `LocationStore`.
@MainActor
public final class LocationProvider: NSObject, ObservableObject {

    @Published public private(set) var coordinate: Coordinate?
    @Published public private(set) var authorization: CLAuthorizationStatus

    private let manager = CLLocationManager()
    private let store: LocationStore

    public init(store: LocationStore = .shared) {
        self.store = store
        self.coordinate = store.coordinate
        self.authorization = manager.authorizationStatus
        super.init()

        manager.delegate = self
        // Sun position varies by seconds over city distances, so the coarsest
        // accuracy is plenty — and it is the cheapest on battery.
        manager.desiredAccuracy = kCLLocationAccuracyReduced
    }

    public func requestAccess() {
        manager.requestWhenInUseAuthorization()
    }

    public func refresh() {
        guard authorization == .authorizedWhenInUse || authorization == .authorizedAlways else {
            return
        }
        manager.requestLocation()
    }
}

extension LocationProvider: CLLocationManagerDelegate {

    public nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            self.authorization = status
            if status == .authorizedWhenInUse || status == .authorizedAlways {
                manager.requestLocation()
            }
        }
    }

    public nonisolated func locationManager(_ manager: CLLocationManager,
                                            didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        let resolved = Coordinate(latitude: location.coordinate.latitude,
                                  longitude: location.coordinate.longitude)
        Task { @MainActor in
            guard resolved.isValid else { return }
            self.coordinate = resolved
            self.store.store(resolved)
            // The sky the widget is showing was computed for the old place.
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    public nonisolated func locationManager(_ manager: CLLocationManager,
                                            didFailWithError error: Error) {
        // Nothing to do: the stored coordinate, or the fallback, still renders
        // a valid sky. Failing loudly here would trade a small inaccuracy for
        // a broken widget.
    }
}
