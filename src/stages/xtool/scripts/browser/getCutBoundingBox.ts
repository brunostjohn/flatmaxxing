export const getCutBoundingBox = `
(() => {
  const cuts = [...document.querySelectorAll("span")].find(
    (s) => s.textContent.trim() === "Cut",
  );

  if (!cuts) {
    throw new Error("Cut not found");
  }

  const boundingBox = cuts.getBoundingClientRect();

  return {
    x: boundingBox.x,
    y: boundingBox.y,
    width: boundingBox.width,
    height: boundingBox.height,
  };
})();
`;
