import type { IRScene } from '@retikz/core';

import type { SceneInputBindings } from '../runtime';
import { DEFAULT_ID_PREFIX } from '../runtime';
import type { MountOptions, SvgView } from './types';
import { createView } from './view';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** 将 IR 挂载到 SVG 视图 */
export const mountSvgView = (
  container: Element,
  ir: IRScene,
  options: MountOptions = {},
  bindings?: SceneInputBindings,
): SvgView => {
  const root = document.createElementNS(SVG_NS, 'svg');
  const output = options.output ?? {};
  if (output.width !== undefined) root.setAttribute('width', String(output.width));
  if (output.height !== undefined) root.setAttribute('height', String(output.height));
  const processing = createView({
    backend: 'svg',
    host: root,
    ir,
    bindings,
    mountOptions: options,
    idPrefix: output.idPrefix ?? DEFAULT_ID_PREFIX,
  });
  container.appendChild(root);
  let rootRemoved = false;

  return {
    root,
    update: processing.update,
    updateInput: processing.updateInput,
    hydrate: processing.hydrate,
    dispose: () => {
      processing.dispose();
      if (!rootRemoved) {
        root.remove();
        rootRemoved = true;
      }
    },
    diagnostics: processing.diagnostics,
    get animation() {
      return processing.read().animation;
    },
    get compileResult() {
      return processing.result();
    },
  };
};
