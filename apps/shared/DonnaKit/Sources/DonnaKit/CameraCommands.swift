import Foundation

public enum DonnaCameraCommand: String, Codable, Sendable {
    case list = "camera.list"
    case snap = "camera.snap"
    case clip = "camera.clip"
}

public enum DonnaCameraFacing: String, Codable, Sendable {
    case back
    case front
}

public enum DonnaCameraImageFormat: String, Codable, Sendable {
    case jpg
    case jpeg
}

public enum DonnaCameraVideoFormat: String, Codable, Sendable {
    case mp4
}

public struct DonnaCameraSnapParams: Codable, Sendable, Equatable {
    public var facing: DonnaCameraFacing?
    public var maxWidth: Int?
    public var quality: Double?
    public var format: DonnaCameraImageFormat?
    public var deviceId: String?
    public var delayMs: Int?

    public init(
        facing: DonnaCameraFacing? = nil,
        maxWidth: Int? = nil,
        quality: Double? = nil,
        format: DonnaCameraImageFormat? = nil,
        deviceId: String? = nil,
        delayMs: Int? = nil)
    {
        self.facing = facing
        self.maxWidth = maxWidth
        self.quality = quality
        self.format = format
        self.deviceId = deviceId
        self.delayMs = delayMs
    }
}

public struct DonnaCameraClipParams: Codable, Sendable, Equatable {
    public var facing: DonnaCameraFacing?
    public var durationMs: Int?
    public var includeAudio: Bool?
    public var format: DonnaCameraVideoFormat?
    public var deviceId: String?

    public init(
        facing: DonnaCameraFacing? = nil,
        durationMs: Int? = nil,
        includeAudio: Bool? = nil,
        format: DonnaCameraVideoFormat? = nil,
        deviceId: String? = nil)
    {
        self.facing = facing
        self.durationMs = durationMs
        self.includeAudio = includeAudio
        self.format = format
        self.deviceId = deviceId
    }
}
