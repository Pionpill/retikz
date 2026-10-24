import type { JsonValue } from '@retikz/foundation';
import type { ZodType } from 'zod';

import type { IRBoundaryLabel, IRPathLabel, IRPathBase, IRPosition, IRStep, IRTransform } from '../schemas';
import type { CompileOwnerOutputPublisher } from './observation';
import type { PathCommand, PathPrim, ScenePrimitive } from './scene';

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

/** 内置 stroke emitter 的可选 owner output 捕获请求 */
export type EmitStrokeOwnerOutputOptions = Readonly<{
  /** 接收标准描边编译完成后的所属者产物 */
  captureOwnerOutput: (value: StrokePathOwnerOutput) => void;
}>;

/** 编译标准描边，可通过 options 捕获描边几何产物 */
export type StrokeEmitter = (path?: IRPathBase, options?: EmitStrokeOwnerOutputOptions) => PathCompileResult | null;

/** Path 可消费的宿主外观，不包含领域专属字段 */
export type ResolvedPathAppearance = Readonly<
  {
    /** 宿主生效的主色，保留至选定的路径定义消费 */
    color?: NonNullable<IRPathBase['style']>['color'];
  } & Pick<
    PathPrim,
    | 'fill'
    | 'stroke'
    | 'fillOpacity'
    | 'fillRule'
    | 'strokeOpacity'
    | 'strokeWidth'
    | 'dashPattern'
    | 'dashOffset'
    | 'strokeLinecap'
    | 'strokeLinejoin'
    | 'opacity'
    | 'shadow'
    | 'blendMode'
  >
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
export type PathLabelInput = Readonly<{
  /** 标签配置相对宿主的来源路径，用于诊断 */
  sourcePath: string;
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
export type PathBoundaryLabelInput = Readonly<{
  /** Kernel 共享标签配置 */
  label: IRBoundaryLabel;
  /** 宿主局部坐标中的边界支撑点 */
  point: IRPosition;
  /** 单位外向向量 */
  outward: IRPosition;
  /** 相对宿主的字段路径，用于失败诊断 */
  sourcePath: string;
}>;

/**
 * path 编译上下文
 * @description 自定义路径可以完全接管输出，也可以调用回调复用标准描边逻辑
 * @template TPath 经当前路径定义的 schema 解析后的路径类型，决定 path 字段的结构；默认使用 IRPathBase
 * @template TOwnerOutput 通过 ownerOutput.publish 发布的 JSON 产物类型；默认 never 表示不发布所属者产物
 */
export type PathCompileContext<TPath extends IRPathBase = IRPathBase, TOwnerOutput extends JsonValue = never> = {
  /** 经该 definition 完整 schema 解析后的 path subject */
  path: TPath;
  /** 当前 Path 的最终所属者产物 publisher */
  ownerOutput: CompileOwnerOutputPublisher<TOwnerOutput>;
  /** 物化选定 steps，不应用 marker、dash、fill 或 custom path geometry */
  materializePath: (input?: Readonly<{ children?: ReadonlyArray<IRStep> }>) => ReadonlyArray<PathCommand>;
  /**
   * 复用 core 标准描边编译逻辑；不传 path 时使用当前 `path`
   */
  emitStroke: StrokeEmitter;
  /** 合并宿主标签默认配置，供路径定义在采样前确定标签位置 */
  resolveHostLabel: (label: IRPathLabel) => IRPathLabel;
  /** 编译共享宿主标签，并支持路径定义提供侧向距离 */
  emitHostLabels: (input: PathLabelInput) => ReadonlyArray<ScenePrimitive>;
  /** 通过 Kernel 共享布局编译已定位的边界标签 */
  emitBoundaryLabels: (input: ReadonlyArray<PathBoundaryLabelInput>) => ReadonlyArray<ScenePrimitive>;
  /**
   * 包装自定义几何的完整输出，汇总宿主标签边界并应用 Path rotate / scale 与元数据
   * @description 在全部标签发射后调用一次并直接返回；emitStroke 的结果已包装，不应再次调用
   */
  wrapOutput: (output: PathCompileResult) => PathCompileResult;
  /** 已解析的 renderer-neutral 宿主外观 */
  appearance: ResolvedPathAppearance;
  /** 与本次 compile 一致的取整函数 */
  round: (value: number) => number;
};

/**
 * 注册路径定义的解析、编译与可选所属者产物契约
 * @template TPath 完整路径 schema 的解析结果类型，同时决定编译上下文的 path 字段；默认使用 IRPathBase
 * @template TOwnerOutput 所属者产物的 JSON 类型；默认 never 时不能声明 ownerOutput，否则必须声明发布产物
 */
export type PathDefinition<TPath extends IRPathBase = IRPathBase, TOwnerOutput extends JsonValue = never> = {
  /** 非空 path registry key */
  name: string;
  /** 该 path 的完整 source subject schema */
  schema: ZodType<TPath>;
  /** 把该 path 编译成 Scene primitive；返回 null 表示该 path 不产生输出 */
  compile: (context: PathCompileContext<TPath, TOwnerOutput>) => PathCompileResult | null;
} & ([TOwnerOutput] extends [never] ? Readonly<{ ownerOutput?: never }> : Readonly<{ ownerOutput: true }>);

/** registry 中擦除 subject 与 options 泛型后的 Path 定义 */
export type AnyPathDefinition = Readonly<{
  /** 非空 path registry key */
  name: string;
  /** 该 Path 的完整 source subject schema */
  schema: ZodType;
  /** 只在恢复当前 definition 后调用的擦除编译入口 */
  compile: (context: never) => PathCompileResult | null;
  /** 是否发布最终所属者产物 */
  ownerOutput?: true;
}>;

/** 内置 stroke Path 的最终所属者产物 */
export type StrokePathOwnerOutput = {
  /** Path 局部坐标系中的最终命令 */
  commands: Array<PathCommand>;
  /** 同一坐标系下的路径变换 */
  transforms: Array<IRTransform>;
};

/**
 * 定义不发布所属者产物的路径定义
 * @template TPath 经定义 schema 解析后的路径类型，默认使用 IRPathBase
 * @param definition 包含名称、完整路径 schema 和编译函数的定义
 * @returns 原定义对象，保留路径类型，不复制或修改输入
 */
export function definePath<TPath extends IRPathBase = IRPathBase>(
  definition: PathDefinition<TPath, never>,
): PathDefinition<TPath, never>;
/**
 * 定义发布所属者产物的路径定义
 * @template TPath 经定义 schema 解析后的路径类型
 * @template TOwnerOutput 通过编译上下文发布的 JSON 产物类型
 * @param definition 包含路径定义及 ownerOutput 发布标记的定义
 * @returns 原定义对象，保留路径和产物类型，不复制或修改输入
 */
export function definePath<TPath extends IRPathBase, TOwnerOutput extends JsonValue>(
  definition: PathDefinition<TPath, TOwnerOutput>,
): PathDefinition<TPath, TOwnerOutput>;
/** 定义路径，保留路径及所属者产物的类型关联 */
export function definePath<TDefinition>(definition: TDefinition): TDefinition {
  return definition;
}
