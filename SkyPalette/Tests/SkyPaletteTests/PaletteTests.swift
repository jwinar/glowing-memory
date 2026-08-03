import XCTest
import SolarKit
@testable import SkyPalette

final class PaletteTests: XCTestCase {

    private let engine = PaletteEngine()

    // MARK: - Palette shape

    func testDefaultPaletteStopsAreOrderedAndSpanTheSky() {
        let stops = DefaultPalette().stops
        XCTAssertEqual(stops.first?.altitude, -90)
        XCTAssertEqual(stops.last?.altitude, 90)

        for index in 1..<stops.count {
            XCTAssertGreaterThan(stops[index].altitude, stops[index - 1].altitude,
                                 "stops must ascend")
        }
    }

    func testAltitudesBeyondTheStopsClampRatherThanExtrapolate() {
        let below = engine.gradient(altitude: -200, isRising: true)
        let bottom = engine.gradient(altitude: -90, isRising: true)
        XCTAssertEqual(below.top, bottom.top)

        let above = engine.gradient(altitude: 200, isRising: false)
        let top = engine.gradient(altitude: 90, isRising: false)
        XCTAssertEqual(above.top, top.top)
    }

    /// Consecutive timeline renders must not visibly step. The palette is
    /// keyed by altitude precisely so this holds even though the widget only
    /// samples a dozen or so times a day.
    func testGradientIsContinuousAcrossAltitude() {
        var previous = engine.gradient(altitude: -90, isRising: true)
        var worstDelta = 0.0
        var worstAt = 0.0

        for step in stride(from: -89.9, through: 90.0, by: 0.1) {
            let current = engine.gradient(altitude: step, isRising: true)
            let delta = [
                abs(current.top.red - previous.top.red),
                abs(current.top.green - previous.top.green),
                abs(current.top.blue - previous.top.blue),
                abs(current.bottom.red - previous.bottom.red),
                abs(current.bottom.green - previous.bottom.green),
                abs(current.bottom.blue - previous.bottom.blue)
            ].max() ?? 0
            if delta > worstDelta {
                worstDelta = delta
                worstAt = step
            }
            previous = current
        }

        // A tenth of a degree should never move a channel by more than a
        // couple of 8-bit steps.
        XCTAssertLessThan(worstDelta, 0.01, "biggest jump was at altitude \(worstAt)")
    }

    func testEveningRunsWarmerThanMorningAtTheSameAltitude() {
        let morning = engine.gradient(altitude: 2, isRising: true)
        let evening = engine.gradient(altitude: 2, isRising: false)

        XCTAssertGreaterThan(evening.bottom.red, morning.bottom.red)
        XCTAssertLessThan(evening.bottom.blue, morning.bottom.blue)
    }

    func testWarmthDoesNotReachDeepNightOrHighNoon() {
        XCTAssertEqual(engine.gradient(altitude: -40, isRising: true).bottom,
                       engine.gradient(altitude: -40, isRising: false).bottom)
        XCTAssertEqual(engine.gradient(altitude: 60, isRising: true).bottom,
                       engine.gradient(altitude: 60, isRising: false).bottom)
    }

    // MARK: - Sun disc

    /// The mock showed the sun hanging bright in a dark sky after sunset.
    func testSunFadesOutBelowTheHorizon() {
        XCTAssertEqual(PaletteEngine.sunOpacity(altitude: 30), 1, accuracy: 1e-9)
        XCTAssertEqual(PaletteEngine.sunOpacity(altitude: -0.833), 1, accuracy: 1e-9)
        XCTAssertEqual(PaletteEngine.sunOpacity(altitude: -6), 0, accuracy: 1e-9)
        XCTAssertEqual(PaletteEngine.sunOpacity(altitude: -20), 0, accuracy: 1e-9)

        let midway = PaletteEngine.sunOpacity(altitude: -3.4)
        XCTAssertGreaterThan(midway, 0)
        XCTAssertLessThan(midway, 1)
    }

    func testSunOpacityIsMonotonic() {
        var previous = -1.0
        for altitude in stride(from: -10.0, through: 10.0, by: 0.1) {
            let opacity = PaletteEngine.sunOpacity(altitude: altitude)
            XCTAssertGreaterThanOrEqual(opacity, previous, "dipped at \(altitude)")
            previous = opacity
        }
    }

    // MARK: - Day strip

    func testDayColorsSpanTheLocalDay() throws {
        let zone = try timeZone("Europe/London")
        let colors = engine.dayColors(
            for: try localNoon(2024, 6, 21, in: zone),
            coordinate: Coordinate(latitude: 51.5074, longitude: -0.1278),
            timeZone: zone,
            samples: 48
        )

        XCTAssertEqual(colors.count, 48)
        // Midday should be markedly lighter than either end of the day.
        let midday = colors[24].relativeLuminance
        XCTAssertGreaterThan(midday, colors[0].relativeLuminance)
        XCTAssertGreaterThan(midday, colors[47].relativeLuminance)
    }

    // MARK: - Snapshot captions

    func testCaptionCountsDownDaylight() throws {
        let zone = try timeZone("Europe/London")
        let snapshot = SkySnapshot(
            date: try localNoon(2024, 6, 21, in: zone),
            coordinate: Coordinate(latitude: 51.5074, longitude: -0.1278),
            timeZone: zone
        )
        // Sunset is 21:21 BST, so noon leaves 9h21m.
        XCTAssertEqual(snapshot.caption, "9h 21m of light left")
    }

    func testCaptionHandlesPolarConditions() throws {
        let zone = try timeZone("Europe/Oslo")
        let tromso = Coordinate(latitude: 69.6492, longitude: 18.9553)

        let polarNight = SkySnapshot(date: try localNoon(2024, 12, 21, in: zone),
                                     coordinate: tromso, timeZone: zone)
        XCTAssertEqual(polarNight.caption, "the sun does not rise today")

        let polarDay = SkySnapshot(date: try localNoon(2024, 6, 21, in: zone),
                                   coordinate: tromso, timeZone: zone)
        XCTAssertEqual(polarDay.caption, "the sun does not set today")
    }

    /// After dark the caption has to point at tomorrow's sunrise, not today's
    /// which has already passed.
    func testCaptionAfterSunsetPointsAtTomorrow() throws {
        let zone = try timeZone("Europe/London")
        let london = Coordinate(latitude: 51.5074, longitude: -0.1278)

        let lateEvening = try localNoon(2024, 12, 21, in: zone).addingTimeInterval(10 * 3_600)
        let snapshot = SkySnapshot(date: lateEvening, coordinate: london, timeZone: zone)

        XCTAssertNil(snapshot.daylightRemaining)
        XCTAssertTrue(snapshot.caption.hasPrefix("sunrise at"), snapshot.caption)

        let nextSunrise = try XCTUnwrap(snapshot.nextSunrise)
        XCTAssertGreaterThan(nextSunrise, lateEvening)
    }

    func testDurationTextFormatting() {
        XCTAssertEqual(SkySnapshot.durationText(9 * 3_600 + 21 * 60), "9h 21m")
        XCTAssertEqual(SkySnapshot.durationText(45 * 60), "45m")
        XCTAssertEqual(SkySnapshot.durationText(0), "0m")
        XCTAssertEqual(SkySnapshot.durationText(3_600), "1h 0m")
    }
}
