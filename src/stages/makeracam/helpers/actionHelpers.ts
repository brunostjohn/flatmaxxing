import type { Titles } from "@flatmaxxing/accessibility";

export const titleValues = (titles: Titles) =>
  [titles.title, titles.description, titles.value].flatMap((title) =>
    title !== undefined && title.length > 0 ? [title] : [],
  );

export const layerTitleKey = (titles: Titles) =>
  titleValues(titles).join("\u0000");

export const layerTitleMatchesStem = (titles: Titles, stem: string) =>
  titleValues(titles).some((title) => title.includes(stem));

export const layerSelectorFor = (titles: Titles, stem: string) => {
  const values = titleValues(titles);
  return values.find((value) => value.includes(stem)) ?? values[0] ?? stem;
};

export type TabControlVisibility = "missing" | "visible" | "outside";

export const tabControlVisibility = (
  element: { readonly cy: number } | undefined,
  bandTop: number,
  bandBottom: number,
) => {
  if (element === undefined) return "missing";
  return element.cy >= bandTop && element.cy <= bandBottom
    ? "visible"
    : "outside";
};
