import XCTest
@testable import SolarKit

final class SolarDayTests: XCTestCase {

    // MARK: - Against published times

    /// Sunrise and sunset for real cities, checked against published almanac
    /// times. Two minutes of tolerance: the algorithm treats the sun as a
    /// point at a nominal refraction, so it will never match a published
    /// figure to the second, and nothing in the widget cares if it did.
    func testSunriseAndSunsetMatchPublishedTimes() throws {
        let cases: [(city: String, zone: String, latitude: Double, longitude: Double,
                     year: Int, month: Int, day: Int, rise: String, set: String)] = [
            ("London", "Europe/London", 51.5074, -0.1278,
             2024, 6, 21, "2024-06-21T03:43:00Z", "2024-06-21T20:21:00Z"),
            ("London", "Europe/London", 51.5074, -0.1278,
             2024, 12, 21, "2024-12-21T08:04:00Z", "2024-12-21T15:53:00Z"),
            ("New York", "America/New_York", 40.7128, -74.0060,
             2024, 3, 20, "2024-03-20T10:58:00Z", "2024-03-20T23:07:00Z"),
            ("Quito", "America/Guayaquil", -0.1807, -78.4678,
             2024, 3, 20, "2024-03-20T11:19:00Z", "2024-03-20T23:26:00Z"),
            // Far enough east that the local day's sunrise falls on the
            // previous UTC date — the case that breaks UTC-day implementations.
            ("Sydney", "Australia/Sydney", -33.8688, 151.2093,
             2024, 12, 21, "2024-12-20T18:42:00Z", "2024-12-21T09:06:00Z")
        ]

        for testCase in cases {
            let zone = try timeZone(testCase.zone)
            let day = SolarDay(
                reference: try localNoon(testCase.year, testCase.month, testCase.day, in: zone),
                coordinate: Coordinate(latitude: testCase.latitude,
                                       longitude: testCase.longitude),
                timeZone: zone
            )

            try assertClose(day.sunrise, try utc(testCase.rise), tolerance: 120,
                            "\(testCase.city) sunrise")
            try assertClose(day.sunset, try utc(testCase.set), tolerance: 120,
                            "\(testCase.city) sunset")
        }
    }

    func testDaylightDurationIsLongestAtMidsummer() throws {
        let zone = try timeZone("Europe/London")
        let london = Coordinate(latitude: 51.5074, longitude: -0.1278)

        let midsummer = SolarDay(reference: try localNoon(2024, 6, 21, in: zone),
                                 coordinate: london, timeZone: zone)
        let midwinter = SolarDay(reference: try localNoon(2024, 12, 21, in: zone),
                                 coordinate: london, timeZone: zone)

        let longest = try XCTUnwrap(midsummer.daylightDuration)
        let shortest = try XCTUnwrap(midwinter.daylightDuration)

        XCTAssertEqual(longest / 3_600, 16.64, accuracy: 0.05)
        XCTAssertEqual(shortest / 3_600, 7.82, accuracy: 0.05)
        XCTAssertGreaterThan(longest, shortest)
    }

    // MARK: - Polar cases

    func testPolarConditions() throws {
        let cases: [(place: String, zone: String, latitude: Double, longitude: Double,
                     year: Int, month: Int, day: Int, expected: PolarCondition?)] = [
            ("Tromso midwinter", "Europe/Oslo", 69.6492, 18.9553, 2024, 12, 21, .polarNight),
            ("Tromso midsummer", "Europe/Oslo", 69.6492, 18.9553, 2024, 6, 21, .polarDay),
            ("Tromso equinox", "Europe/Oslo", 69.6492, 18.9553, 2024, 9, 22, nil),
            ("Longyearbyen", "Europe/Oslo", 78.2232, 15.6267, 2024, 1, 15, .polarNight),
            ("McMurdo midsummer", "Pacific/Auckland", -77.8419, 166.6863, 2024, 12, 21, .polarDay),
            ("McMurdo midwinter", "Pacific/Auckland", -77.8419, 166.6863, 2024, 6, 21, .polarNight)
        ]

        for testCase in cases {
            let zone = try timeZone(testCase.zone)
            let day = SolarDay(
                reference: try localNoon(testCase.year, testCase.month, testCase.day, in: zone),
                coordinate: Coordinate(latitude: testCase.latitude,
                                       longitude: testCase.longitude),
                timeZone: zone
            )
            XCTAssertEqual(day.polarCondition, testCase.expected, testCase.place)

            if testCase.expected != nil {
                XCTAssertNil(day.sunrise, "\(testCase.place) should have no sunrise")
                XCTAssertNil(day.sunset, "\(testCase.place) should have no sunset")
                XCTAssertNil(day.daylightDuration, "\(testCase.place) has no bounded daylight")
            }
        }
    }

