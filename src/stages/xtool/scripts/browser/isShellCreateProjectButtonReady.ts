export const isShellCreateProjectButtonReady = `
(() => {
  const tabs = document.querySelector(".shell-tabs-bar");
  if (!tabs) {
    return false;
  }

  const secondChild = tabs.children[1];
  if (!secondChild) {
    return false;
  }

  const createProject = [...secondChild.children];
  const lastChild = createProject[createProject.length - 1];

  return Boolean(lastChild);
})();
`;
