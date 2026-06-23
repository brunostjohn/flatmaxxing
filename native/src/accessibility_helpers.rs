use axuielement::{
  ax_attribute::attributes::{
    AX_DESCRIPTION_ATTRIBUTE, AX_IDENTIFIER_ATTRIBUTE, AX_POSITION_ATTRIBUTE, AX_ROLE_ATTRIBUTE,
    AX_SIZE_ATTRIBUTE, AX_TITLE_ATTRIBUTE, AX_VALUE_ATTRIBUTE,
  },
  AXError, AXUIElement,
};

use crate::structs::{AxElementInfo, AxQuery, Frame, Titles};

pub fn string_attr(element: &AXUIElement, name: &str) -> Option<String> {
  element.string_attribute(name).ok().flatten()
}

pub fn role(element: &AXUIElement) -> Option<String> {
  string_attr(element, AX_ROLE_ATTRIBUTE)
}

pub fn identifier(element: &AXUIElement) -> Option<String> {
  string_attr(element, AX_IDENTIFIER_ATTRIBUTE)
}

pub fn titles(element: &AXUIElement) -> Titles {
  let title = string_attr(element, AX_TITLE_ATTRIBUTE);
  let description = string_attr(element, AX_DESCRIPTION_ATTRIBUTE);
  let value = string_attr(element, AX_VALUE_ATTRIBUTE);

  Titles {
    title,
    description,
    value,
  }
}

pub fn actions(element: &AXUIElement) -> Result<Vec<String>, AXError> {
  element.action_names()
}

pub fn frame(element: &AXUIElement) -> Result<Option<Frame>, AXError> {
  let position = element
    .point_attribute(AX_POSITION_ATTRIBUTE)?
    .ok_or(AXError::NoValue)?;
  let size = element
    .size_attribute(AX_SIZE_ATTRIBUTE)?
    .ok_or(AXError::NoValue)?;

  Ok(Some(Frame {
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
  }))
}

pub fn matches_query(element: &AXUIElement, query: &AxQuery) -> bool {
  query_matches_values(
    query,
    role(element).as_deref(),
    identifier(element).as_deref(),
    &titles(element),
  )
}

pub fn query_matches_values(
  query: &AxQuery,
  actual_role: Option<&str>,
  actual_id: Option<&str>,
  actual_titles: &Titles,
) -> bool {
  if let Some(expected_role) = query.role.as_deref() {
    if actual_role != Some(expected_role) {
      return false;
    }
  }

  if let Some(expected_id) = query.id.as_deref() {
    if actual_id != Some(expected_id) {
      return false;
    }
  }

  if let Some(expected_title) = query.title.as_deref() {
    if actual_titles.title.as_deref() != Some(expected_title) {
      return false;
    }
  }

  if let Some(title_contains) = query.title_contains.as_deref() {
    return [
      actual_titles.title.as_deref(),
      actual_titles.description.as_deref(),
      actual_titles.value.as_deref(),
    ]
    .into_iter()
    .flatten()
    .any(|title| title.contains(title_contains));
  }

  true
}

fn descendants(root: AXUIElement) -> impl Iterator<Item = AXUIElement> {
  let mut stack = vec![root];

  std::iter::from_fn(move || {
    let element = stack.pop()?;

    if let Ok(children) = element.children() {
      stack.extend(children);
    }

    Some(element)
  })
}

pub fn resolve_matches(
  pid: i32,
  query: &AxQuery,
) -> Option<impl Iterator<Item = AXUIElement> + use<'_>> {
  let app = AXUIElement::from_pid(pid)?;

  let scope = match query.under_title.as_deref() {
    Some(expected_title) => descendants(app).find(|element| {
      let Titles {
        title,
        description,
        value,
      } = titles(element);

      matches!(title, Some(title) if title == expected_title)
        || matches!(description, Some(description) if description == expected_title)
        || matches!(value, Some(value) if value == expected_title)
    }),

    None => Some(app),
  };

  Some(
    scope
      .into_iter()
      .flat_map(descendants)
      .filter(move |element| matches_query(element, query)),
  )
}

pub fn nth_index(query: &AxQuery) -> Option<usize> {
  query
    .nth
    .unwrap_or(1)
    .checked_sub(1)
    .map(|nth| nth as usize)
}

pub fn nth_match(pid: i32, query: &AxQuery) -> Option<AXUIElement> {
  resolve_matches(pid, query)?.nth(nth_index(query)?)
}

pub fn successful_values<T, E>(items: impl IntoIterator<Item = Result<T, E>>) -> Vec<T> {
  items.into_iter().filter_map(Result::ok).collect()
}

pub fn element_info(element: &AXUIElement) -> Result<AxElementInfo, AXError> {
  let Frame {
    x,
    y,
    width,
    height,
  } = frame(element)?.ok_or(AXError::NoValue)?;

  Ok(AxElementInfo {
    role: role(element),
    titles: titles(element),
    id: identifier(element),
    acts: actions(element).unwrap_or_default(),
    x,
    y,
    w: width,
    h: height,
    cx: x + width / 2.0,
    cy: y + height / 2.0,
  })
}

#[cfg(test)]
mod tests {
  use super::{nth_index, query_matches_values, successful_values};
  use crate::structs::{AxQuery, Titles};

  fn query() -> AxQuery {
    AxQuery {
      role: None,
      title: None,
      id: None,
      under_title: None,
      title_contains: None,
      nth: None,
    }
  }

  fn titles(title: Option<&str>, description: Option<&str>, value: Option<&str>) -> Titles {
    Titles {
      title: title.map(String::from),
      description: description.map(String::from),
      value: value.map(String::from),
    }
  }

  #[test]
  fn query_fields_are_positive_constraints() {
    let mut q = query();
    q.role = Some("AXButton".to_string());
    q.id = Some("OKButton".to_string());
    q.title = Some("Save".to_string());

    assert!(query_matches_values(
      &q,
      Some("AXButton"),
      Some("OKButton"),
      &titles(Some("Save"), None, None)
    ));
    assert!(!query_matches_values(
      &q,
      Some("AXStaticText"),
      Some("OKButton"),
      &titles(Some("Save"), None, None)
    ));
    assert!(!query_matches_values(
      &q,
      Some("AXButton"),
      Some("CancelButton"),
      &titles(Some("Save"), None, None)
    ));
    assert!(!query_matches_values(
      &q,
      Some("AXButton"),
      Some("OKButton"),
      &titles(Some("Cancel"), None, None)
    ));
  }

  #[test]
  fn title_contains_checks_all_title_slots() {
    let mut q = query();
    q.title_contains = Some("Tool".to_string());

    assert!(query_matches_values(
      &q,
      None,
      None,
      &titles(None, Some("Tool Magazine"), None)
    ));
    assert!(query_matches_values(
      &q,
      None,
      None,
      &titles(None, None, Some("Choose Tool"))
    ));
    assert!(!query_matches_values(
      &q,
      None,
      None,
      &titles(Some("Project"), Some("Dialog"), None)
    ));
  }

  #[test]
  fn nth_defaults_to_first_match_and_rejects_zero() {
    let mut q = query();
    assert_eq!(nth_index(&q), Some(0));

    q.nth = Some(3);
    assert_eq!(nth_index(&q), Some(2));

    q.nth = Some(0);
    assert_eq!(nth_index(&q), None);
  }

  #[test]
  fn successful_values_drops_only_failed_entries() {
    let values = successful_values([Ok(1), Err("bad frame"), Ok(3)]);
    assert_eq!(values, vec![1, 3]);
  }
}
