import Foundation
import XCTest

func timeZone(_ identifier: String,
              file: StaticString = #filePath,
              line: UInt = #line) throws -> TimeZone {
    try XCTUnwrap(TimeZone(identifier: identifier),
                  "unknown time zone \(identifier)",
                  file: file, line: line)
}

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
