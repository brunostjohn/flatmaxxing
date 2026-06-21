export const discardShellRestoreModal = `
(() => {
  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  };

  const buttons = [...document.querySelectorAll("button")];
  const discardButton = buttons.find(
    (button) => button.textContent?.trim() === "Discard" && isVisible(button),
  );

  if (!discardButton) {
    return false;
  }

  discardButton.click();
  return true;
})();
`;
