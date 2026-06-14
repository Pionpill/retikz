import type { Scene } from '@retikz/core';

type Primitive = Scene['primitives'][number];

/** 递归拍平 Scene 原语（下钻 group.children，group 本身也计入） */
export const flattenPrimitives = (scene: Scene): Array<Primitive> => {
  const out: Array<Primitive> = [];
  const walk = (prims: Array<Primitive>): void => {
    for (const p of prims) {
      out.push(p);
      if (p.type === 'group') walk(p.children);
    }
  };
  walk(scene.primitives);
  return out;
};

/** 收集 Scene 里全部 text 原语的所有行文字 */
export const allText = (scene: Scene): Array<string> =>
  flattenPrimitives(scene)
    .filter((p): p is Extract<Primitive, { type: 'text' }> => p.type === 'text')
    .flatMap((p) => p.lines.map((l) => l.text));
