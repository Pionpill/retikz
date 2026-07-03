import type { Vector2 } from '@retikz/math';

import type { RibbonWidthProfileDefinition } from '../../../contract';
import type { IRPathBase, IRPathRibbonOptions, IRPosition } from '../../../schemas';
import type { SegmentSample } from '../../../shared/geometry';
import type { EmitPathWarnHook } from '../types';

/**
 * ribbon 编译期归一化后的输入
 * @description Path 顶层通用字段与 `path.ribbon` 选项合并后供 ribbon lowering 使用；只在 compile 内部流转。
 */
export type RibbonLike = Omit<IRPathBase, 'kind' | 'kindOptions' | 'ribbon'> & IRPathRibbonOptions;

/** 动态宽度 / boundary ribbon 的默认采样点数量。 */
export const DEFAULT_RIBBON_SAMPLES = 64;

/**
 * 可按 t∈[0,1] 采样的中心线段
 * @description `length` 是近似弧长，后续按累计长度把全局 offset 映射回具体线段。
 */
export type RibbonSegment = {
  sampleAt: (t: number) => SegmentSample;
  length: number;
};

/**
 * 从 PathCommand 提取出的 ribbon 中心线段输入
 * @description 保留命令的几何参数，供后续生成采样器或尝试解析型 offset 轮廓；arc / ellipseArc 只能走采样轮廓。
 */
export type RibbonSegmentInput =
  | { kind: 'line'; from: IRPosition; to: IRPosition }
  | { kind: 'quad'; from: IRPosition; control: IRPosition; to: IRPosition }
  | {
      kind: 'cubic';
      from: IRPosition;
      control1: IRPosition;
      control2: IRPosition;
      to: IRPosition;
    }
  | {
      kind: 'arc';
      center: IRPosition;
      radius: number;
      startAngle: number;
      endAngle: number;
      to: IRPosition;
    }
  | {
      kind: 'ellipseArc';
      center: IRPosition;
      radiusX: number;
      radiusY: number;
      startAngle: number;
      endAngle: number;
      to: IRPosition;
    };

/**
 * 可直接构造左右 offset 曲线的解析型线段
 * @description line / quad / cubic 可保留同阶命令；圆弧 offset 暂不做解析解，需退回采样轮廓。
 */
export type RibbonAnalyticSegment =
  | { kind: 'line'; from: IRPosition; to: IRPosition }
  | { kind: 'quad'; from: IRPosition; control: IRPosition; to: IRPosition }
  | {
      kind: 'cubic';
      from: IRPosition;
      control1: IRPosition;
      control2: IRPosition;
      to: IRPosition;
    };

/**
 * ribbon 在某个归一化 offset 上的横截面
 * @description center 是中心线采样点；left / right 是按宽度、对齐方式和端点切线修正后的两侧边界点。
 */
export type RibbonCrossSection = {
  center: IRPosition;
  left: IRPosition;
  right: IRPosition;
  tangent: Vector2;
  width: number;
};

/** ribbon emit 额外需要的上下文。 */
export type RibbonEmitOptions = EmitPathWarnHook & {
  /**
   * ribbon 宽度 profile 注册表。
   * @default 空 Map
   */
  ribbonWidthProfiles?: ReadonlyMap<string, RibbonWidthProfileDefinition>;
};
