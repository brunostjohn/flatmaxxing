use axuielement::{is_process_trusted, is_process_trusted_with_options, ProcessTrustOptions};
use napi_derive::napi;

#[napi(js_name = "axTrusted")]
pub fn ax_trusted() -> bool {
  is_process_trusted()
}

#[napi(js_name = "axRequestTrusted")]
pub fn ax_request_trusted() -> bool {
  is_process_trusted_with_options(ProcessTrustOptions { prompt: true })
}

#[napi(js_name = "screenCaptureAccess")]
pub fn screen_capture_access() -> bool {
  core_graphics::access::ScreenCaptureAccess.request()
}

#[napi(js_name = "screenCaptureGranted")]
pub fn screen_capture_granted() -> bool {
  core_graphics::access::ScreenCaptureAccess.preflight()
}
