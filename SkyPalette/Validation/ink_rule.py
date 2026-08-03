"""
Verifies the shipped legibility rule: choose one ink per face, then scrim only
where that ink still falls short.

Three approaches were measured against a year of skies at four latitudes.
Only the third both clears WCAG AA and leaves the palette its colour:

  1. fixed white ink, threshold-picked          worst 2.84:1   FAILS
  2. fixed white ink + scrim                     worst 4.50:1   passes,
     but demands up to 0.45 opacity, which greys out golden hour
  3. per-face ink + scrim where needed           worst 4.50:1   passes,
     heaviest scrim 0.19, and ~98% of skies need none

`palette_design.py` holds approach 1 and `scrim_design.py` approach 2; both are
kept because the rejected options are the argument for this one.
"""

from datetime import datetime, timedelta, timezone

from palette_design import (gradient, contrast, sample, PLACES, DAYS,
                            INK_LIGHT, INK_DARK)

TARGET_RATIO = 4.5
SCRIM_CEILING = 0.55


def mixed(background, target, amount):
    return tuple(c + (t - c) * amount for c, t in zip(background, target))


def preferred_ink(top, bottom):
    """The ink that holds up best across the worse of the two ends."""
    return max((INK_LIGHT, INK_DARK),
               key=lambda ink: min(contrast(ink, top), contrast(ink, bottom)))


def scrim_opacity(background, ink, target=TARGET_RATIO, ceiling=SCRIM_CEILING):
    if contrast(ink, background) >= target:
        return 0.0
    away = (0, 0, 0) if ink is INK_LIGHT else (255, 255, 255)
    low, high = 0.0, ceiling
    for _ in range(40):
        mid = (low + high) / 2
        if contrast(ink, mixed(background, away, mid)) < target:
            low = mid
        else:
            high = mid
    return high


def main():
    worst, worst_where = 99.0, ""
    heaviest, heaviest_where = 0.0, ""
    scrimmed_ends = total_ends = 0
    ink_counts = {"white": 0, "dark": 0}

    for name, lat, lon in PLACES:
        for day in DAYS:
            base = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
            for minute in range(0, 1440, 4):
                instant = base + timedelta(minutes=minute)
                altitude, rising = sample(instant, lat, lon)
                top, bottom = gradient(altitude, rising)

                ink = preferred_ink(top, bottom)
                ink_counts["white" if ink is INK_LIGHT else "dark"] += 1
                away = (0, 0, 0) if ink is INK_LIGHT else (255, 255, 255)

                for label, background in (("top", top), ("bottom", bottom)):
                    total_ends += 1
                    opacity = scrim_opacity(background, ink)
                    if opacity > 0:
                        scrimmed_ends += 1

                    where = (f"{name} {day} {minute // 60:02d}:{minute % 60:02d} "
                             f"{label} alt={altitude:.1f}")
                    if opacity > heaviest:
                        heaviest, heaviest_where = opacity, where

                    ratio = contrast(ink, mixed(background, away, opacity))
                    if ratio < worst:
                        worst, worst_where = ratio, where

    print(f"faces measured      {total_ends // 2}")
    print(f"ink chosen          {ink_counts}")
    print(f"worst contrast      {worst:.2f}:1  at {worst_where}")
    print(f"heaviest scrim      {heaviest:.3f}  at {heaviest_where}")
    print(f"ends needing scrim  {scrimmed_ends} / {total_ends} "
          f"({100 * scrimmed_ends / total_ends:.1f}%)")
    print()
    print("AA PASSES" if worst >= TARGET_RATIO - 1e-6 else "AA FAILS")


if __name__ == "__main__":
    main()
