export const getPassesSpanBox = () => `
(() => {
   const passesSpan = [...document.querySelectorAll("span")].find((s) => s.textContent.trim() === "Pass");

   if (!passesSpan) throw new Error("failed to find passes setting!");

   const parent = passesSpan?.parentElement?.parentElement?.parentElement?.parentElement;

   if (!parent) throw new Error("failed to find parent element!");

   const firstChild = parent?.children[1]?.children[0]?.children[0]?.children[0]?.children[0];

   if (!firstChild) throw new Error("failed to find first child element!");

   const boundingBox = firstChild.getBoundingClientRect();

   return { x: boundingBox.x, y: boundingBox.y, width: boundingBox.width, height: boundingBox.height };
})();
`;
