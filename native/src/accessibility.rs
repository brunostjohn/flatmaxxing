use axuielement::ax_action::AX_PRESS_ACTION;
use axuielement::ax_attribute::AX_VALUE_ATTRIBUTE;
use napi_derive::napi;

use crate::accessibility_helpers::{actions, element_info, nth_match, resolve_matches};
use crate::structs::{AxElementInfo, AxQuery};

#[napi(js_name = "axFind")]
pub fn ax_find(pid: i32, query: AxQuery) -> Option<Vec<AxElementInfo>> {
  resolve_matches(pid, &query)?
    .map(|element| element_info(&element).ok())
    .collect()
}

#[napi(js_name = "axPress")]
pub fn ax_press(pid: i32, query: AxQuery) -> Result<(), napi::Error> {
  let element = nth_match(pid, &query).ok_or(napi::Error::from_reason("no element found"))?;

  element
    .perform_action(AX_PRESS_ACTION)
    .map_err(|e| napi::Error::from_reason(e.to_string()))
}

#[napi(js_name = "axPerformAction")]
pub fn ax_perform_action(pid: i32, query: AxQuery, action: String) -> Result<(), napi::Error> {
  let element = nth_match(pid, &query).ok_or(napi::Error::from_reason("no element found"))?;

  element
    .perform_action(&action)
    .map_err(|e| napi::Error::from_reason(e.to_string()))
}

#[napi(js_name = "axActions")]
pub fn ax_actions(pid: i32, query: AxQuery) -> Result<Vec<String>, napi::Error> {
  nth_match(pid, &query)
    .ok_or(napi::Error::from_reason("no element found"))
    .and_then(|element| actions(&element).map_err(|e| napi::Error::from_reason(e.to_string())))
}

#[napi(js_name = "axSetValue")]
pub fn ax_set_value(pid: i32, query: AxQuery, value: String) -> Result<(), napi::Error> {
  let element = nth_match(pid, &query).ok_or(napi::Error::from_reason("no element found"))?;

  element
    .set_string_attribute(AX_VALUE_ATTRIBUTE, &value)
    .map_err(|e| napi::Error::from_reason(e.to_string()))
}
