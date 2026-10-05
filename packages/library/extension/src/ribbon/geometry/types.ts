import type {
  IRPosition,
  IRStep,
  PathCommand,
  PathKindLabelInput,
  PathKindBoundaryLabelInput,
  ResolvedPathKindAppearance,
  ScenePrimitive,
} from '@retikz/core';
import type { CurveSegmentSample, Vector2 } from '@retikz/math';

import type { CanonicalRibbonOptions, IRRibbonPath } from '../types';

/** ribbon 编译期归一化后的输入 */
export type RibbonLike = Omit<IRRibbonPath, 'kindOptions'> & CanonicalRibbonOptions;

/** 可按 t∈[0,1] 采样的中心线段 */
export type RibbonSegment = {
  /** 按曲线参数 t∈[0,1] 采样位置与切线 */
  sampleAt: (t: number) => CurveSegmentSample;
  /** 按距当前线段起点的弧长采样位置与切线 */
  sampleAtDistance: (distance: number) => CurveSegmentSample;
  /** 当前中心线段的弧长 */
  length: number;
};

/** 从 PathCommand 提取出的 ribbon 中心线段输入 */
export type RibbonSegmentInput =
  | {
      /** 当前中心线段的几何类型 */
      kind: 'line';
      /** 直线或贝塞尔段的起点 */
      from: IRPosition;
      /** 当前线段的终点 */
      to: IRPosition;
    }
  | {
      /** 当前中心线段的几何类型 */
      kind: 'quad';
      /** 直线或贝塞尔段的起点 */
      from: IRPosition;
      /** 二次贝塞尔段的控制点 */
      control: IRPosition;
      /** 当前线段的终点 */
      to: IRPosition;
    }
  | {
      /** 当前中心线段的几何类型 */
      kind: 'cubic';
      /** 直线或贝塞尔段的起点 */
      from: IRPosition;
      /** 三次贝塞尔段靠近起点的控制点 */
      control1: IRPosition;
      /** 三次贝塞尔段靠近终点的控制点 */
      control2: IRPosition;
      /** 当前线段的终点 */
      to: IRPosition;
    }
  | {
      /** 当前中心线段的几何类型 */
      kind: 'arc';
      /** 圆弧或椭圆弧的中心 */
      center: IRPosition;
      /** 圆弧半径 */
      radius: number;
      /** 弧段起始角，单位为度 */
      startAngle: number;
      /** 弧段终止角，单位为度 */
      endAngle: number;
      /** 当前线段的终点 */
      to: IRPosition;
    }
  | {
      /** 当前中心线段的几何类型 */
      kind: 'ellipseArc';
      /** 圆弧或椭圆弧的中心 */
      center: IRPosition;
      /** 椭圆弧水平半轴长度 */
      radiusX: number;
      /** 椭圆弧垂直半轴长度 */
      radiusY: number;
      /** 弧段起始角，单位为度 */
      startAngle: number;
      /** 弧段终止角，单位为度 */
      endAngle: number;
      /** 当前线段的终点 */
      to: IRPosition;
    };

/** ribbon 在某个归一化 offset 上的横截面 */
export type RibbonCrossSection = {
  /** 中心线采样点 */
  center: IRPosition;
  /** 当前对齐方式下横截面的左侧边界点 */
  left: IRPosition;
  /** 当前对齐方式下横截面的右侧边界点 */
  right: IRPosition;
  /** 中心线在采样点的单位切向 */
  tangent: Vector2;
  /** 由中心线指向横截面侧边的单位轴向 */
  axis: Vector2;
  /** 当前横截面的完整带宽 */
  width: number;
};

/** Extension Ribbon 物化所需的 Core public service */
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
  /** Kernel 共享边界标签服务 */
  emitBoundaryLabels: (input: ReadonlyArray<PathKindBoundaryLabelInput>) => ReadonlyArray<ScenePrimitive>;
}>;
