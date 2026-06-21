export const getFiberLaserSelector = `
(() => {
  const fiberLaserSelectorSpan = [...document.querySelectorAll("span")].find(
    (s) => s.textContent.trim() === "Fiber IR",
  );

  if (!fiberLaserSelectorSpan) {
    throw new Error("Fiber laser selector not found");
  }

  const boundingBox = fiberLaserSelectorSpan.getBoundingClientRect();

  return {
    x: boundingBox.x,
    y: boundingBox.y,
    width: boundingBox.width,
    height: boundingBox.height,
  };
})();
`;
