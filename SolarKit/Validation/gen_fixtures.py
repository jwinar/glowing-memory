"""Emit exact reference values from the validated Python implementation,
formatted as Swift test fixtures."""

from datetime import date, datetime, timedelta, timezone
import solar_ref as s

print("// Altitude fixtures: (iso8601 UTC, lat, lon, altitude degrees)")
ALT = [
    ("London  midday",  "2024-06-21T12:00:00Z", 51.5074,  -0.1278),
    ("London  midnight", "2024-06-21T00:00:00Z", 51.5074, -0.1278),
    ("London  winter noon", "2024-12-21T12:00:00Z", 51.5074, -0.1278),
    ("NYC     equinox noon", "2024-03-20T16:00:00Z", 40.7128, -74.0060),
    ("Sydney  summer",  "2024-12-21T02:00:00Z", -33.8688, 151.2093),
    ("Quito   noon",    "2024-03-20T17:00:00Z", -0.1807, -78.4678),
    ("Tromso  polar night noon", "2024-12-21T11:00:00Z", 69.6492, 18.9553),
    ("Tromso  midnight sun", "2024-06-21T23:00:00Z", 69.6492, 18.9553),
]
for label, iso, lat, lon in ALT:
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    alt = s.sun_altitude(dt, lat, lon)
    print(f'    ("{iso}", {lat}, {lon}, {alt:.6f}),  // {label}')

print()
print("// Equation of time / declination at 2024-06-21T12:00Z")
noon = datetime(2024, 6, 21, 12, tzinfo=timezone.utc)
t = s.julian_century(s.julian_day(noon))
print(f"    julianDay      = {s.julian_day(noon):.6f}")
print(f"    julianCentury  = {t:.10f}")
print(f"    declination    = {s.solar_declination(t):.6f}")
print(f"    equationOfTime = {s.equation_of_time(t):.6f}")

print()
print("// JD epoch check: 1970-01-01T00:00:00Z ->",
      s.julian_day(datetime(1970, 1, 1, tzinfo=timezone.utc)))

print()
print("// Phase transition times, London 2024-06-21 (UTC)")
THRESHOLDS = [(-18.0, "astronomical"), (-12.0, "nautical"), (-6.0, "civil"),
              (-0.833, "sunrise/sunset"), (6.0, "golden hour")]
for alt_thr, name in THRESHOLDS:
    zenith = 90.0 - alt_thr
    r, st = s.sun_events(date(2024, 6, 21), 51.5074, -0.1278, zenith_deg=zenith)
    rs = r.strftime("%H:%M:%S") if r else "none"
    ss = st.strftime("%H:%M:%S") if st else "none"
    print(f"    {name:<16} alt {alt_thr:>7}   morning {rs}   evening {ss}")

print()
print("// Same, Tromso 2024-12-21 (polar night) - which thresholds still cross")
for alt_thr, name in THRESHOLDS:
    zenith = 90.0 - alt_thr
    r, st = s.sun_events(date(2024, 12, 21), 69.6492, 18.9553, zenith_deg=zenith)
    rs = r.strftime("%H:%M:%S") if r else "none"
    ss = st.strftime("%H:%M:%S") if st else "none"
    print(f"    {name:<16} alt {alt_thr:>7}   morning {rs}   evening {ss}")

print()
print("// Peak altitude at Tromso on polar night (must stay below horizon)")
best = -99
for m in range(0, 1440, 5):
    dt = datetime(2024, 12, 21, tzinfo=timezone.utc) + timedelta(minutes=m)
    best = max(best, s.sun_altitude(dt, 69.6492, 18.9553))
print(f"    peak altitude = {best:.4f} deg")

print()
print("// Minimum altitude at Tromso on midsummer (must stay above horizon)")
worst = 99
for m in range(0, 1440, 5):
    dt = datetime(2024, 6, 21, tzinfo=timezone.utc) + timedelta(minutes=m)
    worst = min(worst, s.sun_altitude(dt, 69.6492, 18.9553))
print(f"    min altitude = {worst:.4f} deg")
