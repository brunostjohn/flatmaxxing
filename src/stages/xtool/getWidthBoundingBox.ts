export const getWidthBoundingBox = () => `
(() => {
   const widthInputIcon = document.querySelector("use[href=\\"#icon-new-editor-size_w\\"]");
   if (!widthInputIcon) {
    throw new Error("Width input not found");
   }

   const parentElement = widthInputIcon.parentElement?.parentElement?.parentElement;

   if (!parentElement) {
    throw new Error("Input not found");
   }

   const boundingBox = parentElement.getBoundingClientRect();

   return {
    x: boundingBox.x,
    y: boundingBox.y,
    width: boundingBox.width,
    height: boundingBox.height,
   };
})();
`;
