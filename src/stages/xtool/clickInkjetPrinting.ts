export const clickInkjetPrinting = `
(() => {
  const inkjetPrinting = [...document.querySelectorAll("span")].find(b => b.textContent?.trim() === "Inkjet printing");
  if (!inkjetPrinting) {
    throw new Error("Inkjet printing button not found");
  }
  inkjetPrinting.click();
})();
`;
