import type { JsonValue } from '@retikz/foundation';
import type { ZodType } from 'zod';

import type {
  IRBoundaryLabel,
  IRGeometryLabel,
  IRLine,
  IRMathRun,
  IRPathBase,
  IRPosition,
  IRStep,
  IRTextRun,
} from '../../schemas';
import type { CompileOwnerOutputDefinition, CompileOwnerOutputPublisher } from '../observation';
import type { PathCommand, PathPrim, ScenePrimitive } from '../scene';
import type { StrokePathOwnerOutput } from './owner-output';

/**
 * path kind 编译结果
 * @description path kind definition 把高层 path 形态编译成当前 Path 局部坐标系中的 Scene primitive，
 *   并返回同一坐标系内参与 bbox / transform 计算的关键点集合
 */
export type PathKindCompileResult = {
  /** 当前 Path 局部坐标系中的实际渲染输出 */
  primitives: Array<ScenePrimitive>;
  /** 当前 Path 局部坐标系中的 layout 与路径级 rotate / scale 几何依据 */
  boundsPoints: Array<IRPosition>;
};

/** 异构 registry 消费 Path kind 结果时使用的擦除形态 */
export type AnyPathKindCompileResult = Readonly<{
  /** 当前 Path 局部坐标系中的实际渲染输出 */
  primitives: ReadonlyArray<ScenePrimitive>;
  /** 当前 Path 局部坐标系中的布局与变换几何依据 */
  boundsPoints: ReadonlyArray<IRPosition>;
}>;

/** 内置 stroke emitter 的可选 owner output 捕获请求 */
export type EmitStrokeOwnerOutputOptions = Readonly<{
  /** 接收标准描边编译完成后的所属者产物 */
  captureOwnerOutput: (value: StrokePathOwnerOutput) => void;
}>;

/** 复用内置 stroke compile 的 overload contract */
export type EmitStroke = {
  /** 只返回普通 Path kind compile 结果 */
  (path?: IRPathBase): PathKindCompileResult | null;
  /** 同时捕获由最终 settled commands 组成的 owner output */
  (path: IRPathBase | undefined, options: EmitStrokeOwnerOutputOptions): PathKindCompileResult | null;
};

/** Core 将 Path steps 物化后的 renderer-neutral 几何事实 */
export type MaterializedPath = Readonly<{
  /** 物化后的结构化路径命令 */
  commands: ReadonlyArray<PathCommand>;
  /** 用于计算路径几何边界的点集 */
  boundsPoints: ReadonlyArray<IRPosition>;
}>;

/** Path kind 可消费的宿主外观，不包含领域专属字段 */
export type ResolvedPathKindAppearance = Readonly<
  Readonly<{
    /** 宿主生效的主色，保留至选定的路径种类消费 */
    color?: NonNullable<IRPathBase['style']>['color'];
  }> &
    Pick<
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

type PathKindInlineRun<T> = T extends unknown ? Omit<T, 'fill'> & { fill?: string } : never;

type PathKindLabelTextLine =
  | string
  | (Omit<Extract<IRLine, { text: string }>, 'fill'> & { fill?: string })
  | {
      runs: Array<PathKindInlineRun<IRTextRun | IRMathRun>>;
    };

type PathKindLabelText = PathKindLabelTextLine | Array<PathKindLabelTextLine>;

/** Path kind 请求宿主标签编译时提供的已定位几何信息，不包含 Stroke 专属 interruption */
export type PathKindLabel = Omit<
  IRGeometryLabel,
  'position' | 'side' | 'distance' | 'textColor' | 'text' | 'interrupt'
> & {
  /** 标签在宿主路径上的归一化位置 */
  position: number;
  /** 标签相对路径的放置侧，center 表示居中 */
  side: NonNullable<IRGeometryLabel['side']> | 'center';
  /** 标签相对宿主边界的间距 */
  distance: number;
  /** 已解析为颜色字符串的可选文字色 */
  textColor?: string;
  /** 待排版的标签文本及行内内容 */
  text: PathKindLabelText;
};

/** Path kind 请求宿主标签编译时提供的已定位几何信息 */
export type PathKindLabelInput = Readonly<{
  /** 按请求顺序排列的宿主标签 */
  labels: ReadonlyArray<PathKindLabel>;
  /** 与标签逐项对应的几何采样点及切线 */
  samples: ReadonlyArray<
    Readonly<{
      /** 宿主局部坐标中的采样位置 */
      point: IRPosition;
      /** 宿主在采样点的切向量 */
      tangent: IRPosition;
      /** 从采样线到宿主边界的偏移，省略时视为零 */
      boundaryOffset?: number;
    }>
  >;
}>;

