import Foundation
import XCTest

/// Parses an ISO-8601 UTC instant, e.g. `"2024-06-21T12:00:00Z"`.
func utc(_ iso: String, file: StaticString = #filePath, line: UInt = #line) throws -> Date {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    return try XCTUnwrap(formatter.date(from: iso),
                         "could not parse \(iso)",
                         file: file, line: line)
}

func timeZone(_ identifier: String,
              file: StaticString = #filePath,
              line: UInt = #line) throws -> TimeZone {
    try XCTUnwrap(TimeZone(identifier: identifier),
                  "unknown time zone \(identifier)",
                  file: file, line: line)
}

/// Noon on a given calendar day, in the supplied zone. Used as the reference
/// instant for `SolarDay`, which resolves whatever local day contains it.
func localNoon(_ year: Int, _ month: Int, _ day: Int,
               in zone: TimeZone,
               file: StaticString = #filePath,
               line: UInt = #line) throws -> Date {
    var components = DateComponents()
    components.year = year
    components.month = month
    components.day = day
    components.hour = 12

    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = zone

    return try XCTUnwrap(calendar.date(from: components),
                         "could not build \(year)-\(month)-\(day)",
                         file: file, line: line)
}

/// Asserts two instants agree within `tolerance` seconds, reporting the gap in
/// minutes since that is how sunrise error is actually judged.
func assertClose(_ actual: Date?,
                 _ expected: Date,
                 tolerance: TimeInterval,
                 _ label: String,
                 file: StaticString = #filePath,
                 line: UInt = #line) throws {
    let actual = try XCTUnwrap(actual, "\(label): expected an instant, got nil",
                               file: file, line: line)
    let delta = actual.timeIntervalSince(expected)
    XCTAssertLessThanOrEqual(
        abs(delta), tolerance,
        "\(label): off by \(String(format: "%.2f", delta / 60)) min",
        file: file, line: line
    )
}
