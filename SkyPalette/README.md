# SkyPalette

Turns a `SolarPosition` into a drawable sky, and holds the widget faces.
Depends on `SolarKit`; knows nothing about astronomy itself.

```swift
let engine = PaletteEngine()
let snapshot = SkySnapshot(date: .now, coordinate: here, timeZone: .current)

snapshot.gradient.top      // zenith colour
snapshot.gradient.bottom   // horizon colour
snapshot.gradient.ink      // text colour, chosen for this sky
snapshot.caption           // "1h 16m of light left"
```

## Why stops are keyed by altitude

Not by phase. Altitude is continuous, so interpolating between stops yields a
continuous gradient even though the widget only samples it a dozen or so times
a day. Keying by phase would step visibly at every boundary — exactly where the
sky is moving fastest and the user is most likely to be looking.

## The legibility rule

Text over a gradient that runs from near-black to near-white is the hard part
of this app. Three approaches were measured against a year of skies at four
latitudes:

| Approach | Worst contrast | Verdict |
|---|---|---|
| Fixed white ink, luminance-thresholded | 2.84:1 | fails AA at every threshold |
| Fixed white ink plus a scrim | 4.50:1 | passes, but needs up to 0.45 opacity |
| **Ink chosen per face, scrim only where short** | **4.50:1** | **passes; heaviest scrim 0.19** |

The first fails because the gradient sweeps through a mid-luminance band where
neither white nor dark ink clears AA. The second works but pays for it
everywhere — 0.45 opacity over a golden-hour sky renders it grey, which is the
one thing the app cannot afford.

The third picks the ink first, which shrinks the problem to about 2% of skies.
Those get a scrim around 0.19. Everything else — all of night, all of high
noon, all of golden hour — is drawn at full saturation.

The ink is chosen once per face, for the *worse* of the gradient's two ends.
Choosing per end scores better on paper and looks like a bug: a white clock
above dark body copy.

Scrims are held flat across the bands the type occupies and ramped out between
them, so the middle of the face keeps its colour even when the edges are
darkened.

## Two rendering paths

`SkyBackground` draws the full-colour Home Screen sky. `DaylightAccessoryFace`
is a different design, not a scaled-down copy: iOS renders Lock Screen widgets
through a vibrancy pass that discards hue, so that path encodes the sky as
luminance and layout — a bar, not a gradient. Scaling the Home Screen face down
is what makes these look like grey smears.

## Validation

`Validation/` holds the Python the rules were derived from.

```
python3 Validation/ink_rule.py       # the shipped rule
python3 Validation/scrim_design.py   # the rejected fixed-white-plus-scrim rule
python3 Validation/palette_design.py # the rejected threshold rule
```

The rejected two are kept deliberately. They are the argument for the one that
shipped, and without them the rule looks arbitrary.
