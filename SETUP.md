# Building Daylight

The repo holds sources and two local Swift packages. There is no `.xcodeproj`
checked in — a hand-written pbxproj is unreviewable and goes stale, so the
target layout lives in `project.yml` instead.

## Fastest path

```sh
brew install xcodegen
xcodegen generate
open Daylight.xcodeproj
```

Then set your team and bundle identifiers, and change the App Group in three
places so they match:

- `Daylight/DaylightApp/Daylight.entitlements`
- `Daylight/DaylightWidget/DaylightWidget.entitlements`
- `LocationStore.appGroup` in `Daylight/Shared/LocationStore.swift`

They must be identical or the widget silently reads an empty store and every
render falls back to Greenwich.

## Assembling by hand instead

1. New iOS App, "Daylight", SwiftUI, iOS 17.
2. File ▸ Add Package Dependencies ▸ Add Local, for both `SolarKit` and
   `SkyPalette`.
3. Add a Widget Extension target, "DaylightWidget". Uncheck the configuration
   intent — the MVP is a `StaticConfiguration`.
4. Add `Daylight/Shared/LocationStore.swift` to **both** targets.
5. Add the App Group capability to both targets, using the same identifier.
6. Add `NSLocationWhenInUseUsageDescription` to the app's Info.plist.

## Running the tests

The packages test on their own, no simulator needed:

```sh
swift test --package-path SolarKit
swift test --package-path SkyPalette
```

`SkyPalette`'s contrast suite sweeps a year of skies at four latitudes, so it
takes a few seconds.

## Verification status

The Swift in this repo has **never been compiled** — it was written in a Linux
container with no Xcode and no Swift toolchain available. Expect to fix build
errors on first open.

What *is* verified is the maths and the colour rules, both checked against
independent Python implementations before being ported:

- sunrise/sunset within 1.5 minutes of published almanac times, seven cities
- polar day and polar night correct at six locations
- the scrim rule clears WCAG AA across a year at four latitudes, worst case
  4.50:1

Those harnesses live in `SolarKit/Validation/` and `SkyPalette/Validation/`.
