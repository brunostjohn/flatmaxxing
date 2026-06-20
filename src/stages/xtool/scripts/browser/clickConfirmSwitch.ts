export const clickConfirmSwitch = `
(() => {
  const confirmSwitch = [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === "Switch",
  );

  if (!confirmSwitch) {
    const deviceConnectBlock = document.querySelector(".device-connect-header__summary");
    const spans = deviceConnectBlock?.querySelectorAll("span");
    const m1UltraSpan = [...(spans ?? [])].find((s) =>
      s.textContent?.trim().includes("M1 Ultra")
    );

    if (m1UltraSpan) {
      return;
    }

    throw new Error("Confirm button not found");
  }

  confirmSwitch.click();
})();
`;
