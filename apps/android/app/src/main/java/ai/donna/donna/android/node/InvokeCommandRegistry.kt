package ai.donna.android.node

import ai.donna.android.protocol.DonnaCalendarCommand
import ai.donna.android.protocol.DonnaCanvasA2UICommand
import ai.donna.android.protocol.DonnaCanvasCommand
import ai.donna.android.protocol.DonnaCameraCommand
import ai.donna.android.protocol.DonnaCapability
import ai.donna.android.protocol.DonnaContactsCommand
import ai.donna.android.protocol.DonnaDeviceCommand
import ai.donna.android.protocol.DonnaLocationCommand
import ai.donna.android.protocol.DonnaMotionCommand
import ai.donna.android.protocol.DonnaNotificationsCommand
import ai.donna.android.protocol.DonnaPhotosCommand
import ai.donna.android.protocol.DonnaScreenCommand
import ai.donna.android.protocol.DonnaSmsCommand
import ai.donna.android.protocol.DonnaSystemCommand

data class NodeRuntimeFlags(
  val cameraEnabled: Boolean,
  val locationEnabled: Boolean,
  val smsAvailable: Boolean,
  val voiceWakeEnabled: Boolean,
  val motionActivityAvailable: Boolean,
  val motionPedometerAvailable: Boolean,
  val debugBuild: Boolean,
)

enum class InvokeCommandAvailability {
  Always,
  CameraEnabled,
  LocationEnabled,
  SmsAvailable,
  MotionActivityAvailable,
  MotionPedometerAvailable,
  DebugBuild,
}

enum class NodeCapabilityAvailability {
  Always,
  CameraEnabled,
  LocationEnabled,
  SmsAvailable,
  VoiceWakeEnabled,
  MotionAvailable,
}

data class NodeCapabilitySpec(
  val name: String,
  val availability: NodeCapabilityAvailability = NodeCapabilityAvailability.Always,
)

data class InvokeCommandSpec(
  val name: String,
  val requiresForeground: Boolean = false,
  val availability: InvokeCommandAvailability = InvokeCommandAvailability.Always,
)

object InvokeCommandRegistry {
  val capabilityManifest: List<NodeCapabilitySpec> =
    listOf(
      NodeCapabilitySpec(name = DonnaCapability.Canvas.rawValue),
      NodeCapabilitySpec(name = DonnaCapability.Screen.rawValue),
      NodeCapabilitySpec(name = DonnaCapability.Device.rawValue),
      NodeCapabilitySpec(name = DonnaCapability.Notifications.rawValue),
      NodeCapabilitySpec(name = DonnaCapability.System.rawValue),
      NodeCapabilitySpec(name = DonnaCapability.AppUpdate.rawValue),
      NodeCapabilitySpec(
        name = DonnaCapability.Camera.rawValue,
        availability = NodeCapabilityAvailability.CameraEnabled,
      ),
      NodeCapabilitySpec(
        name = DonnaCapability.Sms.rawValue,
        availability = NodeCapabilityAvailability.SmsAvailable,
      ),
      NodeCapabilitySpec(
        name = DonnaCapability.VoiceWake.rawValue,
        availability = NodeCapabilityAvailability.VoiceWakeEnabled,
      ),
      NodeCapabilitySpec(
        name = DonnaCapability.Location.rawValue,
        availability = NodeCapabilityAvailability.LocationEnabled,
      ),
      NodeCapabilitySpec(name = DonnaCapability.Photos.rawValue),
      NodeCapabilitySpec(name = DonnaCapability.Contacts.rawValue),
      NodeCapabilitySpec(name = DonnaCapability.Calendar.rawValue),
      NodeCapabilitySpec(
        name = DonnaCapability.Motion.rawValue,
        availability = NodeCapabilityAvailability.MotionAvailable,
      ),
    )

