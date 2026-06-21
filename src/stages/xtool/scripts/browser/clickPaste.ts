export const clickPaste = `
(async () => {
  const wait = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const menu = document.getElementById("atommMenu");
  if (!menu) {
    throw new Error("xTool menu root #atommMenu not found");
  }

  menu.click();

  await wait(300);

  const edit = document.getElementById("edit");
  if (!edit) {
    throw new Error("xTool Edit menu #edit not found");
  }

  edit.click();

  await wait(300);

  const paste = [...document.querySelectorAll("span")].find(
    (s) => s.textContent?.trim() === "Paste",
  );
  if (!paste) {
    throw new Error('xTool Edit > Paste menu item "Paste" not found');
  }

  paste.click();
})();
`;
