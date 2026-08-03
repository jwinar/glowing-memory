"""
Derives the scrim opacity needed to guarantee legible white text over any sky
the palette can produce, then verifies it over a full year at four latitudes.

White ink has relative luminance 1.0, so WCAG AA (4.5:1) requires the
background behind the text to sit at or below:
    (1.0 + 0.05) / 4.5 - 0.05 = 0.1833
A black scrim at alpha `a` composites to bg * (1 - a) in sRGB space, so the
minimum alpha follows from solving that bound.
"""

from datetime import date, datetime, timedelta, timezone
from palette_design import (gradient, luminance, contrast, sample,
                            PLACES, DAYS, INK_LIGHT)

TARGET_RATIO = 4.5
MAX_BACKGROUND_LUMINANCE = (1.0 + 0.05) / TARGET_RATIO - 0.05

# Never fully black out a bright sky; the aesthetic is the product.
SCRIM_CEILING = 0.55


def scrim_alpha(bg):
    """Smallest alpha in 0..SCRIM_CEILING that gets `bg` under the bound."""
    if luminance(bg) <= MAX_BACKGROUND_LUMINANCE:
        return 0.0
    lo, hi = 0.0, SCRIM_CEILING
    for _ in range(40):
        mid = (lo + hi) / 2
        dimmed = tuple(c * (1 - mid) for c in bg)
        if luminance(dimmed) > MAX_BACKGROUND_LUMINANCE:
            lo = mid
        else:
            hi = mid
    return hi


print(f"background luminance must sit at or below {MAX_BACKGROUND_LUMINANCE:.4f}\n")

worst_ratio, worst_where = 99.0, ""
max_alpha, alpha_where = 0.0, ""
capped = 0
total = 0

for name, lat, lon in PLACES:
    for day in DAYS:
        base = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        for minute in range(0, 1440, 4):
            dt = base + timedelta(minutes=minute)
            alt, rising = sample(dt, lat, lon)
            top, bottom = gradient(alt, rising)

            for label, bg in (("top", top), ("bottom", bottom)):
                total += 1
                a = scrim_alpha(bg)
                if a >= SCRIM_CEILING - 1e-6 and luminance(bg) > MAX_BACKGROUND_LUMINANCE:
                    capped += 1
                dimmed = tuple(c * (1 - a) for c in bg)
                ratio = contrast(INK_LIGHT, dimmed)

                if ratio < worst_ratio:
                    worst_ratio = ratio
                    worst_where = f"{name} {day} {minute//60:02d}:{minute%60:02d} {label}"
                if a > max_alpha:
                    max_alpha = a
                    alpha_where = f"{name} {day} {minute//60:02d}:{minute%60:02d} {label}"

print(f"samples checked      {total}")
print(f"worst contrast       {worst_ratio:.2f}:1   at {worst_where}")
print(f"heaviest scrim       {max_alpha:.3f}       at {alpha_where}")
print(f"hit the ceiling      {capped} samples")
print()
print("AA PASSES" if worst_ratio >= TARGET_RATIO else "AA FAILS")

print("\nScrim needed at representative altitudes:")
for alt, rising, label in [(-30, True, "deep night"), (-10, True, "nautical dawn"),
                           (-2, True, "civil dawn"), (2, False, "golden hour"),
                           (20, False, "afternoon"), (58, False, "high noon")]:
    top, bottom = gradient(alt, rising)
    print(f"  {label:<16} alt {alt:>4}   top {scrim_alpha(top):.2f}   bottom {scrim_alpha(bottom):.2f}")
