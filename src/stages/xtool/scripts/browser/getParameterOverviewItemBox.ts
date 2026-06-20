export const getParameterOverviewItemBox = `
(() => {
  const parameterOverviewItem = document.querySelector(".parameter-overview-item");
  if (!parameterOverviewItem) {
    throw new Error("Parameter overview item not found");
  }

  const boundingBox = parameterOverviewItem.getBoundingClientRect();

  return {
    x: boundingBox.x,
    y: boundingBox.y,
    width: boundingBox.width,
    height: boundingBox.height,
  };
})();
`;