    /// Polar night is not darkness. Tromso in December still runs through
    /// astronomical, nautical and civil twilight around midday — the sun just
    /// never clears the horizon. A palette that paints polar night flat black
    /// would be wrong for roughly four hours a day.
    func testPolarNightStillPassesThroughTwilight() throws {
        let zone = try timeZone("Europe/Oslo")
        let day = SolarDay(reference: try localNoon(2024, 12, 21, in: zone),
                           coordinate: Coordinate(latitude: 69.6492, longitude: 18.9553),
                           timeZone: zone)

        let phases = day.transitions().map(\.phase)

        XCTAssertTrue(phases.contains(.civilDawn), "expected civil twilight, got \(phases)")
        XCTAssertTrue(phases.contains(.civilDusk), "expected civil twilight, got \(phases)")
        XCTAssertFalse(phases.contains(.day), "the sun never rises during polar night")
        XCTAssertFalse(phases.contains(.goldenHourMorning), "sun stays below the golden band")

        XCTAssertNotNil(day.crossings(altitude: -6).rising)
        XCTAssertNotNil(day.crossings(altitude: -6).setting)
    }

    /// London in June never gets astronomical darkness — the sun bottoms out
    /// around -15 degrees. The night phase must not appear.
    func testBritishSummerHasNoAstronomicalNight() throws {
        let zone = try timeZone("Europe/London")
        let day = SolarDay(reference: try localNoon(2024, 6, 21, in: zone),
                           coordinate: Coordinate(latitude: 51.5074, longitude: -0.1278),
                           timeZone: zone)

        let phases = day.transitions().map(\.phase)

        XCTAssertFalse(phases.contains(.night), "no true night in June, got \(phases)")
        XCTAssertNil(day.crossings(altitude: -18).rising)
        XCTAssertNil(day.crossings(altitude: -18).setting)

        // Dusk flips to dawn at solar midnight even though no altitude
        // threshold is crossed there.
        XCTAssertEqual(phases.first, .astronomicalDusk)
        XCTAssertTrue(phases.contains(.astronomicalDawn))
    }

    // MARK: - Transitions

    func testTransitionsAreOrderedAndStartAtMidnight() throws {
        let zone = try timeZone("Europe/London")
        let day = SolarDay(reference: try localNoon(2024, 12, 21, in: zone),
                           coordinate: Coordinate(latitude: 51.5074, longitude: -0.1278),
                           timeZone: zone)

        let transitions = day.transitions()
        XCTAssertFalse(transitions.isEmpty)
        XCTAssertEqual(transitions[0].start, day.startOfDay)

        for index in 1..<transitions.count {
            XCTAssertGreaterThan(transitions[index].start, transitions[index - 1].start,
                                 "transitions must strictly increase")
            XCTAssertNotEqual(transitions[index].phase, transitions[index - 1].phase,
                              "consecutive duplicate phases should be collapsed")
        }

        for transition in transitions {
            XCTAssertGreaterThanOrEqual(transition.start, day.startOfDay)
            XCTAssertLessThan(transition.start, day.endOfDay)
        }
    }

    func testMidwinterLondonRunsTheFullPhaseSequence() throws {
        let zone = try timeZone("Europe/London")
        let day = SolarDay(reference: try localNoon(2024, 12, 21, in: zone),
                           coordinate: Coordinate(latitude: 51.5074, longitude: -0.1278),
                           timeZone: zone)

        XCTAssertEqual(day.transitions().map(\.phase), [
            .night,
            .astronomicalDawn,
            .nauticalDawn,
            .civilDawn,
            .goldenHourMorning,
            .day,
            .goldenHourEvening,
            .civilDusk,
            .nauticalDusk,
            .astronomicalDusk,
            .night
        ])
    }

