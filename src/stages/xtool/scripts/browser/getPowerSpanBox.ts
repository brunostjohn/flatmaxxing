export const getPowerSpanBox = `
(() => {
  const powerSpan = [...document.querySelectorAll("span")].find(
    (s) => s.textContent.trim() === "Power",
  );

  if (!powerSpan) throw new Error("failed to find power setting!");

  const parent =
    powerSpan?.parentElement?.parentElement?.parentElement?.parentElement.parentElement;

  if (!parent) throw new Error("failed to find parent element!");

  const secondChild =
    parent?.children[1]?.children[0]?.children[0]?.children[0]?.children[1];

  if (!secondChild) throw new Error("failed to find second child element!");

  const boundingBox = secondChild.getBoundingClientRect();

  return {
    x: boundingBox.x,
    y: boundingBox.y,
    width: boundingBox.width,
    height: boundingBox.height,
  };
})();
`;
