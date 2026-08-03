import XCTest
@testable import SolarKit

final class SolarPositionTests: XCTestCase {

    /// Altitudes at fixed instants, from the validated reference
    /// implementation. Tolerance is 1e-4 degrees — under half an arcsecond —
    /// so any drift in the port shows up immediately.
    func testAltitudeMatchesReferenceValues() throws {
        let cases: [(iso: String, latitude: Double, longitude: Double, altitude: Double, label: String)] = [
            ("2024-06-21T12:00:00Z", 51.5074, -0.1278, 61.934515, "London midsummer noon"),
            ("2024-06-21T00:00:00Z", 51.5074, -0.1278, -15.030840, "London midsummer midnight"),
            ("2024-12-21T12:00:00Z", 51.5074, -0.1278, 15.112635, "London midwinter noon"),
            ("2024-03-20T16:00:00Z", 40.7128, -74.0060, 47.044967, "New York equinox noon"),
            ("2024-12-21T02:00:00Z", -33.8688, 151.2093, 79.469263, "Sydney midsummer"),
            ("2024-03-20T17:00:00Z", -0.1807, -78.4678, 84.710598, "Quito equinox noon"),
            ("2024-12-21T11:00:00Z", 69.6492, 18.9553, -3.036103, "Tromso polar night peak"),
            ("2024-06-21T23:00:00Z", 69.6492, 18.9553, 3.340267, "Tromso midnight sun")
        ]

        for testCase in cases {
            let coordinate = Coordinate(latitude: testCase.latitude,
                                        longitude: testCase.longitude)
            let position = SolarPosition(date: try utc(testCase.iso),
                                         coordinate: coordinate)
            XCTAssertEqual(position.altitude, testCase.altitude, accuracy: 1e-4,
                           testCase.label)
        }
    }

    func testSunIsRisingBeforeSolarNoonAndSettingAfter() throws {
        let london = Coordinate(latitude: 51.5074, longitude: -0.1278)

        let morning = SolarPosition(date: try utc("2024-06-21T08:00:00Z"),
                                    coordinate: london)
        XCTAssertTrue(morning.isRising)
        XCTAssertLessThan(morning.hourAngle, 0)

        let afternoon = SolarPosition(date: try utc("2024-06-21T16:00:00Z"),
                                      coordinate: london)
        XCTAssertFalse(afternoon.isRising)
        XCTAssertGreaterThan(afternoon.hourAngle, 0)
    }

    func testPhaseClassificationAcrossAKnownDay() throws {
        let london = Coordinate(latitude: 51.5074, longitude: -0.1278)

        // Verified transition times for 21 June 2024 (BST = UTC+1).
        let expectations: [(iso: String, phase: SunPhase)] = [
            ("2024-06-21T02:00:00Z", .nauticalDawn),        // 03:00 BST
            ("2024-06-21T03:00:00Z", .civilDawn),           // 04:00 BST
            ("2024-06-21T04:00:00Z", .goldenHourMorning),   // 05:00 BST
            ("2024-06-21T12:00:00Z", .day),                 // 13:00 BST
            ("2024-06-21T19:00:00Z", .day),                 // 20:00 BST, still 9.9 deg up
            ("2024-06-21T19:45:00Z", .goldenHourEvening),   // 20:45 BST
            ("2024-06-21T20:45:00Z", .civilDusk),           // 21:45 BST
            ("2024-06-21T21:30:00Z", .nauticalDusk)         // 22:30 BST
        ]

        for expectation in expectations {
            let position = SolarPosition(date: try utc(expectation.iso),
                                         coordinate: london)
            XCTAssertEqual(position.phase, expectation.phase,
                           "at \(expectation.iso) altitude was \(position.altitude)")
        }
    }

    func testTromsoStaysBelowHorizonAllDayDuringPolarNight() throws {
        let tromso = Coordinate(latitude: 69.6492, longitude: 18.9553)
        let midnight = try utc("2024-12-21T00:00:00Z")

        var peak = -90.0
        for minute in stride(from: 0, to: 1_440, by: 5) {
            let instant = midnight.addingTimeInterval(Double(minute) * 60)
            peak = max(peak, SolarPosition(date: instant, coordinate: tromso).altitude)
        }

        // Reference peak is -2.98 degrees: close, but never up.
        XCTAssertLessThan(peak, 0)
        XCTAssertEqual(peak, -2.9819, accuracy: 0.01)
    }

    func testTromsoStaysAboveHorizonAllDayDuringMidnightSun() throws {
        let tromso = Coordinate(latitude: 69.6492, longitude: 18.9553)
        let midnight = try utc("2024-06-21T00:00:00Z")

        var trough = 90.0
        for minute in stride(from: 0, to: 1_440, by: 5) {
            let instant = midnight.addingTimeInterval(Double(minute) * 60)
            trough = min(trough, SolarPosition(date: instant, coordinate: tromso).altitude)
        }

        XCTAssertGreaterThan(trough, 0)
        XCTAssertEqual(trough, 3.3089, accuracy: 0.01)
    }

    func testPhaseProgressSpansTheBand() {
        XCTAssertEqual(SunPhase.civilDawn.progress(at: -6), 0, accuracy: 1e-9)
        XCTAssertEqual(SunPhase.civilDawn.progress(at: -0.833), 1, accuracy: 1e-9)
        XCTAssertEqual(SunPhase.civilDawn.progress(at: -3.4165), 0.5, accuracy: 1e-6)

        // Out-of-band altitudes clamp rather than extrapolate, so the palette
        // can never be asked to interpolate past its end stops.
        XCTAssertEqual(SunPhase.civilDawn.progress(at: -40), 0, accuracy: 1e-9)
        XCTAssertEqual(SunPhase.civilDawn.progress(at: 40), 1, accuracy: 1e-9)
    }

    func testPhaseBoundariesPickTheRisingOrSettingVariant() {
        XCTAssertEqual(SunPhase(altitude: -20, isRising: true), .night)
        XCTAssertEqual(SunPhase(altitude: -20, isRising: false), .night)
        XCTAssertEqual(SunPhase(altitude: -15, isRising: true), .astronomicalDawn)
        XCTAssertEqual(SunPhase(altitude: -15, isRising: false), .astronomicalDusk)
        XCTAssertEqual(SunPhase(altitude: -9, isRising: true), .nauticalDawn)
        XCTAssertEqual(SunPhase(altitude: -3, isRising: false), .civilDusk)
        XCTAssertEqual(SunPhase(altitude: 0, isRising: true), .goldenHourMorning)
        XCTAssertEqual(SunPhase(altitude: 30, isRising: false), .day)
    }

    func testMirroredPhaseRoundTrips() {
        for phase in SunPhase.allCases {
            XCTAssertEqual(phase.mirrored.mirrored, phase, "\(phase) did not round-trip")
        }
    }
}
