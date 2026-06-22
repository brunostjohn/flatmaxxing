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
  if matches!(query.role.as_ref(), maybe_role if maybe_role == role(element).as_ref()) {
    return false;
  }

  if matches!(query.id.as_ref(), maybe_id if maybe_id == identifier(element).as_ref()) {
    return false;
  }
  if matches!(query.title.as_ref(), maybe_title if maybe_title == titles(element).title.as_ref()) {
    return false;
  }

  let Titles {
    title,
    description,
    value,
  } = titles(element);

  if let Some(title_contains) = query.title_contains.clone() {
    return !(matches!(title, Some(title) if title.contains(&title_contains))
      || matches!(description, Some(description) if description.contains(&title_contains))
      || matches!(value, Some(value) if value.contains(&title_contains)));
  }

  true
}

fn descendants(root: AXUIElement) -> impl Iterator<Item = AXUIElement> {
  let mut stack = vec![root];

  std::iter::from_fn(move || {
    let element = stack.pop()?;

    stack.extend(element.children().ok()?);

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

pub fn nth_match(pid: i32, query: &AxQuery) -> Option<AXUIElement> {
  let nth = query.nth?;
  if nth == 0 {
    return None;
  }

  resolve_matches(pid, query)?.nth((nth - 1) as usize)
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
    acts: actions(element)?,
    x,
    y,
    w: width,
    h: height,
    cx: x + width / 2.0,
    cy: y + height / 2.0,
  })
}
