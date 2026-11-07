import type { SceneResource, ClipRegistry, PaintRegistry } from '@retikz/core';

/** 导入已编译资源，保留内容身份及图元引用 */
export const importSceneResources = (
  resources: ReadonlyArray<SceneResource>,
  paint: PaintRegistry,
  clip: ClipRegistry,
): void => {
  for (const resource of resources) {
    if (resource.kind === 'clip') {
      clip.importResource(resource);
    } else {
      paint.importResource(resource);
    }
  }
};
