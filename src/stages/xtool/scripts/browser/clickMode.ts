export const clickMode = `
(() => {
  const mode = [...document.querySelectorAll("span")].find(
    (b) => b.textContent?.trim() === "Lasering on flat surface",
  );

  if (!mode) {
    throw new Error("Mode button not found");
  }

  mode.click();
})();
`;
