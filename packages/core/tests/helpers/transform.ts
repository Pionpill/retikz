import type { Transform } from '../../src/primitive';

/**
 * 测试 helper：Transform[] → SVG transform 字符串
 * @description 镜像 react adapter 的 buildTransform，仅供测试断言复用旧式 transform 字符串契约
 */
export const buildTransform = (
  transforms: ReadonlyArray<Transform> | undefined,
): string | undefined => {
  if (!transforms || transforms.length === 0) return undefined;
  const tokens: Array<string> = [];
  for (const t of transforms) {
    switch (t.kind) {
      case 'translate':
        tokens.push(`translate(${t.x} ${t.y})`);
        break;
      case 'rotate':
        if (t.cx === undefined && t.cy === undefined) {
          tokens.push(`rotate(${t.degrees})`);
        } else {
          tokens.push(`rotate(${t.degrees} ${t.cx ?? 0} ${t.cy ?? 0})`);
        }
        break;
      case 'scale': {
        const sy = t.y ?? t.x;
        tokens.push(`scale(${t.x} ${sy})`);
        break;
      }
    }
  }
  return tokens.join(' ');
};