/** 由宿主几何确定边界基点的标签请求 */
export type PathKindBoundaryLabelInput = Readonly<{
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
 * path kind 编译上下文
 * @description 自定义 kind 可以完全接管输出，也可以调用回调复用标准描边逻辑
 * @template TPath 经当前路径定义的 schema 解析后的路径类型，决定 path 字段的结构；默认使用 IRPathBase
 * @template TOwnerOutput 通过 ownerOutput.publish 发布的 JSON 产物类型；默认 never 表示不发布所属者产物
 */
export type PathKindCompileContext<TPath extends IRPathBase = IRPathBase, TOwnerOutput extends JsonValue = never> = {
  /** 经该 definition 完整 schema 解析后的 path subject */
  path: TPath;
  /** 当前 Path kind 的最终所属者产物 publisher */
  ownerOutput: CompileOwnerOutputPublisher<TOwnerOutput>;
  /** 物化选定 steps，不应用 marker、dash、fill 或 kind-specific geometry */
  materializePath: (input?: Readonly<{ children?: ReadonlyArray<IRStep> }>) => MaterializedPath;
  /**
   * 复用 core 标准描边编译逻辑；不传 path 时使用当前 `path`
   */
  emitStroke: EmitStroke;
  /** 编译共享宿主标签，并支持 kind 提供边界偏移 */
  emitHostLabels: (input: PathKindLabelInput) => ReadonlyArray<ScenePrimitive>;
  /** 通过 Kernel 共享布局编译已定位的边界标签 */
  emitBoundaryLabels: (input: ReadonlyArray<PathKindBoundaryLabelInput>) => ReadonlyArray<ScenePrimitive>;
  /**
   * 包装自定义几何的完整输出，汇总宿主标签边界并应用 Path rotate / scale 与元数据
   * @description 在全部标签发射后调用一次并直接返回；emitStroke 的结果已包装，不应再次调用
   */
  wrapOutput: (output: PathKindCompileResult) => PathKindCompileResult;
  /** 已解析的 renderer-neutral 宿主外观 */
  appearance: ResolvedPathKindAppearance;
  /** 与本次 compile 一致的取整函数 */
  round: (value: number) => number;
};

/**
 * path kind 注册项
 * @description 扩展 path 的 `kind` 编译能力；定义本身不进入 IR
 * @template TOwnerOutput 路径所属者发布的 JSON 产物类型，never 禁止声明 ownerOutput
 */
export type PathKindOwnerOutputBranch<TOwnerOutput extends JsonValue> = [TOwnerOutput] extends [never]
  ? Readonly<{ ownerOutput?: never }>
  : Readonly<{ ownerOutput: CompileOwnerOutputDefinition<TOwnerOutput> }>;

/**
 * 注册路径种类的解析、编译与可选所属者产物契约
 * @template TPath 完整路径 schema 的解析结果类型，同时决定编译上下文的 path 字段；默认使用 IRPathBase
 * @template TOwnerOutput 所属者产物的 JSON 类型；默认 never 时不能声明 ownerOutput，否则必须提供对应的产物 schema
 */
export type PathKindDefinition<TPath extends IRPathBase = IRPathBase, TOwnerOutput extends JsonValue = never> = {
  /** 非空 path kind registry key */
  name: string;
  /** 该 path kind 的完整 source subject schema */
  schema: ZodType<TPath>;
  /** 把该 path kind 编译成 Scene primitive；返回 null 表示该 path 不产生输出 */
  compile: (context: PathKindCompileContext<TPath, TOwnerOutput>) => PathKindCompileResult | null;
} & PathKindOwnerOutputBranch<TOwnerOutput>;

/** registry 中擦除 subject 与 options 泛型后的 Path kind 定义 */
export type AnyPathKindDefinition = Readonly<{
  /** 非空 path kind registry key */
  name: string;
  /** 该 Path kind 的完整 source subject schema */
  schema: ZodType;
  /** 只在恢复当前 definition 后调用的擦除编译入口 */
  compile: (context: never) => AnyPathKindCompileResult | null;
  /** 可选最终所属者产物 schema */
  ownerOutput?: CompileOwnerOutputDefinition;
}>;
