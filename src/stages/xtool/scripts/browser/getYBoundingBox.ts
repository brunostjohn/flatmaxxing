export const getYBoundingBox = `
(() => {
  const yInputIcon = document.querySelector(
    "use[href=\\"#icon-new-editor-direction_y\\"]",
  );

  if (!yInputIcon) {
    throw new Error("Y input not found");
  }

  const parentElement =
    yInputIcon.parentElement?.parentElement?.parentElement;

  if (!parentElement) {
    throw new Error("Parent element not found");
  }

  const boundingBox = parentElement.getBoundingClientRect();

  return {
    x: boundingBox.x,
    y: boundingBox.y,
    width: boundingBox.width,
    height: boundingBox.height,
  };
})();
`;
