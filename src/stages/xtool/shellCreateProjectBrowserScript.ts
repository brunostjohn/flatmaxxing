export const shellCreateProjectBrowserScript = `(async () => {
  const tabs = document.querySelector(".shell-tabs-bar");
  if (!tabs) {
    throw new Error("Tabs not found");
  }

  const secondChild = tabs.children[1];
  if (!secondChild) {
    throw new Error("Second child not found");
  }

  const createProject = [...secondChild.children];
  const lastChild = createProject[createProject.length - 1];
  if (!lastChild) {
    throw new Error("Create project button not found");
  }

  lastChild.click();
})();`;
