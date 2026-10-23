import type { Scene } from '@retikz/core';
import { visitSceneContent } from '@retikz/core';

import { RetikzRenderError, RetikzRenderErrorCode } from '../error';

/** 在渲染器发布任何输出前检查 Scene 的资源引用闭包 */
export const validateSceneContent = (scene: Scene): void => {
  try {
    visitSceneContent(scene, () => {});
  } catch (cause) {
    throw new RetikzRenderError(
      RetikzRenderErrorCode.SceneTopologyInvalid,
      `Invalid Scene resource content: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }
};
