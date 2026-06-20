export const installSaveDialogPatchScript = (desiredAbsolutePath: string) => {
  const pathLiteral = JSON.stringify(desiredAbsolutePath);

  return `
      (() => {
        const desiredAbsolutePath = ${pathLiteral};
  
        const api = window.__electronAPI__;
        if (!api?.fs?.saveDialog) {
          throw new Error("saveDialog missing");
        }
  
        window.__electronAPI__.fs.saveDialog = async (...args) => {
          console.log("[xtool patch] saveDialog intercepted", args);
          return desiredAbsolutePath;
        };
  
        return {
          patched: true,
          path: desiredAbsolutePath,
          saveDialogType: typeof api.fs.saveDialog,
        };
      })()
    `;
};
