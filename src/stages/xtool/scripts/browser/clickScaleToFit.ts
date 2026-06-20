export const clickScaleToFit = `
(() => {
  const scaleToFit = [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === "Scale to fit",
  );

  if (!scaleToFit) {
    throw new Error("Scale to fit button not found");
  }

  scaleToFit.click();
})();
`;
