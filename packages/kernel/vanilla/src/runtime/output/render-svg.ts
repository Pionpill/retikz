import type { Scene } from '@retikz/core';
import { prefersReducedMotion, resolveAnimationEnabled } from '@retikz/render/animation';
import { renderToSvgString } from '@retikz/render/svg';

import { DEFAULT_ID_PREFIX } from './constants';
import type { RenderToStringOptions } from './types';

/** 将已编译的 Scene 与宿主输出选项交给 SVG 后端，不启动处理会话 */
export const renderToSvg = (scene: Scene, options: RenderToStringOptions = {}): string => {
  const output = options.output ?? {};
  const animation = options.animation ?? {};
  const animate = resolveAnimationEnabled(animation.enabled, prefersReducedMotion());

  return renderToSvgString(scene, {
    idPrefix: output.idPrefix ?? DEFAULT_ID_PREFIX,
    animate,
    snapshotAt: animation.snapshotAt,

    width: output.width,
    height: output.height,
  });
};
