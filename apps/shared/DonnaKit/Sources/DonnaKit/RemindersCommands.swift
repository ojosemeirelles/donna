import Foundation

public enum DonnaRemindersCommand: String, Codable, Sendable {
    case list = "reminders.list"
    case add = "reminders.add"
}

public enum DonnaReminderStatusFilter: String, Codable, Sendable {
    case incomplete
    case completed
    case all
}

public struct DonnaRemindersListParams: Codable, Sendable, Equatable {
    public var status: DonnaReminderStatusFilter?
    public var limit: Int?

    public init(status: DonnaReminderStatusFilter? = nil, limit: Int? = nil) {
        self.status = status
        self.limit = limit
    }
}

public struct DonnaRemindersAddParams: Codable, Sendable, Equatable {
    public var title: String
    public var dueISO: String?
    public var notes: String?
    public var listId: String?
    public var listName: String?

    public init(
        title: String,
        dueISO: String? = nil,
        notes: String? = nil,
        listId: String? = nil,
        listName: String? = nil)
    {
        self.title = title
        self.dueISO = dueISO
        self.notes = notes
        self.listId = listId
        self.listName = listName
    }
}

public struct DonnaReminderPayload: Codable, Sendable, Equatable {
    public var identifier: String
    public var title: String
    public var dueISO: String?
    public var completed: Bool
    public var listName: String?

    public init(
        identifier: String,
        title: String,
        dueISO: String? = nil,
        completed: Bool,
        listName: String? = nil)
    {
        self.identifier = identifier
        self.title = title
        self.dueISO = dueISO
        self.completed = completed
        self.listName = listName
    }
}

public struct DonnaRemindersListPayload: Codable, Sendable, Equatable {
    public var reminders: [DonnaReminderPayload]

    public init(reminders: [DonnaReminderPayload]) {
        self.reminders = reminders
    }
}

public struct DonnaRemindersAddPayload: Codable, Sendable, Equatable {
    public var reminder: DonnaReminderPayload

    public init(reminder: DonnaReminderPayload) {
        self.reminder = reminder
    }
}
