import { WINDOW } from '../../../types.js';

const whenActivated = (callback) => {
  if (WINDOW.document?.prerendering) {
    addEventListener("prerenderingchange", () => callback(), true);
  } else {
    callback();
  }
};

export { whenActivated };
//# sourceMappingURL=whenActivated.js.map
