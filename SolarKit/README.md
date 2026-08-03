# SolarKit

Solar position math for the Daylight widget. Pure Swift, no network, no
dependencies, no system time — given an instant and a coordinate it returns
where the sun is.

The widget extension needs to compute a whole day of sun positions in one pass
to build its timeline, so everything here is allocation-light arithmetic.

## API

```swift
let london = Coordinate(latitude: 51.5074, longitude: -0.1278)

// Where is the sun right now?
let position = SolarPosition(date: .now, coordinate: london)
position.altitude      // degrees above horizon, refraction included
position.phase         // .goldenHourEvening
position.phaseProgress // 0...1 within that phase's band

// What does the whole day look like?
let day = SolarDay(reference: .now, coordinate: london, timeZone: .current)
day.sunrise            // Date?  — nil inside the polar circles
day.sunset             // Date?
day.daylightDuration   // TimeInterval?
day.polarCondition     // .polarDay / .polarNight / nil
day.transitions()      // [PhaseTransition] — ordered, starts at local midnight
day.renderTimes()      // [Date] — when the widget should re-render
```

`renderTimes()` is the piece the timeline provider consumes. It places entries
on every phase boundary and subdivides the fast-moving twilight phases, while
giving day and night a single entry each — nothing visible changes across
those, so spending refreshes on them wastes the budget.

## Phases

Boundaries are the standard twilight definitions, not arbitrary picks:

| Phase | Altitude |
|---|---|
| `night` | below -18° |
| `astronomicalDawn` / `astronomicalDusk` | -18° to -12° |
| `nauticalDawn` / `nauticalDusk` | -12° to -6° |
| `civilDawn` / `civilDusk` | -6° to -0.833° |
| `goldenHourMorning` / `goldenHourEvening` | -0.833° to +6° |
| `day` | above +6° |

-0.833° is geometric sunrise once refraction and the sun's angular radius are
accounted for. -18° is where the sky stops scattering any sunlight at all.

## Accuracy

The algorithm is NOAA's, ported from the published formulae. Declination and
the equation of time are evaluated at UTC noon of the day rather than iterated
toward true solar noon; that simplification keeps the solve to a single pass
and costs well under a minute of accuracy.

Measured against published almanac times for seven cities, worst case error is
**1.5 minutes**. Nothing in the widget is sensitive at that scale.

## Cases that break naive implementations

These are all covered by the test suite, and each one is a real defect that a
"sunrise minus sunset" implementation gets wrong:

- **Polar night is not darkness.** Tromsø in December runs through
  astronomical, nautical and civil twilight around midday — the sun just never
  clears the horizon. A palette that paints polar night flat black is wrong for
  about four hours a day.
- **Polar day is not permanent noon.** Tromsø in June dips to +3.3° at solar
  midnight, which is squarely inside golden hour.
- **High summer has no true night.** London on 21 June bottoms out at -15°, so
  the `night` phase never occurs and dusk flips straight to dawn.
- **Dusk becomes dawn at solar midnight**, which is not an altitude crossing.
  Phase boundaries have to include it explicitly or the pre-midnight sliver
  gets mislabelled.
- **Local day ≠ UTC day.** Sydney's local sunrise falls on the previous UTC
  date. Computing against the UTC day puts the event a full day out.
- **DST days are 23 or 25 hours long.** Advancing by 86,400 seconds instead of
  one calendar day pushes the last render past local midnight.

## Validation

`Validation/` holds the Python reference implementation used to derive and
check the Swift test fixtures. It is not shipped in the app — it exists so the
expected values in the test suite have traceable provenance rather than being
numbers someone typed in.

```
python3 Validation/validate.py       # compare against published almanac times
python3 Validation/gen_fixtures.py   # regenerate the Swift test fixtures
```
