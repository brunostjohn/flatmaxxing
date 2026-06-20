export const shellClickOnSaveScript = `
(async () => {
  const saveButton = [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === "Save locally",
  );

  saveButton.click();
})();
`;
