export const clickF1Ultra = `
(() => {
  const f1Ultra = [...document.querySelectorAll("p")].find(
    (b) => b.textContent?.trim() === "F1 Ultra",
  );

  if (!f1Ultra) {
    throw new Error("F1 Ultra button not found");
  }

  f1Ultra.click();
})();
`;
