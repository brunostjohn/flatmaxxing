export const clickDeviceLibrary = `
(() => {
  const deviceLibrary = [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === "Device library",
  );

  if (!deviceLibrary) {
    throw new Error("Device library button not found");
  }

  deviceLibrary.click();
})();
`;
