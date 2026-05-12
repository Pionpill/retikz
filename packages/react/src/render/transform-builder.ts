import type { Transform } from '@retikz/core';

/** 默认 round：保留 2 位小数，配 compile/precision 的默认 */
const defaultRound = (n: number) => Math.round(n * 100) / 100;

/**
 * Transform[] → SVG `transform` 属性字符串
 * @description 按数组顺序拼接（与 SVG transform 多操作列表语义一致）；scale 缺省 y 等比 x；rotate cx/cy 缺省绕原点；空数组 / undefined 返回 undefined（让消费方直接不写 transform 属性）
 */
export const buildTransform = (
  transforms: ReadonlyArray<Transform> | undefined,
  round: (n: number) => number = defaultRound,
): string | undefined => {
  if (!transforms || transforms.length === 0) return undefined;
  const tokens: Array<string> = [];
  for (const t of transforms) {
    switch (t.kind) {
      case 'translate':
        tokens.push(`translate(${round(t.x)} ${round(t.y)})`);
        break;
      case 'rotate':
        if (t.cx === undefined && t.cy === undefined) {
          tokens.push(`rotate(${round(t.degrees)})`);
        } else {
          tokens.push(
            `rotate(${round(t.degrees)} ${round(t.cx ?? 0)} ${round(t.cy ?? 0)})`,
          );
        }
        break;
      case 'scale': {
        const sy = t.y ?? t.x;
        tokens.push(`scale(${round(t.x)} ${round(sy)})`);
        break;
      }
      default: {
        const exhaustive: never = t;
        throw new Error(
          `buildTransform: unknown Transform kind: ${String((exhaustive as { kind: string }).kind)}`,
        );
      }
    }
  }
  return tokens.join(' ');
};
