import XCTest
@testable import SolarKit

/// Locks the low-level astronomy against independently computed values.
/// Expected numbers come from a reference implementation of the same NOAA
/// algorithm, cross-checked against published almanac figures.
final class SolarMathTests: XCTestCase {

    func testJulianDayAtUnixEpoch() {
        let epoch = Date(timeIntervalSince1970: 0)
        XCTAssertEqual(SolarMath.julianDay(epoch), 2_440_587.5, accuracy: 1e-9)
    }

    func testJulianDayAtKnownInstant() throws {
        let instant = try utc("2024-06-21T12:00:00Z")
        XCTAssertEqual(SolarMath.julianDay(instant), 2_460_483.0, accuracy: 1e-6)
        XCTAssertEqual(SolarMath.julianCentury(instant), 0.2447091034, accuracy: 1e-9)
    }

    func testDeclinationAtSolsticesAndEquinoxes() throws {
        // The obliquity of the ecliptic, give or take the day's offset from
        // the exact solstice instant.
        let cases: [(String, Double)] = [
            ("2024-06-21T12:00:00Z", 23.437238),
            ("2024-12-21T12:00:00Z", -23.439),
            ("2024-03-20T12:00:00Z", 0.147),
            ("2024-09-22T12:00:00Z", 0.010)
        ]
        for (iso, expected) in cases {
            let t = SolarMath.julianCentury(try utc(iso))
            XCTAssertEqual(SolarMath.declination(t), expected, accuracy: 1e-3,
                           "declination at \(iso)")
        }
    }

    func testEquationOfTimeMatchesKnownExtremes() throws {
        // The two annual extremes, plus a pair of mid-range dates. These are
        // the standard published values for the analemma.
        let cases: [(String, Double)] = [
            ("2024-02-11T12:00:00Z", -14.23),
            ("2024-11-03T12:00:00Z", 16.49),
            ("2024-05-14T12:00:00Z", 3.64),
            ("2024-07-26T12:00:00Z", -6.56)
        ]
        for (iso, expected) in cases {
            let t = SolarMath.julianCentury(try utc(iso))
            XCTAssertEqual(SolarMath.equationOfTime(t), expected, accuracy: 0.02,
                           "equation of time at \(iso)")
        }
    }

    func testNormalize360WrapsBothDirections() {
        XCTAssertEqual(SolarMath.normalize360(0), 0, accuracy: 1e-12)
        XCTAssertEqual(SolarMath.normalize360(360), 0, accuracy: 1e-12)
        XCTAssertEqual(SolarMath.normalize360(370), 10, accuracy: 1e-12)
        XCTAssertEqual(SolarMath.normalize360(-10), 350, accuracy: 1e-12)
        XCTAssertEqual(SolarMath.normalize360(-730), 350, accuracy: 1e-12)
    }

    func testRefractionLiftsSunNearHorizonAndVanishesOverhead() {
        // Refraction is what makes the sun visible while still geometrically
        // below the horizon — about a third of a degree at the horizon.
        XCTAssertGreaterThan(SolarMath.refractionCorrection(trueElevation: 0), 0.4)
        XCTAssertLessThan(SolarMath.refractionCorrection(trueElevation: 0), 0.6)

        // Negligible high in the sky, and defined as zero above 85 degrees.
        XCTAssertLessThan(SolarMath.refractionCorrection(trueElevation: 45), 0.02)
        XCTAssertEqual(SolarMath.refractionCorrection(trueElevation: 89), 0, accuracy: 1e-12)
    }

    func testHourAngleIsNilWhenSunNeverReachesZenith() {
        // Midsummer inside the Arctic Circle: the sun never sets, so there is
        // no hour angle at which it crosses the horizon.
        let hourAngle = SolarMath.hourAngle(zenith: 90.833,
                                            latitude: 69.6492,
                                            declination: 23.44)
        XCTAssertNil(hourAngle)
    }

    func testHourAngleIsZeroAtSolarNoon() {
        // Equator at equinox: sun directly overhead, hour angle 90 degrees
        // from the horizon crossing.
        let hourAngle = SolarMath.hourAngle(zenith: 90.833,
                                            latitude: 0,
                                            declination: 0)
        XCTAssertNotNil(hourAngle)
        XCTAssertEqual(hourAngle ?? 0, 90.833, accuracy: 0.01)
    }
}