  val all: List<InvokeCommandSpec> =
    listOf(
      InvokeCommandSpec(
        name = DonnaCanvasCommand.Present.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = DonnaCanvasCommand.Hide.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = DonnaCanvasCommand.Navigate.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = DonnaCanvasCommand.Eval.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = DonnaCanvasCommand.Snapshot.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = DonnaCanvasA2UICommand.Push.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = DonnaCanvasA2UICommand.PushJSONL.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = DonnaCanvasA2UICommand.Reset.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = DonnaScreenCommand.Record.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = DonnaSystemCommand.Notify.rawValue,
      ),
      InvokeCommandSpec(
        name = DonnaCameraCommand.List.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = DonnaCameraCommand.Snap.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = DonnaCameraCommand.Clip.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = DonnaLocationCommand.Get.rawValue,
        availability = InvokeCommandAvailability.LocationEnabled,
      ),
      InvokeCommandSpec(
        name = DonnaDeviceCommand.Status.rawValue,
      ),
      InvokeCommandSpec(
        name = DonnaDeviceCommand.Info.rawValue,
      ),
      InvokeCommandSpec(
        name = DonnaDeviceCommand.Permissions.rawValue,
      ),
      InvokeCommandSpec(
        name = DonnaDeviceCommand.Health.rawValue,
      ),
      InvokeCommandSpec(
        name = DonnaNotificationsCommand.List.rawValue,
      ),
      InvokeCommandSpec(
        name = DonnaNotificationsCommand.Actions.rawValue,
      ),
      InvokeCommandSpec(
        name = DonnaPhotosCommand.Latest.rawValue,
      ),
      InvokeCommandSpec(
        name = DonnaContactsCommand.Search.rawValue,
      ),
      InvokeCommandSpec(
        name = DonnaContactsCommand.Add.rawValue,
      ),
      InvokeCommandSpec(
        name = DonnaCalendarCommand.Events.rawValue,
      ),
      InvokeCommandSpec(
        name = DonnaCalendarCommand.Add.rawValue,
      ),
      InvokeCommandSpec(
        name = DonnaMotionCommand.Activity.rawValue,
        availability = InvokeCommandAvailability.MotionActivityAvailable,
      ),
      InvokeCommandSpec(
        name = DonnaMotionCommand.Pedometer.rawValue,
        availability = InvokeCommandAvailability.MotionPedometerAvailable,
      ),
      InvokeCommandSpec(
        name = DonnaSmsCommand.Send.rawValue,
        availability = InvokeCommandAvailability.SmsAvailable,
      ),
      InvokeCommandSpec(
        name = "debug.logs",
        availability = InvokeCommandAvailability.DebugBuild,
      ),
      InvokeCommandSpec(
        name = "debug.ed25519",
        availability = InvokeCommandAvailability.DebugBuild,
      ),
      InvokeCommandSpec(name = "app.update"),
    )

  private val byNameInternal: Map<String, InvokeCommandSpec> = all.associateBy { it.name }

  fun find(command: String): InvokeCommandSpec? = byNameInternal[command]

  fun advertisedCapabilities(flags: NodeRuntimeFlags): List<String> {
    return capabilityManifest
      .filter { spec ->
        when (spec.availability) {
          NodeCapabilityAvailability.Always -> true
          NodeCapabilityAvailability.CameraEnabled -> flags.cameraEnabled
          NodeCapabilityAvailability.LocationEnabled -> flags.locationEnabled
          NodeCapabilityAvailability.SmsAvailable -> flags.smsAvailable
          NodeCapabilityAvailability.VoiceWakeEnabled -> flags.voiceWakeEnabled
          NodeCapabilityAvailability.MotionAvailable -> flags.motionActivityAvailable || flags.motionPedometerAvailable
        }
      }
      .map { it.name }
  }

  fun advertisedCommands(flags: NodeRuntimeFlags): List<String> {
    return all
      .filter { spec ->
        when (spec.availability) {
          InvokeCommandAvailability.Always -> true
          InvokeCommandAvailability.CameraEnabled -> flags.cameraEnabled
          InvokeCommandAvailability.LocationEnabled -> flags.locationEnabled
          InvokeCommandAvailability.SmsAvailable -> flags.smsAvailable
          InvokeCommandAvailability.MotionActivityAvailable -> flags.motionActivityAvailable
          InvokeCommandAvailability.MotionPedometerAvailable -> flags.motionPedometerAvailable
          InvokeCommandAvailability.DebugBuild -> flags.debugBuild
        }
      }
      .map { it.name }
  }
}
