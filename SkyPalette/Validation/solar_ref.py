"""
Reference implementation of the NOAA solar position algorithm.

This exists to validate the math BEFORE porting to Swift, and to generate
verified expected values for the SolarKit test suite. Not shipped.

Source: NOAA Solar Calculator (General Solar Position Calculations),
https://gml.noaa.gov/grad/solcalc/calcdetails.html
"""

import math
from datetime import datetime, timedelta, timezone


def julian_day(dt_utc):
    """Julian Day number for a UTC datetime (fractional)."""
    y, m = dt_utc.year, dt_utc.month
    d = (dt_utc.day
         + dt_utc.hour / 24.0
         + dt_utc.minute / 1440.0
         + dt_utc.second / 86400.0)
    if m <= 2:
        y -= 1
        m += 12
    a = y // 100
    b = 2 - a + a // 4
    return (math.floor(365.25 * (y + 4716))
            + math.floor(30.6001 * (m + 1))
            + d + b - 1524.5)


def julian_century(jd):
    return (jd - 2451545.0) / 36525.0


def _geom_mean_long_sun(t):
    return (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360.0


def _geom_mean_anomaly_sun(t):
    return 357.52911 + t * (35999.05029 - 0.0001537 * t)


def _eccentricity(t):
    return 0.016708634 - t * (0.000042037 + 0.0000001267 * t)


def _sun_eq_of_center(t):
    m = math.radians(_geom_mean_anomaly_sun(t))
    return (math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t))
            + math.sin(2 * m) * (0.019993 - 0.000101 * t)
            + math.sin(3 * m) * 0.000289)


def _sun_apparent_long(t):
    true_long = _geom_mean_long_sun(t) + _sun_eq_of_center(t)
    omega = 125.04 - 1934.136 * t
    return true_long - 0.00569 - 0.00478 * math.sin(math.radians(omega))


def _obliquity_corrected(t):
    seconds = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))
    mean_obliq = 23.0 + (26.0 + seconds / 60.0) / 60.0
    omega = 125.04 - 1934.136 * t
    return mean_obliq + 0.00256 * math.cos(math.radians(omega))


def solar_declination(t):
    """Sun declination in degrees."""
    e = math.radians(_obliquity_corrected(t))
    lam = math.radians(_sun_apparent_long(t))
    return math.degrees(math.asin(math.sin(e) * math.sin(lam)))


def equation_of_time(t):
    """Equation of time in minutes."""
    epsilon = _obliquity_corrected(t)
    l0 = _geom_mean_long_sun(t)
    e = _eccentricity(t)
    m = _geom_mean_anomaly_sun(t)

    y = math.tan(math.radians(epsilon / 2.0)) ** 2
    l0r, mr = math.radians(l0), math.radians(m)

    etime = (y * math.sin(2 * l0r)
             - 2 * e * math.sin(mr)
             + 4 * e * y * math.sin(mr) * math.cos(2 * l0r)
             - 0.5 * y * y * math.sin(4 * l0r)
             - 1.25 * e * e * math.sin(2 * mr))
    return math.degrees(etime) * 4.0


def _refraction_correction(elev_deg):
    """Atmospheric refraction correction in degrees, per NOAA."""
    if elev_deg > 85.0:
        return 0.0
    te = math.tan(math.radians(elev_deg))
    if elev_deg > 5.0:
        corr = 58.1 / te - 0.07 / te**3 + 0.000086 / te**5
    elif elev_deg > -0.575:
        corr = (1735.0 + elev_deg * (-518.2 + elev_deg *
                (103.4 + elev_deg * (-12.79 + elev_deg * 0.711))))
    else:
        corr = -20.774 / te
    return corr / 3600.0


def sun_altitude(dt_utc, lat, lon, apply_refraction=True):
    """Apparent solar elevation in degrees above the horizon."""
    jd = julian_day(dt_utc)
    t = julian_century(jd)

    decl = solar_declination(t)
    eq_time = equation_of_time(t)

    minutes = dt_utc.hour * 60.0 + dt_utc.minute + dt_utc.second / 60.0
    # True solar time in minutes; lon east-positive.
    true_solar_time = (minutes + eq_time + 4.0 * lon) % 1440.0

    hour_angle = true_solar_time / 4.0 - 180.0
    if hour_angle < -180.0:
        hour_angle += 360.0

    lat_r = math.radians(lat)
    decl_r = math.radians(decl)
    ha_r = math.radians(hour_angle)

    cos_zenith = (math.sin(lat_r) * math.sin(decl_r)
                  + math.cos(lat_r) * math.cos(decl_r) * math.cos(ha_r))
    cos_zenith = max(-1.0, min(1.0, cos_zenith))
    elev = 90.0 - math.degrees(math.acos(cos_zenith))

    if apply_refraction:
        elev += _refraction_correction(elev)
    return elev


def _hour_angle_for_zenith(lat, decl, zenith_deg):
    """Hour angle (deg) at which the sun hits `zenith_deg`. None if never."""
    lat_r, decl_r = math.radians(lat), math.radians(decl)
    cos_ha = (math.cos(math.radians(zenith_deg))
              / (math.cos(lat_r) * math.cos(decl_r))
              - math.tan(lat_r) * math.tan(decl_r))
    if cos_ha > 1.0 or cos_ha < -1.0:
        return None  # sun never reaches this zenith today
    return math.degrees(math.acos(cos_ha))


def sun_events(date, lat, lon, zenith_deg=90.833):
    """
    (rise, set) as UTC datetimes for the given local date, or (None, None)
    when the sun never crosses that zenith (polar day / polar night).
    """
    noon_utc = datetime(date.year, date.month, date.day, 12, 0,
                        tzinfo=timezone.utc)
    t = julian_century(julian_day(noon_utc))
    decl = solar_declination(t)
    eq_time = equation_of_time(t)

    # Solar noon in minutes UTC.
    solar_noon = 720.0 - 4.0 * lon - eq_time

    ha = _hour_angle_for_zenith(lat, decl, zenith_deg)
    if ha is None:
        return None, None

    rise = solar_noon - 4.0 * ha
    sset = solar_noon + 4.0 * ha

    base = datetime(date.year, date.month, date.day, tzinfo=timezone.utc)
    return base + timedelta(minutes=rise), base + timedelta(minutes=sset)


def polar_state(date, lat, lon):
    """'polarDay', 'polarNight', or None when the sun rises and sets."""
    rise, _ = sun_events(date, lat, lon)
    if rise is not None:
        return None
    noon_utc = datetime(date.year, date.month, date.day, 12, 0,
                        tzinfo=timezone.utc)
    solar_noon_min = 720.0 - 4.0 * lon - equation_of_time(
        julian_century(julian_day(noon_utc)))
    base = datetime(date.year, date.month, date.day, tzinfo=timezone.utc)
    alt_at_noon = sun_altitude(base + timedelta(minutes=solar_noon_min),
                               lat, lon)
    return 'polarDay' if alt_at_noon > 0 else 'polarNight'
