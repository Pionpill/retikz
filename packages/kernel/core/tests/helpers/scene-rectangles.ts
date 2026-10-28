import type { CenteredBox } from '@retikz/math';

import { applyTransformChain } from '../../src/compile/transform';
import type { Scene, ScenePrimitive, Transform } from '../../src/contract';

/** 从实际绘制的矩形读取世界坐标几何，用于定位和变换行为断言 */
export const sceneRectangles = (scene: Scene): Array<{ id?: string; rect: CenteredBox }> => {
  const rectangles: Array<{ id?: string; rect: CenteredBox }> = [];
  const visit = (
    primitives: ReadonlyArray<ScenePrimitive>,
    transforms: ReadonlyArray<Transform>,
    id?: string,
  ): void => {
    for (const primitive of primitives) {
      if (primitive.type === 'group') {
        visit(primitive.children, [...transforms, ...(primitive.transforms ?? [])], primitive.id ?? id);
      } else if (primitive.type === 'rect') {
        const center = applyTransformChain(
          [primitive.x + primitive.width / 2, primitive.y + primitive.height / 2],
          transforms,
        );
        const right = applyTransformChain(
          [primitive.x + primitive.width, primitive.y + primitive.height / 2],
          transforms,
        );
        const bottom = applyTransformChain(
          [primitive.x + primitive.width / 2, primitive.y + primitive.height],
          transforms,
        );
        rectangles.push({
          id: primitive.id ?? id,
          rect: {
            x: center[0],
            y: center[1],
            width: Math.hypot(right[0] - center[0], right[1] - center[1]) * 2,
            height: Math.hypot(bottom[0] - center[0], bottom[1] - center[1]) * 2,
            rotate: Math.atan2(right[1] - center[1], right[0] - center[0]),
          },
        });
      }
    }
  };
  visit(scene.primitives, []);
  return rectangles;
};
