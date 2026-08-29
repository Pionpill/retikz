import type { ZodType } from 'zod';

import type { IRGeometryLabel, IRMathRun, IRPathBase, IRPosition, IRStep, IRTextRun, JsonValue } from '../../schemas';
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
  commands: ReadonlyArray<PathCommand>;
  boundsPoints: ReadonlyArray<IRPosition>;
}>;

/** Path kind 可消费的宿主外观，不包含领域专属字段 */
export type ResolvedPathKindAppearance = Readonly<
  Readonly<{
    /** Effective host master color, retained until the selected kind consumes it */
    color?: IRPathBase['color'];
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

type PathKindLabelText =
  | string
  | {
      runs: Array<PathKindInlineRun<IRTextRun | IRMathRun>>;
    };

/** Path kind 请求宿主标签编译时提供的已定位几何信息 */
export type PathKindLabel = Omit<IRGeometryLabel, 'position' | 'side' | 'distance' | 'textColor' | 'text'> & {
  position: number;
  side: NonNullable<IRGeometryLabel['side']> | 'center';
  distance: number;
  textColor?: string;
  text: PathKindLabelText;
};

/** Path kind 请求宿主标签编译时提供的已定位几何信息 */
export type PathKindLabelInput = Readonly<{
  labels: ReadonlyArray<PathKindLabel>;
  samples: ReadonlyArray<Readonly<{ point: IRPosition; tangent: IRPosition; boundaryOffset?: number }>>;
}>;

/**
 * path kind 编译上下文
 * @description 自定义 kind 可以完全接管输出，也可以调用回调复用标准描边逻辑
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
   * @default 使用当前 `path`
   */
  emitStroke: EmitStroke;
  /** 编译共享宿主标签，并支持 kind 提供边界偏移 */
  emitHostLabels: (input: PathKindLabelInput) => ReadonlyArray<ScenePrimitive>;
  /** 已解析的 renderer-neutral 宿主外观 */
  appearance: ResolvedPathKindAppearance;
  /** 与本次 compile 一致的取整函数 */
  round: (value: number) => number;
};

/**
 * path kind 注册项
 * @description 扩展 path 的 `kind` 编译能力；定义本身不进入 IR
 */
export type PathKindOwnerOutputBranch<TOwnerOutput extends JsonValue> = [TOwnerOutput] extends [never]
  ? Readonly<{ ownerOutput?: never }>
  : Readonly<{ ownerOutput: CompileOwnerOutputDefinition<TOwnerOutput> }>;

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
