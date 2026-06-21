export const clickImport = `
(async () => {
  const wait = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const menu = document.getElementById("atommMenu");
  if (!menu) {
    throw new Error("xTool menu root #atommMenu not found");
  }

  menu.click();

  await wait(300);

  const file = document.getElementById("file");
  if (!file) {
    throw new Error("xTool File menu #file not found");
  }

  file.click();

  await wait(300);

  const importItem = document.getElementById("importImage_fileMenu");
  if (!importItem) {
    throw new Error("xTool File > Import menu item #importImage_fileMenu not found");
  }

  importItem.click();
})();
`;
