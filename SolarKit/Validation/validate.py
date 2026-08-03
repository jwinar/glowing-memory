"""Validate solar_ref.py against published sunrise/sunset times."""

from datetime import date, datetime, timedelta, timezone
import solar_ref as s

# (label, lat, lon, date, utc_offset_hours, expected_rise_local, expected_set_local)
# Expected values are published times (timeanddate.com) for the given local date.
CASES = [
    ("London      2024-06-21", 51.5074,   -0.1278, date(2024, 6, 21),  1, "04:43", "21:21"),
    ("London      2024-12-21", 51.5074,   -0.1278, date(2024, 12, 21), 0, "08:04", "15:53"),
    ("New York    2024-03-20", 40.7128,  -74.0060, date(2024, 3, 20), -4, "06:58", "19:07"),
    ("New York    2024-09-22", 40.7128,  -74.0060, date(2024, 9, 22), -4, "06:43", "18:53"),
    ("Sydney      2024-12-21", -33.8688, 151.2093, date(2024, 12, 21), 11, "05:42", "20:06"),
    ("Quito       2024-03-20", -0.1807,  -78.4678, date(2024, 3, 20), -5, "06:19", "18:26"),
    ("Reykjavik   2024-06-21", 64.1466,  -21.9426, date(2024, 6, 21),  0, "02:55", "24:04"),
]

print("=" * 74)
print("SUNRISE / SUNSET vs PUBLISHED".center(74))
print("=" * 74)
print(f"{'location':<24}{'expected':>18}{'computed':>18}{'delta':>14}")
print("-" * 74)

max_err = 0.0
for label, lat, lon, d, tz, exp_rise, exp_set in CASES:
    # Search the UTC day and its neighbours so far-east/west longitudes resolve
    # to the correct LOCAL date.
    found = {}
    for offset in (-1, 0, 1):
        r, st = s.sun_events(d + timedelta(days=offset), lat, lon)
        for kind, ev in (("rise", r), ("set", st)):
            if ev is None:
                continue
            local = ev + timedelta(hours=tz)
            if local.date() == d:
                found[kind] = local

    for kind, exp in (("rise", exp_rise), ("set", exp_set)):
        eh, em = map(int, exp.split(":"))
        exp_min = eh * 60 + em
        if kind not in found:
            print(f"{label:<24}{kind + ' ' + exp:>18}{'NOT FOUND':>18}{'--':>14}")
            continue
        got = found[kind]
        got_min = got.hour * 60 + got.minute + got.second / 60.0
        # "24:04" style expected values roll past midnight.
        if exp_min >= 1440:
            got_min += 1440 if got_min < 720 else 0
        err = got_min - exp_min
        max_err = max(max_err, abs(err))
        flag = "ok" if abs(err) <= 2.0 else "FAIL"
        print(f"{label:<24}{kind + ' ' + exp:>18}"
              f"{got.strftime('%H:%M:%S'):>18}{err:>+9.1f} min  {flag}")

print("-" * 74)
print(f"max error: {max_err:.1f} min\n")

print("=" * 74)
print("POLAR EDGE CASES".center(74))
print("=" * 74)
POLAR = [
    ("Tromso    2024-12-21", 69.6492, 18.9553, date(2024, 12, 21), "polarNight"),
    ("Tromso    2024-06-21", 69.6492, 18.9553, date(2024, 6, 21),  "polarDay"),
    ("Tromso    2024-09-22", 69.6492, 18.9553, date(2024, 9, 22),  None),
    ("Longyearb 2024-01-15", 78.2232, 15.6267, date(2024, 1, 15),  "polarNight"),
    ("McMurdo   2024-12-21", -77.8419, 166.6863, date(2024, 12, 21), "polarDay"),
    ("McMurdo   2024-06-21", -77.8419, 166.6863, date(2024, 6, 21), "polarNight"),
]
for label, lat, lon, d, expected in POLAR:
    got = s.polar_state(d, lat, lon)
    flag = "ok" if got == expected else "FAIL"
    print(f"{label:<24}expected {str(expected):<12} got {str(got):<12} {flag}")

print()
print("=" * 74)
print("DECLINATION SANITY (expect ~+23.44 / ~0 / ~-23.44)".center(74))
print("=" * 74)
for d, expect in [(date(2024, 6, 21), "+23.44"),
                  (date(2024, 3, 20), "  0.00"),
                  (date(2024, 12, 21), "-23.44"),
                  (date(2024, 9, 22), "  0.00")]:
    noon = datetime(d.year, d.month, d.day, 12, tzinfo=timezone.utc)
    decl = s.solar_declination(s.julian_century(s.julian_day(noon)))
    print(f"  {d}  expect {expect}   got {decl:+7.3f}")

print()
print("=" * 74)
print("EQUATION OF TIME (expect ~-14.2 Feb 11, ~+16.4 Nov 3)".center(74))
print("=" * 74)
for d, expect in [(date(2024, 2, 11), "-14.2"), (date(2024, 11, 3), "+16.4"),
                  (date(2024, 5, 14), "  3.7"), (date(2024, 7, 26), " -6.5")]:
    noon = datetime(d.year, d.month, d.day, 12, tzinfo=timezone.utc)
    eot = s.equation_of_time(s.julian_century(s.julian_day(noon)))
    print(f"  {d}  expect {expect} min   got {eot:+7.2f} min")
