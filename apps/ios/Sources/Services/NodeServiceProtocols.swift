import CoreLocation
import Foundation
import DonnaKit
import UIKit

typealias DonnaCameraSnapResult = (format: String, base64: String, width: Int, height: Int)
typealias DonnaCameraClipResult = (format: String, base64: String, durationMs: Int, hasAudio: Bool)

protocol CameraServicing: Sendable {
    func listDevices() async -> [CameraController.CameraDeviceInfo]
    func snap(params: DonnaCameraSnapParams) async throws -> DonnaCameraSnapResult
    func clip(params: DonnaCameraClipParams) async throws -> DonnaCameraClipResult
}

protocol ScreenRecordingServicing: Sendable {
    func record(
        screenIndex: Int?,
        durationMs: Int?,
        fps: Double?,
        includeAudio: Bool?,
        outPath: String?) async throws -> String
}

@MainActor
protocol LocationServicing: Sendable {
    func authorizationStatus() -> CLAuthorizationStatus
    func accuracyAuthorization() -> CLAccuracyAuthorization
    func ensureAuthorization(mode: DonnaLocationMode) async -> CLAuthorizationStatus
    func currentLocation(
        params: DonnaLocationGetParams,
        desiredAccuracy: DonnaLocationAccuracy,
        maxAgeMs: Int?,
        timeoutMs: Int?) async throws -> CLLocation
    func startLocationUpdates(
        desiredAccuracy: DonnaLocationAccuracy,
        significantChangesOnly: Bool) -> AsyncStream<CLLocation>
    func stopLocationUpdates()
    func startMonitoringSignificantLocationChanges(onUpdate: @escaping @Sendable (CLLocation) -> Void)
    func stopMonitoringSignificantLocationChanges()
}

@MainActor
protocol DeviceStatusServicing: Sendable {
    func status() async throws -> DonnaDeviceStatusPayload
    func info() -> DonnaDeviceInfoPayload
}

protocol PhotosServicing: Sendable {
    func latest(params: DonnaPhotosLatestParams) async throws -> DonnaPhotosLatestPayload
}

protocol ContactsServicing: Sendable {
    func search(params: DonnaContactsSearchParams) async throws -> DonnaContactsSearchPayload
    func add(params: DonnaContactsAddParams) async throws -> DonnaContactsAddPayload
}

protocol CalendarServicing: Sendable {
    func events(params: DonnaCalendarEventsParams) async throws -> DonnaCalendarEventsPayload
    func add(params: DonnaCalendarAddParams) async throws -> DonnaCalendarAddPayload
}

protocol RemindersServicing: Sendable {
    func list(params: DonnaRemindersListParams) async throws -> DonnaRemindersListPayload
    func add(params: DonnaRemindersAddParams) async throws -> DonnaRemindersAddPayload
}

protocol MotionServicing: Sendable {
    func activities(params: DonnaMotionActivityParams) async throws -> DonnaMotionActivityPayload
    func pedometer(params: DonnaPedometerParams) async throws -> DonnaPedometerPayload
}

struct WatchMessagingStatus: Sendable, Equatable {
    var supported: Bool
    var paired: Bool
    var appInstalled: Bool
    var reachable: Bool
    var activationState: String
}

struct WatchQuickReplyEvent: Sendable, Equatable {
    var replyId: String
    var promptId: String
    var actionId: String
    var actionLabel: String?
    var sessionKey: String?
    var note: String?
    var sentAtMs: Int?
    var transport: String
}

struct WatchNotificationSendResult: Sendable, Equatable {
    var deliveredImmediately: Bool
    var queuedForDelivery: Bool
    var transport: String
}

protocol WatchMessagingServicing: AnyObject, Sendable {
    func status() async -> WatchMessagingStatus
    func setReplyHandler(_ handler: (@Sendable (WatchQuickReplyEvent) -> Void)?)
    func sendNotification(
        id: String,
        params: DonnaWatchNotifyParams) async throws -> WatchNotificationSendResult
}

extension CameraController: CameraServicing {}
extension ScreenRecordService: ScreenRecordingServicing {}
extension LocationService: LocationServicing {}
