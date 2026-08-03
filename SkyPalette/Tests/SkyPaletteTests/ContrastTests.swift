import XCTest
import SolarKit
@testable import SkyPalette

/// The legibility guarantee. A design mock of an earlier palette showed white
/// type on a pale golden-hour sky at roughly 2:1, which is unreadable. These
/// tests exist so that cannot come back.
final class ContrastTests: XCTestCase {

    private let engine = PaletteEngine()

    private let places: [(name: String, coordinate: Coordinate, zone: String)] = [
        ("London", Coordinate(latitude: 51.5074, longitude: -0.1278), "Europe/London"),
        ("Tromso", Coordinate(latitude: 69.6492, longitude: 18.9553), "Europe/Oslo"),
        ("Quito", Coordinate(latitude: -0.1807, longitude: -78.4678), "America/Guayaquil"),
        ("Sydney", Coordinate(latitude: -33.8688, longitude: 151.2093), "Australia/Sydney")
    ]

    /// Every minute the widget could plausibly render, across a year and four
    /// latitudes, must clear WCAG AA.
    func testEveryRenderableSkyClearsAA() throws {
        var worst = Double.infinity
        var worstDescription = ""

        for place in places {
            for month in 1...12 {
                let reference = try localNoon(2024, month, 15, in: try timeZone(place.zone))
                let startOfDay = reference.addingTimeInterval(-43_200)

                for minute in stride(from: 0, to: 1_440, by: 10) {
                    let instant = startOfDay.addingTimeInterval(Double(minute) * 60)
                    let position = SolarPosition(date: instant, coordinate: place.coordinate)
                    let gradient = engine.gradient(for: position)

                    let ratio = gradient.worstContrastRatio
                    if ratio < worst {
                        worst = ratio
                        worstDescription = "\(place.name) month \(month) "
                            + "minute \(minute) altitude \(gradient.altitude)"
                    }
                }
            }
        }

        XCTAssertGreaterThanOrEqual(
            worst, Contrast.aa,
            "worst contrast was \(worst):1 at \(worstDescription)"
        )
    }

    /// Night must not be scrimmed. If it were, the palette would be paying a
    /// legibility cost exactly where it has no legibility problem.
    func testDarkSkiesNeedNoScrimAndTakeWhiteInk() {
        for altitude in [-40.0, -30.0, -20.0, -18.0, -14.0] {
            let gradient = engine.gradient(altitude: altitude, isRising: true)
            XCTAssertEqual(gradient.ink, .white, "altitude \(altitude)")
            XCTAssertTrue(gradient.isUnscrimmed, "altitude \(altitude) should need no scrim")
        }
    }

    /// Bright skies take dark ink instead of a heavy scrim. Scrimming a noon
    /// sky hard enough for white type is what turns these apps grey.
    func testBrightSkiesTakeDarkInkRatherThanAHeavyScrim() {
        for altitude in [20.0, 40.0, 58.0] {
            let gradient = engine.gradient(altitude: altitude, isRising: false)
            XCTAssertEqual(gradient.ink, .ink, "altitude \(altitude)")
            XCTAssertTrue(gradient.isUnscrimmed,
                          "altitude \(altitude) should not need a scrim with dark ink")
        }
    }

    /// Choosing the ink first should leave the scrim rarely needed and light
    /// when it is. A fixed-white rule demanded up to 0.45; this should stay
    /// well under half of that.
    func testScrimIsRareAndLight() throws {
        var scrimmedEnds = 0
        var totalEnds = 0
        var heaviest = 0.0

        for place in places {
            for month in 1...12 {
                let reference = try localNoon(2024, month, 15, in: try timeZone(place.zone))
                let startOfDay = reference.addingTimeInterval(-43_200)

                for minute in stride(from: 0, to: 1_440, by: 10) {
                    let instant = startOfDay.addingTimeInterval(Double(minute) * 60)
                    let gradient = engine.gradient(
                        for: SolarPosition(date: instant, coordinate: place.coordinate)
                    )
                    for scrim in [gradient.topScrim, gradient.bottomScrim] {
                        totalEnds += 1
                        if scrim > 0 { scrimmedEnds += 1 }
                        heaviest = max(heaviest, scrim)
                    }
                }
            }
        }

        let scrimmedFraction = Double(scrimmedEnds) / Double(totalEnds)
        XCTAssertLessThan(scrimmedFraction, 0.10,
                          "\(scrimmedEnds) of \(totalEnds) ends were scrimmed")
        XCTAssertLessThan(heaviest, 0.25, "heaviest scrim was \(heaviest)")
    }

    /// One ink per face. Per-end selection scores better on paper and looks
    /// like a bug — a white clock above dark body copy.
    func testInkIsChosenForTheWorseEndOfTheGradient() {
        let top = SkyColor(hex: 0x6E8FB4)
        let bottom = SkyColor(hex: 0xE8924E)
        let ink = Contrast.preferredInk(top: top, bottom: bottom)

        let chosenWorst = min(ink.contrastRatio(to: top), ink.contrastRatio(to: bottom))
        let alternative: SkyColor = ink == .white ? .ink : .white
        let alternativeWorst = min(alternative.contrastRatio(to: top),
                                   alternative.contrastRatio(to: bottom))

        XCTAssertGreaterThanOrEqual(chosenWorst, alternativeWorst)
    }

    /// The scrim solve should return the *smallest* opacity that works, not
    /// simply a safe large one — over-scrimming is how these apps turn grey.
    func testScrimIsMinimal() {
        // A mid-luminance sky, which is the band where neither ink is enough.
        let awkward = SkyColor(hex: 0x7E7A70)
        let ink = Contrast.preferredInk(top: awkward, bottom: awkward)
        let opacity = Contrast.scrimOpacity(over: awkward, ink: ink)
        let scrimColor = Contrast.scrimColor(for: ink)

        XCTAssertGreaterThan(opacity, 0, "this sky should genuinely need a scrim")
        XCTAssertGreaterThanOrEqual(
            ink.contrastRatio(to: awkward.mixed(with: scrimColor, amount: opacity)),
            Contrast.aa
        )
        // Meaningfully lighter than the solved value must fail, or the solve
        // was not tight.
        XCTAssertLessThan(
            ink.contrastRatio(to: awkward.mixed(with: scrimColor, amount: opacity - 0.02)),
            Contrast.aa
        )
    }

    func testScrimDirectionFollowsTheInk() {
        XCTAssertEqual(Contrast.scrimColor(for: .white), .black)
        XCTAssertEqual(Contrast.scrimColor(for: .ink), .white)
    }

    func testLuminanceMatchesKnownValues() {
        XCTAssertEqual(SkyColor.white.relativeLuminance, 1.0, accuracy: 1e-9)
        XCTAssertEqual(SkyColor.black.relativeLuminance, 0.0, accuracy: 1e-9)
        // Mid grey sits near 0.2159 under the sRGB transfer curve, not 0.5 —
        // the non-linearity is the whole reason a naive ink rule fails.
        XCTAssertEqual(SkyColor(hex: 0x808080).relativeLuminance, 0.2159, accuracy: 1e-3)
    }

    func testContrastRatioIsSymmetricAndBounded() {
        let a = SkyColor(hex: 0x1A1816)
        let b = SkyColor(hex: 0xF0BE82)
        XCTAssertEqual(a.contrastRatio(to: b), b.contrastRatio(to: a), accuracy: 1e-12)
        XCTAssertEqual(SkyColor.white.contrastRatio(to: .black), 21, accuracy: 1e-6)
        XCTAssertEqual(a.contrastRatio(to: a), 1, accuracy: 1e-12)
    }
}
