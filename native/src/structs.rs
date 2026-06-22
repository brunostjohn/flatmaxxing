use napi_derive::napi;

#[napi(object)]
#[derive(Debug, Clone)]
pub struct AxQuery {
  pub role: Option<String>,
  pub title: Option<String>,
  pub id: Option<String>,
  #[napi(js_name = "underTitle")]
  pub under_title: Option<String>,
  #[napi(js_name = "titleContains")]
  pub title_contains: Option<String>,
  pub nth: Option<u32>,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct AxElementInfo {
  pub role: Option<String>,
  pub titles: Titles,
  pub id: Option<String>,
  pub acts: Vec<String>,

  pub x: f64,
  pub y: f64,
  pub w: f64,
  pub h: f64,
  pub cx: f64,
  pub cy: f64,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct AxTrustedOptions {
  pub prompt: Option<bool>,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct MousePos {
  pub x: i32,
  pub y: i32,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct Titles {
  pub title: Option<String>,
  pub description: Option<String>,
  pub value: Option<String>,
}

pub struct Frame {
  pub x: f64,
  pub y: f64,
  pub width: f64,
  pub height: f64,
}
