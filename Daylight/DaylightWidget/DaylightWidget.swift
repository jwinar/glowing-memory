import SwiftUI
import WidgetKit
import SkyPalette

@main
struct DaylightWidgetBundle: WidgetBundle {
    var body: some Widget {
        DaylightWidget()
    }
}

struct DaylightWidget: Widget {
    let kind = "DaylightWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DaylightProvider()) { entry in
            DaylightWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    // Home Screen faces paint their own sky; accessory faces
                    // are drawn by the system over the wallpaper.
                    Color.clear
                }
        }
        .configurationDisplayName("Daylight")
        .description("The sky where you are, and how much light is left.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

struct DaylightWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: DaylightEntry

    var body: some View {
        switch family {
        case .systemMedium:
            DaylightMediumFace(snapshot: entry.snapshot, dayColors: entry.dayColors)
        case .accessoryRectangular:
            DaylightAccessoryFace(snapshot: entry.snapshot)
        default:
            DaylightSmallFace(snapshot: entry.snapshot)
        }
    }
}
