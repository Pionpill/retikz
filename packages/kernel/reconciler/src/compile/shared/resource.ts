import type { SceneResources, ClipRegistry, PaintRegistry } from '@retikz/core';

/** 导入已编译资源，保留内容身份及图元引用 */
export const importSceneResources = (resources: SceneResources, paint: PaintRegistry, clip: ClipRegistry): void => {
  for (const resource of resources.paints) paint.importResource(resource);
  for (const resource of resources.clips) clip.importResource(resource);
};
