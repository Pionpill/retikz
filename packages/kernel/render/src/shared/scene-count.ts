import type { ScenePrimitive } from '@retikz/core';

/** 递归统计 Scene primitive occurrence，Group 本身与每个 child 都计一次 */
export const countScenePrimitiveOccurrences = (primitives: ReadonlyArray<ScenePrimitive>): number => {
  let count = 0;
  const visit = (primitive: ScenePrimitive): void => {
    count += 1;
    if (primitive.type === 'group') {
      for (const child of primitive.children) visit(child);
    }
  };
  for (const primitive of primitives) visit(primitive);
  return count;
};
