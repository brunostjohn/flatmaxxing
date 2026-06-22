use std::{cmp::max, time::Duration};

use axuielement::ax_action::{AX_PICK_ACTION, AX_SHOW_MENU_ACTION};
use napi_derive::napi;

use crate::{
  accessibility::ax_find,
  accessibility_helpers::{element_info, nth_match},
  mouse::{mouse_click, mouse_double_click, mouse_right_click},
  structs::{AxElementInfo, AxQuery, MousePos, WaitOptions},
};

#[napi(js_name = "showMenu")]
pub fn show_menu(pid: i32, query: AxQuery) -> Result<(), napi::Error> {
  let element = nth_match(pid, &query).ok_or(napi::Error::from_reason("no element found"))?;

  element
    .perform_action(AX_SHOW_MENU_ACTION)
    .map_err(|e| napi::Error::from_reason(e.to_string()))
}

#[napi(js_name = "pickElement")]
pub fn pick_element(pid: i32, query: AxQuery) -> Result<(), napi::Error> {
  let element = nth_match(pid, &query).ok_or(napi::Error::from_reason("no element found"))?;

  element
    .perform_action(AX_PICK_ACTION)
    .map_err(|e| napi::Error::from_reason(e.to_string()))
}

#[napi(js_name = "scrollToVisible")]
pub fn scroll_to_visible(pid: i32, query: AxQuery) -> Result<(), napi::Error> {
  let element = nth_match(pid, &query).ok_or(napi::Error::from_reason("no element found"))?;

  element
    .perform_action("AXScrollToVisible")
    .map_err(|e| napi::Error::from_reason(e.to_string()))
}

#[napi(js_name = "findElement")]
pub fn find_element(pid: i32, query: AxQuery) -> Result<AxElementInfo, napi::Error> {
  let element = nth_match(pid, &query).ok_or(napi::Error::from_reason("no element found"))?;

  element_info(&element).map_err(|e| napi::Error::from_reason(e.to_string()))
}

#[napi(js_name = "elementExists")]
pub fn element_exists(pid: i32, query: AxQuery) -> bool {
  let element = nth_match(pid, &query);

  element.is_some()
}

#[napi(js_name = "clickElement")]
pub async fn click_element(pid: i32, query: AxQuery) -> Result<(), napi::Error> {
  let element = nth_match(pid, &query).ok_or(napi::Error::from_reason("no element found"))?;
  let element_info = element_info(&element).map_err(|e| napi::Error::from_reason(e.to_string()))?;

  mouse_click(MousePos {
    x: element_info.cx,
    y: element_info.cy,
  })
  .await
}

#[napi(js_name = "doubleClickElement")]
pub async fn double_click_element(pid: i32, query: AxQuery) -> Result<(), napi::Error> {
  let element = nth_match(pid, &query).ok_or(napi::Error::from_reason("no element found"))?;
  let element_info = element_info(&element).map_err(|e| napi::Error::from_reason(e.to_string()))?;

  mouse_double_click(MousePos {
    x: element_info.cx,
    y: element_info.cy,
  })
  .await
}

#[napi(js_name = "rightClickElement")]
pub async fn right_click_element(pid: i32, query: AxQuery) -> Result<(), napi::Error> {
  let element = nth_match(pid, &query).ok_or(napi::Error::from_reason("no element found"))?;
  let element_info = element_info(&element).map_err(|e| napi::Error::from_reason(e.to_string()))?;

  mouse_right_click(MousePos {
    x: element_info.cx,
    y: element_info.cy,
  })
  .await
}

#[napi(js_name = "waitForElement")]
pub async fn wait_for_element(
  pid: i32,
  query: AxQuery,
  opts: Option<WaitOptions>,
) -> Result<(), napi::Error> {
  let WaitOptions {
    timeout_ms,
    every_ms,
  } = opts.unwrap_or(WaitOptions {
    every_ms: Some(200),
    timeout_ms: Some(10_000),
  });

  let timeout_ms = timeout_ms.unwrap_or(10_000);
  let every_ms = every_ms.unwrap_or(200);

  let attempts = max(1, timeout_ms.div_ceil(every_ms));

  let nth_index = query.nth.unwrap_or(1) - 1;

  for _ in 0..attempts {
    let elements = ax_find(pid, query.clone()).unwrap_or_default();
    if elements.get(nth_index as usize).is_some() {
      return Ok(());
    }

    tokio::time::sleep(Duration::from_millis(every_ms as u64)).await;
  }

  Err(napi::Error::from_reason(format!(
    "timed out ({timeout_ms}ms) waiting for {}",
    serde_json::to_string(&query).unwrap_or_default()
  )))
}

#[napi(js_name = "waitForGone")]
pub async fn wait_for_gone(
  pid: i32,
  query: AxQuery,
  opts: Option<WaitOptions>,
) -> Result<(), napi::Error> {
  let WaitOptions {
    timeout_ms,
    every_ms,
  } = opts.unwrap_or(WaitOptions {
    every_ms: Some(200),
    timeout_ms: Some(10_000),
  });

  let timeout_ms = timeout_ms.unwrap_or(10_000);
  let every_ms = every_ms.unwrap_or(200);

  let attempts = max(1, timeout_ms.div_ceil(every_ms));

  let nth_index = query.nth.unwrap_or(1) - 1;

  for _ in 0..attempts {
    let elements = ax_find(pid, query.clone()).unwrap_or_default();
    if elements.get(nth_index as usize).is_none() {
      return Ok(());
    }

    tokio::time::sleep(Duration::from_millis(every_ms as u64)).await;
  }

  Err(napi::Error::from_reason(format!(
    "timed out ({timeout_ms}ms) waiting for {}",
    serde_json::to_string(&query).unwrap_or_default()
  )))
}
