const FLOOR = 9;

export function fit(node: HTMLElement, _text: string) {
  const run = () => {
    node.style.removeProperty("font-size");
    let size = Number.parseFloat(globalThis.getComputedStyle(node).fontSize);

    const spills = () => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const bounds = range.getBoundingClientRect();
      return bounds.width > node.clientWidth + 1 || bounds.height > node.clientHeight + 1;
    };

    while (size > FLOOR && spills()) {
      size -= 0.5;
      node.style.fontSize = `${size}px`;
    }
  };

  run();
  globalThis.addEventListener("resize", run);

  return {
    update: run,
    destroy: () => globalThis.removeEventListener("resize", run),
  };
}
