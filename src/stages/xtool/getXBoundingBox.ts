export const getXBoundingBox = () => `
(() => {
   const xInputIcon = document.querySelector("use[href=\\"#icon-new-editor-direction_x\\"]");
   if (!xInputIcon) {
    throw new Error("X input not found");
   }

   const parentElement = xInputIcon.parentElement?.parentElement?.parentElement;

   if (!parentElement) {
    throw new Error("Parent element not found");
   }

   const boundingBox = parentElement.getBoundingClientRect();

   return { x: boundingBox.x, y: boundingBox.y, width: boundingBox.width, height: boundingBox.height };
})();
`;
