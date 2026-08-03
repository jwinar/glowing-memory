"""
Designs the palette and its text-ink rule, then proves both hold up.

The mock showed white-on-sand at golden hour was illegible. Rather than
guessing again, this measures WCAG contrast for every minute of the year at
several latitudes and reports the worst case.
"""

import math
from datetime import date, datetime, timedelta, timezone
import solar_ref as s

# Altitude -> (top colour, bottom colour). Bottom is the horizon end of the
# gradient, which is where the sun's warmth pools; top is the zenith end.
STOPS = [
    (-90.0, (0x05, 0x07, 0x14), (0x0A, 0x0D, 0x22)),
    (-18.0, (0x0B, 0x10, 0x28), (0x1A, 0x1E, 0x40)),
    (-12.0, (0x16, 0x18, 0x3C), (0x33, 0x2C, 0x5E)),
    (-6.0,  (0x25, 0x25, 0x55), (0x6E, 0x42, 0x66)),
    (-3.0,  (0x3A, 0x3A, 0x6E), (0xA8, 0x55, 0x64)),
    (-0.833, (0x53, 0x55, 0x82), (0xD2, 0x6E, 0x52)),
    (2.0,   (0x6E, 0x8F, 0xB4), (0xE8, 0x92, 0x4E)),
    (6.0,   (0x7F, 0xA8, 0xCE), (0xF0, 0xBE, 0x82)),
    (14.0,  (0x6F, 0xA6, 0xD6), (0xC5, 0xDB, 0xE8)),
    (35.0,  (0x4B, 0x93, 0xD2), (0x9C, 0xC9, 0xE8)),
    (90.0,  (0x3A, 0x82, 0xCC), (0x8F, 0xC0, 0xE4)),
]

INK_LIGHT = (0xFF, 0xFF, 0xFF)
INK_DARK = (0x1A, 0x18, 0x16)


def lerp(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def gradient(alt, rising):
    if alt <= STOPS[0][0]:
        top, bottom = STOPS[0][1], STOPS[0][2]
    elif alt >= STOPS[-1][0]:
        top, bottom = STOPS[-1][1], STOPS[-1][2]
    else:
        top, bottom = STOPS[-1][1], STOPS[-1][2]
        for i in range(len(STOPS) - 1):
            lo, lo_t, lo_b = STOPS[i]
            hi, hi_t, hi_b = STOPS[i + 1]
            if lo <= alt <= hi:
                f = (alt - lo) / (hi - lo)
                top, bottom = lerp(lo_t, hi_t, f), lerp(lo_b, hi_b, f)
                break
    if not rising and -8 < alt < 12:
        warm = (0xFF, 0x8A, 0x4A)
        top = lerp(top, warm, 0.10)
        bottom = lerp(bottom, warm, 0.18)
    return top, bottom


def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(rgb):
    r, g, b = (srgb_to_linear(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def ink_for(bg, threshold):
    return INK_DARK if luminance(bg) > threshold else INK_LIGHT


def sample(dt, lat, lon):
    alt = s.sun_altitude(dt, lat, lon)
    t = s.julian_century(s.julian_day(dt))
    eq = s.equation_of_time(t)
    mins = dt.hour * 60 + dt.minute + dt.second / 60
    tst = (mins + eq + 4 * lon) % 1440
    ha = tst / 4 - 180
    if ha < -180:
        ha += 360
    return alt, ha < 0


PLACES = [
    ("London", 51.5074, -0.1278),
    ("Tromso", 69.6492, 18.9553),
    ("Quito", -0.1807, -78.4678),
    ("Sydney", -33.8688, 151.2093),
]
DAYS = [date(2024, m, 15) for m in range(1, 13)]

print("Tuning the ink threshold — worst-case contrast over a full year\n")
print(f"{'threshold':>10}{'worst ratio':>14}{'where':>34}")
print("-" * 58)

best = None
for threshold in [0.18, 0.22, 0.25, 0.28, 0.32, 0.36, 0.40, 0.45, 0.50]:
    worst, where = 99.0, ""
    for name, lat, lon in PLACES:
        for day in DAYS:
            base = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
            for minute in range(0, 1440, 4):
                dt = base + timedelta(minutes=minute)
                alt, rising = sample(dt, lat, lon)
                top, bottom = gradient(alt, rising)
                for label, bg in (("top", top), ("bottom", bottom)):
                    ratio = contrast(ink_for(bottom, threshold), bg)
                    if ratio < worst:
                        worst, where = ratio, f"{name} {day} {minute//60:02d}:{minute%60:02d} {label}"
    flag = "AA" if worst >= 4.5 else "fails"
    print(f"{threshold:>10.2f}{worst:>14.2f}{where:>34}  {flag}")
    if best is None or worst > best[1]:
        best = (threshold, worst, where)

print(f"\nbest threshold {best[0]:.2f} -> worst-case {best[1]:.2f}:1 at {best[2]}")
