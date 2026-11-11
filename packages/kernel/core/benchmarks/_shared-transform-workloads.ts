import type { AffineMatrix } from '@retikz/math';

import type { Transform } from '../src/contract';
import type { IRPosition } from '../src/schemas';

/** 混合变换链和独立手算的几何预期 */
export type SharedTransformWorkload = {
  /** 祖先到当前层的声明；每组依次平移、带中心旋转、非均匀负缩放 */
  chain: Array<Transform>;
  /** 固定局部点 */
  local: IRPosition;
  /** 已知全局坐标 */
  world: IRPosition;
  /** 已知正向仿射矩阵 */
  forward: AffineMatrix;
  /** 已知逆向仿射矩阵 */
  inverse: AffineMatrix;
  /** 累计旋转弧度 */
  rotation: number;
  /** 逐轴累计尺度，不将旋转后的矩阵对角线误作尺度 */
  scaleX: number;
  scaleY: number;
};

/** 构造一项完整链；F(x,y)=(16-3y,-6-2x)，F²(x,y)=(6x+34,6y-38) */
export const createSharedTransformWorkload = (count: 3 | 24): SharedTransformWorkload => {
  const chain: Array<Transform> = [];
  for (let level = 0; level < count / 3; level++) {
    chain.push(
      { kind: 'translate', x: 11, y: -7 },
      { kind: 'rotate', degrees: 90, cx: 2, cy: 3 },
      { kind: 'scale', x: -2, y: 3 },
    );
  }
  return count === 3
    ? {
        chain,
        local: [4, 5],
        world: [1, -14],
        forward: [0, -2, -3, 0, 16, -6],
        inverse: [0, -1 / 3, -1 / 2, 0, -3, 16 / 3],
        rotation: Math.PI / 2,
        scaleX: -2,
        scaleY: 3,
      }
    : {
        chain,
        local: [4, 5],
        world: [13990, -3362],
        forward: [1296, 0, 0, 1296, 8806, -9842],
        inverse: [1 / 1296, 0, 0, 1 / 1296, -8806 / 1296, 9842 / 1296],
        rotation: Math.PI * 4,
        scaleX: 256,
        scaleY: 6561,
      };
};
