export const clickSaveAs = () => `
(async () => {
  const wait = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const menu = document.getElementById("atommMenu");

  menu.click();

  await wait(300);

  const file = document.getElementById("file");

  file.click();

  await wait(300);

  const saveAs = [...document.querySelectorAll("span")].find(s => s.textContent.trim() === "Save as");

  saveAs.click();
})();
`;
