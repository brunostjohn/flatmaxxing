export const clickM1Ultra = `
(() => {
  const m1Ultra = [...document.querySelectorAll("p")].find(
    (b) => b.textContent?.trim() === "M1 Ultra",
  );

  if (!m1Ultra) {
    throw new Error("M1 Ultra button not found");
  }

  m1Ultra.click();
})();
`;
