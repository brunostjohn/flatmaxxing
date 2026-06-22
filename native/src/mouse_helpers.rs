use std::time::Duration;

use core_graphics::{
  display::CGPoint,
  event::{CGEvent, CGEventTapLocation, CGEventType, CGMouseButton, EventField},
  event_source::{CGEventSource, CGEventSourceStateID},
};

use crate::structs::MousePos;

pub fn send_mouse_event(
  pos: &MousePos,
  event_type: CGEventType,
  click_state: i64,
) -> Result<(), napi::Error> {
  let event = mouse_event(pos, event_type, CGMouseButton::Left)?;

  event.set_integer_value_field(EventField::MOUSE_EVENT_CLICK_STATE, click_state);
  event.post(CGEventTapLocation::HID);

  Ok(())
}

pub fn event_source() -> Result<CGEventSource, napi::Error> {
  CGEventSource::new(CGEventSourceStateID::HIDSystemState)
    .map_err(|_| napi::Error::from_reason("failed to create event source".to_string()))
}

fn point(pos: &MousePos) -> CGPoint {
  CGPoint::new(pos.x, pos.y)
}

pub fn mouse_event(
  pos: &MousePos,
  mouse_type: CGEventType,
  button: CGMouseButton,
) -> Result<CGEvent, napi::Error> {
  CGEvent::new_mouse_event(event_source()?, mouse_type, point(pos), button)
    .map_err(|_| napi::Error::from_reason("failed to create mouse event".to_string()))
}

pub fn post_mouse(
  pos: &MousePos,
  mouse_type: CGEventType,
  button: CGMouseButton,
) -> Result<(), napi::Error> {
  let event = mouse_event(pos, mouse_type, button)?;

  event.post(CGEventTapLocation::HID);

  Ok(())
}

pub async fn mouse_click_raw(
  pos: &MousePos,
  button: CGMouseButton,
  down: CGEventType,
  up: CGEventType,
) -> Result<(), napi::Error> {
  post_mouse(pos, down, button)?;
  tokio::time::sleep(Duration::from_millis(20)).await;
  post_mouse(pos, up, button)?;

  Ok(())
}
