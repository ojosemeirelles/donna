package ai.donna.android.protocol

enum class DonnaCapability(val rawValue: String) {
  Canvas("canvas"),
  Camera("camera"),
  Screen("screen"),
  Sms("sms"),
  VoiceWake("voiceWake"),
  Location("location"),
  Device("device"),
  Notifications("notifications"),
  System("system"),
  AppUpdate("appUpdate"),
  Photos("photos"),
  Contacts("contacts"),
  Calendar("calendar"),
  Motion("motion"),
}

enum class DonnaCanvasCommand(val rawValue: String) {
  Present("canvas.present"),
  Hide("canvas.hide"),
  Navigate("canvas.navigate"),
  Eval("canvas.eval"),
  Snapshot("canvas.snapshot"),
  ;

  companion object {
    const val NamespacePrefix: String = "canvas."
  }
}

enum class DonnaCanvasA2UICommand(val rawValue: String) {
  Push("canvas.a2ui.push"),
  PushJSONL("canvas.a2ui.pushJSONL"),
  Reset("canvas.a2ui.reset"),
  ;

  companion object {
    const val NamespacePrefix: String = "canvas.a2ui."
  }
}

enum class DonnaCameraCommand(val rawValue: String) {
  List("camera.list"),
  Snap("camera.snap"),
  Clip("camera.clip"),
  ;

  companion object {
    const val NamespacePrefix: String = "camera."
  }
}

enum class DonnaScreenCommand(val rawValue: String) {
  Record("screen.record"),
  ;

  companion object {
    const val NamespacePrefix: String = "screen."
  }
}

enum class DonnaSmsCommand(val rawValue: String) {
  Send("sms.send"),
  ;

  companion object {
    const val NamespacePrefix: String = "sms."
  }
}

enum class DonnaLocationCommand(val rawValue: String) {
  Get("location.get"),
  ;

  companion object {
    const val NamespacePrefix: String = "location."
  }
}

enum class DonnaDeviceCommand(val rawValue: String) {
  Status("device.status"),
  Info("device.info"),
  Permissions("device.permissions"),
  Health("device.health"),
  ;

  companion object {
    const val NamespacePrefix: String = "device."
  }
}

enum class DonnaNotificationsCommand(val rawValue: String) {
  List("notifications.list"),
  Actions("notifications.actions"),
  ;

  companion object {
    const val NamespacePrefix: String = "notifications."
  }
}

enum class DonnaSystemCommand(val rawValue: String) {
  Notify("system.notify"),
  ;

  companion object {
    const val NamespacePrefix: String = "system."
  }
}

enum class DonnaPhotosCommand(val rawValue: String) {
  Latest("photos.latest"),
  ;

  companion object {
    const val NamespacePrefix: String = "photos."
  }
}

enum class DonnaContactsCommand(val rawValue: String) {
  Search("contacts.search"),
  Add("contacts.add"),
  ;

  companion object {
    const val NamespacePrefix: String = "contacts."
  }
}

enum class DonnaCalendarCommand(val rawValue: String) {
  Events("calendar.events"),
  Add("calendar.add"),
  ;

  companion object {
    const val NamespacePrefix: String = "calendar."
  }
}

enum class DonnaMotionCommand(val rawValue: String) {
  Activity("motion.activity"),
  Pedometer("motion.pedometer"),
  ;

  companion object {
    const val NamespacePrefix: String = "motion."
  }
}
