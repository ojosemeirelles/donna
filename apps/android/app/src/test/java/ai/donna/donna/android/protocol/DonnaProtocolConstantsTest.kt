package ai.donna.android.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class DonnaProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", DonnaCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", DonnaCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", DonnaCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", DonnaCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", DonnaCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", DonnaCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", DonnaCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", DonnaCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", DonnaCapability.Canvas.rawValue)
    assertEquals("camera", DonnaCapability.Camera.rawValue)
    assertEquals("screen", DonnaCapability.Screen.rawValue)
    assertEquals("voiceWake", DonnaCapability.VoiceWake.rawValue)
    assertEquals("location", DonnaCapability.Location.rawValue)
    assertEquals("sms", DonnaCapability.Sms.rawValue)
    assertEquals("device", DonnaCapability.Device.rawValue)
    assertEquals("notifications", DonnaCapability.Notifications.rawValue)
    assertEquals("system", DonnaCapability.System.rawValue)
    assertEquals("appUpdate", DonnaCapability.AppUpdate.rawValue)
    assertEquals("photos", DonnaCapability.Photos.rawValue)
    assertEquals("contacts", DonnaCapability.Contacts.rawValue)
    assertEquals("calendar", DonnaCapability.Calendar.rawValue)
    assertEquals("motion", DonnaCapability.Motion.rawValue)
  }

  @Test
  fun cameraCommandsUseStableStrings() {
    assertEquals("camera.list", DonnaCameraCommand.List.rawValue)
    assertEquals("camera.snap", DonnaCameraCommand.Snap.rawValue)
    assertEquals("camera.clip", DonnaCameraCommand.Clip.rawValue)
  }

  @Test
  fun screenCommandsUseStableStrings() {
    assertEquals("screen.record", DonnaScreenCommand.Record.rawValue)
  }

  @Test
  fun notificationsCommandsUseStableStrings() {
    assertEquals("notifications.list", DonnaNotificationsCommand.List.rawValue)
    assertEquals("notifications.actions", DonnaNotificationsCommand.Actions.rawValue)
  }

  @Test
  fun deviceCommandsUseStableStrings() {
    assertEquals("device.status", DonnaDeviceCommand.Status.rawValue)
    assertEquals("device.info", DonnaDeviceCommand.Info.rawValue)
    assertEquals("device.permissions", DonnaDeviceCommand.Permissions.rawValue)
    assertEquals("device.health", DonnaDeviceCommand.Health.rawValue)
  }

  @Test
  fun systemCommandsUseStableStrings() {
    assertEquals("system.notify", DonnaSystemCommand.Notify.rawValue)
  }

  @Test
  fun photosCommandsUseStableStrings() {
    assertEquals("photos.latest", DonnaPhotosCommand.Latest.rawValue)
  }

  @Test
  fun contactsCommandsUseStableStrings() {
    assertEquals("contacts.search", DonnaContactsCommand.Search.rawValue)
    assertEquals("contacts.add", DonnaContactsCommand.Add.rawValue)
  }

  @Test
  fun calendarCommandsUseStableStrings() {
    assertEquals("calendar.events", DonnaCalendarCommand.Events.rawValue)
    assertEquals("calendar.add", DonnaCalendarCommand.Add.rawValue)
  }

  @Test
  fun motionCommandsUseStableStrings() {
    assertEquals("motion.activity", DonnaMotionCommand.Activity.rawValue)
    assertEquals("motion.pedometer", DonnaMotionCommand.Pedometer.rawValue)
  }
}
