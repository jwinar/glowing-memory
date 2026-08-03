import Foundation

/// Low-level routines from the NOAA solar position algorithm.
///
/// Ported from the NOAA Solar Calculator's published formulae:
/// https://gml.noaa.gov/grad/solcalc/calcdetails.html
///
/// Everything here is pure arithmetic on doubles — no I/O, no system time, no
/// allocation. That is deliberate: the widget's timeline provider computes a
/// full day of sun positions in a single pass, and it has to be cheap enough
/// to do that inside a widget extension's memory budget.
enum SolarMath {

    // MARK: - Angles

    @inline(__always)
    static func radians(_ degrees: Double) -> Double { degrees * .pi / 180 }

    @inline(__always)
    static func degrees(_ radians: Double) -> Double { radians * 180 / .pi }

    /// Wraps an angle into `0..<360`.
    static func normalize360(_ angle: Double) -> Double {
        let wrapped = angle.truncatingRemainder(dividingBy: 360)
        return wrapped < 0 ? wrapped + 360 : wrapped
    }

    // MARK: - Time

    /// Julian Day for an instant. `Date` is an absolute instant already, so no
    /// calendar is involved — 2440587.5 is the Julian Day of the Unix epoch.
    static func julianDay(_ date: Date) -> Double {
        date.timeIntervalSince1970 / 86_400 + 2_440_587.5
    }

    /// Julian centuries since J2000.0.
    static func julianCentury(_ julianDay: Double) -> Double {
        (julianDay - 2_451_545) / 36_525
    }

    static func julianCentury(_ date: Date) -> Double {
        julianCentury(julianDay(date))
    }

    /// Minutes elapsed since the most recent UTC midnight.
    static func minutesIntoUTCDay(_ date: Date) -> Double {
        var remainder = date.timeIntervalSince1970.truncatingRemainder(dividingBy: 86_400)
        if remainder < 0 { remainder += 86_400 }
        return remainder / 60
    }

    // MARK: - Solar geometry

    static func geometricMeanLongitude(_ t: Double) -> Double {
        normalize360(280.46646 + t * (36_000.76983 + t * 0.0003032))
    }

    static func geometricMeanAnomaly(_ t: Double) -> Double {
        357.52911 + t * (35_999.05029 - 0.0001537 * t)
    }

    static func eccentricity(_ t: Double) -> Double {
        0.016708634 - t * (0.000042037 + 0.0000001267 * t)
    }

    static func equationOfCenter(_ t: Double) -> Double {
        let m = radians(geometricMeanAnomaly(t))
        return sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t))
            + sin(2 * m) * (0.019993 - 0.000101 * t)
            + sin(3 * m) * 0.000289
    }

    static func apparentLongitude(_ t: Double) -> Double {
        let trueLongitude = geometricMeanLongitude(t) + equationOfCenter(t)
        let omega = 125.04 - 1_934.136 * t
        return trueLongitude - 0.00569 - 0.00478 * sin(radians(omega))
    }

    static func obliquityCorrected(_ t: Double) -> Double {
        let seconds = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))
        let meanObliquity = 23 + (26 + seconds / 60) / 60
        let omega = 125.04 - 1_934.136 * t
        return meanObliquity + 0.00256 * cos(radians(omega))
    }

    /// Solar declination in degrees — how far north or south of the celestial
    /// equator the sun sits. Swings between roughly ±23.44 over a year, and is
    /// the reason day length changes at all.
    static func declination(_ t: Double) -> Double {
        let obliquity = radians(obliquityCorrected(t))
        let lambda = radians(apparentLongitude(t))
        return degrees(asin(sin(obliquity) * sin(lambda)))
    }

    /// Equation of time in minutes: the gap between apparent and mean solar
    /// time. Solar noon drifts up to ~16 minutes either side of clock noon
    /// across the year because of this, which is why the gradient can't just
    /// key off wall-clock hours.
    static func equationOfTime(_ t: Double) -> Double {
        let epsilon = obliquityCorrected(t)
        let l0 = radians(geometricMeanLongitude(t))
        let e = eccentricity(t)
        let m = radians(geometricMeanAnomaly(t))

        let y = pow(tan(radians(epsilon / 2)), 2)

        let value = y * sin(2 * l0)
            - 2 * e * sin(m)
            + 4 * e * y * sin(m) * cos(2 * l0)
            - 0.5 * y * y * sin(4 * l0)
            - 1.25 * e * e * sin(2 * m)

        return degrees(value) * 4
    }

    /// Atmospheric refraction in degrees. Near the horizon the atmosphere
    /// bends light enough to lift the sun about half a degree, which is most
    /// of why sunrise doesn't happen when raw geometry says it should.
    static func refractionCorrection(trueElevation elevation: Double) -> Double {
        guard elevation <= 85 else { return 0 }
        let te = tan(radians(elevation))
        let arcSeconds: Double
        if elevation > 5 {
            arcSeconds = 58.1 / te - 0.07 / pow(te, 3) + 0.000086 / pow(te, 5)
        } else if elevation > -0.575 {
            arcSeconds = 1_735 + elevation * (-518.2 + elevation *
                (103.4 + elevation * (-12.79 + elevation * 0.711)))
        } else {
            arcSeconds = -20.774 / te
        }
        return arcSeconds / 3_600
    }

    /// The sun's hour angle in degrees at an instant: 0 at solar noon,
    /// negative before it, positive after.
    static func hourAngle(date: Date, longitude: Double, equationOfTime eqTime: Double) -> Double {
        var trueSolarTime = (minutesIntoUTCDay(date) + eqTime + 4 * longitude)
            .truncatingRemainder(dividingBy: 1_440)
        if trueSolarTime < 0 { trueSolarTime += 1_440 }

        var angle = trueSolarTime / 4 - 180
        if angle < -180 { angle += 360 }
        return angle
    }

    /// Hour angle in degrees at which the sun reaches `zenith`, or `nil` when
    /// it never reaches it that day — polar day or polar night.
    static func hourAngle(zenith: Double, latitude: Double, declination decl: Double) -> Double? {
        let latitudeR = radians(latitude)
        let declinationR = radians(decl)

        let cosHourAngle = cos(radians(zenith)) / (cos(latitudeR) * cos(declinationR))
            - tan(latitudeR) * tan(declinationR)

        guard cosHourAngle >= -1, cosHourAngle <= 1 else { return nil }
        return degrees(acos(cosHourAngle))
    }

    /// Apparent elevation in degrees, plus the hour angle used to get there.
    /// The hour angle's sign tells the caller whether the sun is climbing.
    static func elevation(date: Date, coordinate: Coordinate) -> (altitude: Double, hourAngle: Double) {
        let t = julianCentury(date)
        let decl = declination(t)
        let eqTime = equationOfTime(t)
        let ha = hourAngle(date: date, longitude: coordinate.longitude, equationOfTime: eqTime)

        let latitudeR = radians(coordinate.latitude)
        let declinationR = radians(decl)

        let rawCosZenith = sin(latitudeR) * sin(declinationR)
            + cos(latitudeR) * cos(declinationR) * cos(radians(ha))
        let cosZenith = min(1, max(-1, rawCosZenith))

        let trueElevation = 90 - degrees(acos(cosZenith))
        return (trueElevation + refractionCorrection(trueElevation: trueElevation), ha)
    }
}
