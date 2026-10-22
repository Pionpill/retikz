import { pointAtArcAngle } from '@retikz/math';
import type { Position } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { SharedPolarPosition } from '../position';
import { isPositionTuple } from '../position';

/*
 * 极坐标不直接参与几何计算——所有计算（intersection/bbox/boundaryPoint/Path 端点）都在笛卡尔下进行，
 * 遇 PolarPosition 必先 polar.toPosition 转笛卡尔。
 * 保留极坐标只为：(1) 用户输入便利；(2) IR 保留意图，对 TikZ 双向 codec / 编辑器 / AI 友好。
 * Scene 编译统一折成笛卡尔，本文件只提供极坐标输入到笛卡尔位置的转换
 */

export type { SharedPolarPosition } from '../position';

/** 将极坐标输入转换为可参与几何计算的位置 */
export const polar = {
  /**
   * 将角度和距离转换为平面坐标，支持嵌套的参考原点
   * @description 原点为节点 id 时报告错误，需由编译器先找到该节点的位置
   */
  toPosition: (p: SharedPolarPosition): Position => {
    let origin: Position;
    if (!p.origin) {
      origin = [0, 0];
    } else if (typeof p.origin === 'string') {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Geometry,
        'polar.toPosition: cannot resolve string origin (node id) without node context; use the Scene compiler',
      );
    } else if (isPositionTuple(p.origin)) {
      origin = p.origin;
    } else {
      origin = polar.toPosition(p.origin);
    }

    return pointAtArcAngle(origin, p.radius, p.angle);
  },
};
