export const getLaserTypeSelector = `
(() => {
  const laserTypeSelectorSpan = [...document.querySelectorAll("span")].find(
    (s) => s.textContent.trim() === "Blue light",
  );

  if (!laserTypeSelectorSpan) {
    throw new Error("Laser type selector not found");
  }

  const boundingBox = laserTypeSelectorSpan.getBoundingClientRect();

  return {
    x: boundingBox.x,
    y: boundingBox.y,
    width: boundingBox.width,
    height: boundingBox.height,
  };
})();
`;
