export const clickDeviceSwitch = `
(() => {
  const deviceSwitch = document.getElementById("deviceSwitch");
  if (!deviceSwitch) {
    throw new Error("Device switch not found");
  }

  deviceSwitch.click();
})();
`;
