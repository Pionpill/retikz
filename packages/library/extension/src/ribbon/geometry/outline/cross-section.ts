import type { IRPosition } from '@retikz/core';
import type { CurveSegmentSample, Vector2 } from '@retikz/math';
import { isFinitePoint, vector2 } from '@retikz/math';

import { RetikzExtensionError, RetikzExtensionErrorCode } from '../../../errors';
import type { RibbonAlignment } from '../../constants';
import type { RibbonCrossSection } from '../types';

/** 计算带状路径单个横截面所需的中心线采样、宽度函数与端点轴向 */
export type RibbonCrossSectionInput = {
  /** 中心线当前位置及单位切向量 */
  sample: CurveSegmentSample;
  /** 沿中心线累计长度归一化后的采样位置，范围为 0 到 1 */
  offset: number;
  /** 接收归一化位置并返回有限非负宽度的已解析函数 */
  widthAt: (offset: number) => number;
  /** 已归一化的显式端面轴向，仅在起点或终点使用 */
  endpointAxes: {
    /** 起点横截面的显式轴向 */
    start?: Vector2;
    /** 终点横截面的显式轴向 */
    end?: Vector2;
  };
  /** 宽度相对中心线分配到左侧、右侧或两侧的方式 */
  align: RibbonAlignment;
  /** 统一处理输出坐标精度的函数 */
  round: (n: number) => number;
};

/**
 * 计算中心线某一点的 ribbon 横截面
 * @description 宽度按 offset 求值；align 决定宽度分配到左右两侧的比例；显式端点方向仅影响端点横截面
 */
export const ribbonCrossSection = ({
  sample,
  offset,
  widthAt,
  endpointAxes,
  align,
  round,
}: RibbonCrossSectionInput): RibbonCrossSection => {
  const width = widthAt(offset);
  const tangent = sample.tangent;
  const explicit = offset === 0 ? endpointAxes.start : offset === 1 ? endpointAxes.end : undefined;
  const reference = vector2.normal(tangent);
  let normal = reference;
  if (explicit !== undefined) {
    const dot = explicit[0] * reference[0] + explicit[1] * reference[1];
    if (Math.abs(dot) < 1e-8)
      throw new RetikzExtensionError({
        code: RetikzExtensionErrorCode.GeometryInvalid,
        message: 'Ribbon section direction must not be parallel to the centerline tangent.',
        details: { offset, direction: explicit },
      });

    normal = dot < 0 ? [-explicit[0], -explicit[1]] : explicit;
  }

  const leftOffset = align === 'right' ? 0 : align === 'left' ? width : width / 2;
  const rightOffset = align === 'left' ? 0 : align === 'right' ? width : width / 2;
  const left: IRPosition = [
    round(sample.point[0] + normal[0] * leftOffset),
    round(sample.point[1] + normal[1] * leftOffset),
  ];
  const right: IRPosition = [
    round(sample.point[0] - normal[0] * rightOffset),
    round(sample.point[1] - normal[1] * rightOffset),
  ];
  if (!isFinitePoint(left) || !isFinitePoint(right)) {
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.GeometryInvalid,
      message: 'Ribbon sampling produced a non-finite coordinate; check width profile output.',
      details: { left, right, sample: sample.point, width },
    });
  }

  return {
    center: [round(sample.point[0]), round(sample.point[1])],
    left,
    right,
    tangent,
    axis: normal,
    width,
  };
};
