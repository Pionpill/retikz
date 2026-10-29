import type { PropertyPath } from '@retikz/foundation';
import type { ZodType } from 'zod';

import type { IRBoundaryLabel, IRPathBase, IRPathLabel, IRPosition, IRStep } from '../../schemas';
import type { PathCommand, PathPrimitiveAppearance, ScenePrimitive } from '../scene';

/**
 * path 编译结果
 * @description path definition 把高层 path 形态编译成当前 Path 局部坐标系中的 Scene primitive，
 *   并返回同一坐标系内参与 bbox / transform 计算的关键点集合
 */
export type PathCompileResult = {
  /** 当前 Path 局部坐标系中的实际渲染输出 */
  primitives: Iterable<ScenePrimitive>;
  /** 当前 Path 局部坐标系中的 layout 与路径级 rotate / scale 几何依据 */
  boundsPoints: Iterable<IRPosition>;
};

/** 编译标准描边 */
export type StrokeEmitter = (path?: IRPathBase) => PathCompileResult | null;

/** Path 可消费的宿主外观，不包含领域专属字段 */
export type CompiledPathAppearance = Readonly<
  {
    /** 宿主生效的主色，保留至选定的路径定义消费 */
    color?: NonNullable<IRPathBase['style']>['color'];
  } & PathPrimitiveAppearance
>;

/** Path 请求宿主标签编译时提供的已定位几何信息，不包含 Stroke 专属 interruption */
export type PathLabel = Omit<IRPathLabel, 'position' | 'side' | 'distance' | 'interrupt' | 'gap'> & {
  /** 标签在宿主路径上的归一化位置 */
  position: number;
  /** 标签相对路径的放置侧，center 表示居中 */
  side: NonNullable<IRPathLabel['side']>;
  /** 标签相对宿主边界的间距 */
  distance: number;
};

/** Path 请求宿主标签编译时提供的已定位几何信息 */
export type InputPathLabel = Readonly<{
  /** 标签配置相对宿主的来源路径，用于诊断 */
  sourcePath: PropertyPath;
  /** 按请求顺序排列的宿主标签 */
  labels: ReadonlyArray<PathLabel>;
  /** 与标签逐项对应的几何采样点及切线 */
  samples: ReadonlyArray<
    Readonly<{
      /** 宿主局部坐标中的采样位置 */
      point: IRPosition;
      /** 宿主在采样点的切向量 */
      tangent: IRPosition;
      /** 已由路径定义计算的侧向距离，省略时使用标签 distance */
      sideOffset?: number;
    }>
  >;
}>;

/** 由宿主几何确定边界基点的标签请求 */
export type InputPathBoundaryLabel = Readonly<{
  /** Kernel 共享标签配置 */
  label: IRBoundaryLabel;
  /** 宿主局部坐标中的边界支撑点 */
  point: IRPosition;
  /** 单位外向向量 */
  outward: IRPosition;
  /** 相对宿主的字段路径，用于失败诊断 */
  sourcePath: PropertyPath;
}>;

/**
 * path 编译上下文
 * @description 自定义路径可以完全接管输出，也可以调用回调复用标准描边逻辑
 * @template TPath 经当前路径定义的 schema 解析后的路径类型，决定 path 字段的结构；默认使用 IRPathBase
 */
export type PathCompileContext<TPath extends IRPathBase = IRPathBase> = {
  /** 经该 definition 完整 schema 解析后的 path subject */
  path: TPath;
  /** 物化选定 steps，不应用 marker、dash、fill 或 custom path geometry */
  materializePath: (input?: Readonly<{ children?: ReadonlyArray<IRStep> }>) => ReadonlyArray<PathCommand>;
  /**
   * 复用 core 标准描边编译逻辑；不传 path 时使用当前 `path`
   */
  emitStroke: StrokeEmitter;
  /** 合并宿主标签默认配置，供路径定义在采样前确定标签位置 */
  resolveHostLabel: (label: IRPathLabel) => IRPathLabel;
  /** 编译共享宿主标签，并支持路径定义提供侧向距离 */
  emitHostLabels: (input: InputPathLabel) => ReadonlyArray<ScenePrimitive>;
  /** 通过 Kernel 共享布局编译已定位的边界标签 */
  emitBoundaryLabels: (input: ReadonlyArray<InputPathBoundaryLabel>) => ReadonlyArray<ScenePrimitive>;
  /**
   * 包装自定义几何的完整输出，汇总宿主标签边界并应用 Path rotate / scale 与元数据
   * @description 在全部标签发射后调用一次并直接返回；emitStroke 的结果已包装，不应再次调用
   */
  wrapOutput: (output: PathCompileResult) => PathCompileResult;
  /** 已解析的 renderer-neutral 宿主外观 */
  appearance: CompiledPathAppearance;
  /** 与本次 compile 一致的取整函数 */
  round: (value: number) => number;
};

/**
 * 注册路径定义的解析与编译契约
 * @template TPath 完整路径 schema 的解析结果类型，同时决定编译上下文的 path 字段；默认使用 IRPathBase
 */
export type PathDefinition<TPath extends IRPathBase = IRPathBase> = {
  /** 非空 path registry key */
  name: string;
  /** 该 path 的完整 source subject schema */
  schema: ZodType<TPath>;
  /** 把该 path 编译成 Scene primitive；返回 null 表示该 path 不产生输出 */
  compile: (context: PathCompileContext<TPath>) => PathCompileResult | null;
};

/** 注册表中擦除路径声明泛型后的路径定义 */
export type AnyPathDefinition = Readonly<{
  /** 非空 path registry key */
  name: string;
  /** 该 Path 的完整 source subject schema */
  schema: ZodType;
  /** 只在恢复当前 definition 后调用的擦除编译入口 */
  compile: (context: never) => PathCompileResult | null;
}>;

/** 定义路径并保留 schema 与编译上下文的类型关联 */
export const definePath = <TPath extends IRPathBase = IRPathBase>(
  definition: PathDefinition<TPath>,
): PathDefinition<TPath> => definition;