    // MARK: - Widget timeline

    func testRenderTimesStayWithinBudgetAndOrder() throws {
        let zone = try timeZone("Europe/London")
        let day = SolarDay(reference: try localNoon(2024, 12, 21, in: zone),
                           coordinate: Coordinate(latitude: 51.5074, longitude: -0.1278),
                           timeZone: zone)

        let times = day.renderTimes(maxEntries: 16)

        XCTAssertFalse(times.isEmpty)
        XCTAssertLessThanOrEqual(times.count, 16)
        XCTAssertEqual(times.first, day.startOfDay)

        for index in 1..<times.count {
            XCTAssertGreaterThan(times[index], times[index - 1], "render times must increase")
        }
        for time in times {
            XCTAssertGreaterThanOrEqual(time, day.startOfDay)
            XCTAssertLessThan(time, day.endOfDay)
        }
    }

    /// The whole point of the timeline strategy: a day's worth of renders has
    /// to fit in WidgetKit's refresh allowance with room to spare.
    func testRenderTimesFitTheRefreshBudget() throws {
        let zone = try timeZone("Europe/London")
        let london = Coordinate(latitude: 51.5074, longitude: -0.1278)

        for month in 1...12 {
            let day = SolarDay(reference: try localNoon(2024, month, 15, in: zone),
                               coordinate: london, timeZone: zone)
            let times = day.renderTimes()
            XCTAssertLessThanOrEqual(times.count, 16, "month \(month) overflowed the budget")
            XCTAssertGreaterThan(times.count, 1, "month \(month) produced too few entries")
        }
    }

    func testPolarDayProducesUsableTimeline() throws {
        // Midnight sun collapses to very few phases. The timeline still has to
        // yield at least one render, or the widget shows nothing at all.
        let zone = try timeZone("Europe/Oslo")
        let day = SolarDay(reference: try localNoon(2024, 6, 21, in: zone),
                           coordinate: Coordinate(latitude: 69.6492, longitude: 18.9553),
                           timeZone: zone)

        let times = day.renderTimes()
        XCTAssertFalse(times.isEmpty)
        XCTAssertEqual(times.first, day.startOfDay)
    }

    // MARK: - Calendar edges

    /// Spring-forward days are 23 hours long. Using a fixed 86,400 seconds for
    /// the day would push the last render past local midnight.
    func testDaylightSavingSpringForwardDayIsShort() throws {
        let zone = try timeZone("America/New_York")
        let day = SolarDay(reference: try localNoon(2024, 3, 10, in: zone),
                           coordinate: Coordinate(latitude: 40.7128, longitude: -74.0060),
                           timeZone: zone)

        let length = day.endOfDay.timeIntervalSince(day.startOfDay)
        XCTAssertEqual(length, 23 * 3_600, accuracy: 1)

        for time in day.renderTimes() {
            XCTAssertLessThan(time, day.endOfDay)
        }
    }

    func testDaylightSavingFallBackDayIsLong() throws {
        let zone = try timeZone("America/New_York")
        let day = SolarDay(reference: try localNoon(2024, 11, 3, in: zone),
                           coordinate: Coordinate(latitude: 40.7128, longitude: -74.0060),
                           timeZone: zone)

        let length = day.endOfDay.timeIntervalSince(day.startOfDay)
        XCTAssertEqual(length, 25 * 3_600, accuracy: 1)
    }

    func testSunriseIsStableAcrossReferenceInstantsWithinTheSameDay() throws {
        let zone = try timeZone("Australia/Sydney")
        let coordinate = Coordinate(latitude: -33.8688, longitude: 151.2093)

        let noon = try localNoon(2024, 12, 21, in: zone)

        // Any instant inside the local day must resolve to the same events.
        let expected = SolarDay(reference: noon, coordinate: coordinate, timeZone: zone).sunrise
        XCTAssertNotNil(expected)

        for hourOffset in [-11, -6, 0, 6, 11] {
            let reference = noon.addingTimeInterval(Double(hourOffset) * 3_600)
            let day = SolarDay(reference: reference, coordinate: coordinate, timeZone: zone)
            XCTAssertEqual(day.sunrise, expected, "drifted at offset \(hourOffset)h")
        }
    }
}
