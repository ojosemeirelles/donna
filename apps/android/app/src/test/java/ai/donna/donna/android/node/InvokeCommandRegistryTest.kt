package ai.donna.android.node

import ai.donna.android.protocol.DonnaCalendarCommand
import ai.donna.android.protocol.DonnaCameraCommand
import ai.donna.android.protocol.DonnaCapability
import ai.donna.android.protocol.DonnaContactsCommand
import ai.donna.android.protocol.DonnaDeviceCommand
import ai.donna.android.protocol.DonnaLocationCommand
import ai.donna.android.protocol.DonnaMotionCommand
import ai.donna.android.protocol.DonnaNotificationsCommand
import ai.donna.android.protocol.DonnaPhotosCommand
import ai.donna.android.protocol.DonnaSmsCommand
import ai.donna.android.protocol.DonnaSystemCommand
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class InvokeCommandRegistryTest {
  private val coreCapabilities =
    setOf(
      DonnaCapability.Canvas.rawValue,
      DonnaCapability.Screen.rawValue,
      DonnaCapability.Device.rawValue,
      DonnaCapability.Notifications.rawValue,
      DonnaCapability.System.rawValue,
      DonnaCapability.AppUpdate.rawValue,
      DonnaCapability.Photos.rawValue,
      DonnaCapability.Contacts.rawValue,
      DonnaCapability.Calendar.rawValue,
    )

  private val optionalCapabilities =
    setOf(
      DonnaCapability.Camera.rawValue,
      DonnaCapability.Location.rawValue,
      DonnaCapability.Sms.rawValue,
      DonnaCapability.VoiceWake.rawValue,
      DonnaCapability.Motion.rawValue,
    )

  private val coreCommands =
    setOf(
      DonnaDeviceCommand.Status.rawValue,
      DonnaDeviceCommand.Info.rawValue,
      DonnaDeviceCommand.Permissions.rawValue,
      DonnaDeviceCommand.Health.rawValue,
      DonnaNotificationsCommand.List.rawValue,
      DonnaNotificationsCommand.Actions.rawValue,
      DonnaSystemCommand.Notify.rawValue,
      DonnaPhotosCommand.Latest.rawValue,
      DonnaContactsCommand.Search.rawValue,
      DonnaContactsCommand.Add.rawValue,
      DonnaCalendarCommand.Events.rawValue,
      DonnaCalendarCommand.Add.rawValue,
      "app.update",
    )

  private val optionalCommands =
    setOf(
      DonnaCameraCommand.Snap.rawValue,
      DonnaCameraCommand.Clip.rawValue,
      DonnaCameraCommand.List.rawValue,
      DonnaLocationCommand.Get.rawValue,
      DonnaMotionCommand.Activity.rawValue,
      DonnaMotionCommand.Pedometer.rawValue,
      DonnaSmsCommand.Send.rawValue,
    )

  private val debugCommands = setOf("debug.logs", "debug.ed25519")

  @Test
  fun advertisedCapabilities_respectsFeatureAvailability() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags())

    assertContainsAll(capabilities, coreCapabilities)
    assertMissingAll(capabilities, optionalCapabilities)
  }

  @Test
  fun advertisedCapabilities_includesFeatureCapabilitiesWhenEnabled() {
    val capabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          smsAvailable = true,
          voiceWakeEnabled = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
        ),
      )

    assertContainsAll(capabilities, coreCapabilities + optionalCapabilities)
  }

  @Test
  fun advertisedCommands_respectsFeatureAvailability() {
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags())

    assertContainsAll(commands, coreCommands)
    assertMissingAll(commands, optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_includesFeatureCommandsWhenEnabled() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          smsAvailable = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
          debugBuild = true,
        ),
      )

    assertContainsAll(commands, coreCommands + optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_onlyIncludesSupportedMotionCommands() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        NodeRuntimeFlags(
          cameraEnabled = false,
          locationEnabled = false,
          smsAvailable = false,
          voiceWakeEnabled = false,
          motionActivityAvailable = true,
          motionPedometerAvailable = false,
          debugBuild = false,
        ),
      )

    assertTrue(commands.contains(DonnaMotionCommand.Activity.rawValue))
    assertFalse(commands.contains(DonnaMotionCommand.Pedometer.rawValue))
  }

  private fun defaultFlags(
    cameraEnabled: Boolean = false,
    locationEnabled: Boolean = false,
    smsAvailable: Boolean = false,
    voiceWakeEnabled: Boolean = false,
    motionActivityAvailable: Boolean = false,
    motionPedometerAvailable: Boolean = false,
    debugBuild: Boolean = false,
  ): NodeRuntimeFlags =
    NodeRuntimeFlags(
      cameraEnabled = cameraEnabled,
      locationEnabled = locationEnabled,
      smsAvailable = smsAvailable,
      voiceWakeEnabled = voiceWakeEnabled,
      motionActivityAvailable = motionActivityAvailable,
      motionPedometerAvailable = motionPedometerAvailable,
      debugBuild = debugBuild,
    )

  private fun assertContainsAll(actual: List<String>, expected: Set<String>) {
    expected.forEach { value -> assertTrue(actual.contains(value)) }
  }

  private fun assertMissingAll(actual: List<String>, forbidden: Set<String>) {
    forbidden.forEach { value -> assertFalse(actual.contains(value)) }
  }
}
