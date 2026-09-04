import type {
  IRPosition,
  IRStep,
  PathCommand,
  PathKindLabelInput,
  ResolvedPathKindAppearance,
  ScenePrimitive,
} from '@retikz/core';
import type { CurveSegmentSample, Vector2 } from '@retikz/math';

import type { CanonicalRibbonOptions, IRRibbonPath } from '../types';

/** ribbon 编译期归一化后的输入 */
export type RibbonLike = Omit<IRRibbonPath, 'kindOptions'> & CanonicalRibbonOptions;

/** 动态宽度 / boundary ribbon 的采样点数量 */
export const DEFAULT_RIBBON_SAMPLES = 64;

/** 可按 t∈[0,1] 采样的中心线段 */
export type RibbonSegment = {
  sampleAt: (t: number) => CurveSegmentSample;
  length: number;
};

/** 从 PathCommand 提取出的 ribbon 中心线段输入 */
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

/** 可直接构造左右 offset 曲线的解析型线段 */
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

/** ribbon 在某个归一化 offset 上的横截面 */
export type RibbonCrossSection = {
  center: IRPosition;
  left: IRPosition;
  right: IRPosition;
  tangent: Vector2;
  width: number;
};

/** Standard Ribbon 物化所需的 Core public service */
export type RibbonMaterializePath = (input?: Readonly<{ children?: ReadonlyArray<IRStep> }>) => Readonly<{
  commands: ReadonlyArray<PathCommand>;
  boundsPoints: ReadonlyArray<IRPosition>;
}>;

/** ribbon 几何阶段的最小附加上下文 */
export type RibbonEmitOptions = Readonly<{
  /** 共享宿主外观 */
  appearance: ResolvedPathKindAppearance;
  /** 当前编译使用的取整函数 */
  round: (value: number) => number;
  /** 当前路径的物化服务 */
  materializePath: RibbonMaterializePath;
  /** 当前路径的宿主标签服务 */
  emitHostLabels: (input: PathKindLabelInput) => ReadonlyArray<ScenePrimitive>;
}>;
