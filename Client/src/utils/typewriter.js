export const createTypewriter = (onText) => {
  let queue = "";
  let timer = null;
  const tick = () => {
    if (!queue) {
      clearInterval(timer);
      timer = null;
      return;
    }
    const size = Math.max(2, Math.ceil(queue.length / 100));
    onText(queue.slice(0, size));
    queue = queue.slice(size);
  };
  return {
    push: (text) => {
      queue += text;
      if (!timer) timer = setInterval(tick, 30);
    },
    drain: () =>
      new Promise((resolve) => {
        const wait = () => (queue ? setTimeout(wait, 30) : resolve());
        wait();
      }),
    stop: () => {
      queue = "";
      clearInterval(timer);
      timer = null;
    },
  };
};
