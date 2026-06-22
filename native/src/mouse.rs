use std::time::Duration;

use core_graphics::event::{
  CGEvent, CGEventTapLocation, CGEventType, CGMouseButton, ScrollEventUnit,
};
use napi_derive::napi;

use crate::mouse_helpers::{event_source, mouse_click_raw, post_mouse, send_mouse_event};
use crate::structs::MousePos;

#[napi(js_name = "mousePos")]
pub fn mouse_pos() -> Result<MousePos, napi::Error> {
  let source = event_source()?;
  let event = CGEvent::new(source)
    .map_err(|_| napi::Error::from_reason("failed to create event".to_string()))?;

  let pos = event.location();

  Ok(MousePos { x: pos.x, y: pos.y })
}

#[napi(js_name = "mouseMove")]
pub fn mouse_move(pos: MousePos) -> Result<(), napi::Error> {
  post_mouse(&pos, CGEventType::MouseMoved, CGMouseButton::Left)
}

#[napi(js_name = "mouseClick")]
pub async fn mouse_click(pos: MousePos) -> Result<(), napi::Error> {
  mouse_click_raw(
    &pos,
    CGMouseButton::Left,
    CGEventType::LeftMouseDown,
    CGEventType::LeftMouseUp,
  )
  .await
}

#[napi(js_name = "mouseRightClick")]
pub async fn mouse_right_click(pos: MousePos) -> Result<(), napi::Error> {
  mouse_click_raw(
    &pos,
    CGMouseButton::Right,
    CGEventType::RightMouseDown,
    CGEventType::RightMouseUp,
  )
  .await
}

#[napi(js_name = "mouseDoubleClick")]
pub async fn mouse_double_click(pos: MousePos) -> Result<(), napi::Error> {
  send_mouse_event(&pos, CGEventType::LeftMouseDown, 1)?;
  send_mouse_event(&pos, CGEventType::LeftMouseUp, 1)?;
  tokio::time::sleep(Duration::from_millis(40)).await;
  send_mouse_event(&pos, CGEventType::LeftMouseDown, 2)?;
  send_mouse_event(&pos, CGEventType::LeftMouseUp, 2)?;

  Ok(())
}

#[napi(js_name = "mouseScroll")]
pub async fn mouse_scroll(pos: MousePos, lines: i32) -> Result<(), napi::Error> {
  mouse_move(MousePos { x: pos.x, y: pos.y })?;

  tokio::time::sleep(Duration::from_millis(10)).await;

  let source = event_source()?;

  let event = CGEvent::new_scroll_event(source, ScrollEventUnit::LINE, 1, lines, 0, 0)
    .map_err(|_| napi::Error::from_reason("failed to create scroll event".to_string()))?;

  event.post(CGEventTapLocation::HID);

  Ok(())
}
