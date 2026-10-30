import type { CoreProviderDefinitions, ThemeDefinition } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import {
  resolveArrowRegistry,
  resolveBoundaryRegistry,
  resolveClipRegistry,
  resolveCompositeRegistry,
  resolveMarkRegistry,
  resolvePathRegistry,
  resolvePatternRegistry,
  resolveShapeRegistry,
  resolveThemeRegistry,
} from '../../providers';
import type { CompositeRegistry } from '../../resolve';
import { DEFAULT_FONT_SIZE, DEFAULT_LABEL_DISTANCE, DEFAULT_NODE_DISTANCE } from '../constants';
import { DEFAULT_MAX_CLIP_DEPTH } from '../resource';
import { createRound, DEFAULT_PRECISION } from '../scene';
import { fallbackMeasurer } from '../text';
import type { CompileHostOptions, CompileLayoutOptions, CompileOptions } from '../types';

/** 复合组件递归深度上限 */
const DEFAULT_MAX_COMPOSITE_DEPTH = 32;

/** 已合并内置与调用方定义的有效编译注册表 */
export type CompileContextRegistries = Readonly<{
  /** 形状定义索引 */
  shapeRegistry: ReadonlyMap<string, NonNullable<CoreProviderDefinitions['shapes']>[number]>;
  /** 连接面定义索引 */
  boundaryRegistry: ReadonlyMap<string, NonNullable<CoreProviderDefinitions['boundaries']>[number]>;
  /** 裁剪定义索引 */
  clipRegistry: ReadonlyMap<string, NonNullable<CoreProviderDefinitions['clips']>[number]>;
  /** 箭头定义索引 */
  arrowRegistry: ReadonlyMap<string, NonNullable<CoreProviderDefinitions['arrows']>[number]>;
  /** 路径标记定义索引 */
  markRegistry: ReadonlyMap<string, NonNullable<CoreProviderDefinitions['marks']>[number]>;
  /** 图案定义索引 */
  patternRegistry: ReadonlyMap<string, NonNullable<CoreProviderDefinitions['patterns']>[number]>;
  /** 路径定义索引 */
  pathRegistry: ReadonlyMap<string, NonNullable<CoreProviderDefinitions['paths']>[number]>;
  /** 按命名空间与类型索引的复合定义 */
  compositeRegistry: CompositeRegistry;
  /** 主题定义索引 */
  themeRegistry: ReadonlyMap<string, ThemeDefinition>;
}>;

/** 宿主注入的稳定服务，诊断出口由单次工作区持有 */
export type CompileContextHost = Readonly<{
  /** 已补齐默认实现的文字度量函数 */
  measureText: NonNullable<CompileHostOptions['measureText']>;
  /** 运行时注入的 TeX lowering 钩子 */
  lowerTex: CompileHostOptions['lowerTex'];
}>;

/** 已补齐默认值的布局与输出配置 */
export type CompileContextLayout = Readonly<
  Required<Pick<CompileLayoutOptions, 'nodeDistance' | 'labelDistance'>> & {
    /** Scene 输出 rounder，由 precision 创建 */
    round: (n: number) => number;
    /** preset 与 rem 字号解析的根字号 */
    rootFontSize: NonNullable<CompileLayoutOptions['fontSize']>;
  }
>;

/** 编译展开与资源转换的遍历限制 */
export type CompileContextLimits = Readonly<{
  /** 复合编译的嵌套深度上限 */
  maxCompositeDepth: NonNullable<CompileOptions['maxCompositeDepth']>;
  /** 单次裁剪转换允许访问的声明数量 */
  maxClipDepth: NonNullable<CompileOptions['maxClipDepth']>;
}>;

/** 可跨次共享的编译配置与服务，不持有输入树或本次资源工作区 */
export type SharedCompileContext = Readonly<{
  /** 跨次复用的有效定义索引 */
  registries: CompileContextRegistries;
  /** 宿主注入的稳定服务 */
  host: CompileContextHost;
  /** 已补齐默认值的布局与输出配置 */
  layout: CompileContextLayout;
  /** 编译展开与资源转换的遍历限制 */
  limits: CompileContextLimits;
}>;

/** 共享编译上下文的创建选项，不包含单次输入、观测及诊断接收器 */
export type SharedCompileContextOptions = Omit<CompileOptions, 'onWarn' | 'trace' | 'compositeInputs' | 'padding'>;

/** 创建共享编译上下文；服务或定义行为变化时必须替换共享上下文 */
export const createSharedCompileContext = (options: SharedCompileContextOptions = {}): SharedCompileContext => {
  const precision = options.precision ?? DEFAULT_PRECISION;
  if (!Number.isInteger(precision) || precision < 0 || !Number.isFinite(10 ** precision)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `CompileOptions.precision '${precision}' must be a non-negative integer with a finite rounding factor`,
    );
  }

  const nodeDistance = options.nodeDistance ?? DEFAULT_NODE_DISTANCE;
  if (!Number.isFinite(nodeDistance)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `CompileOptions.nodeDistance '${nodeDistance}' must be a finite number`,
    );
  }
  const labelDistance = options.labelDistance ?? DEFAULT_LABEL_DISTANCE;
  if (!Number.isFinite(labelDistance) || labelDistance < 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `CompileOptions.labelDistance '${labelDistance}' must be a non-negative finite number`,
    );
  }

  const rootFontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  if (!Number.isFinite(rootFontSize) || rootFontSize <= 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `CompileOptions.fontSize must be a positive finite number; received ${rootFontSize}.`,
    );
  }

  const maxCompositeDepth = options.maxCompositeDepth ?? DEFAULT_MAX_COMPOSITE_DEPTH;
  if (!Number.isSafeInteger(maxCompositeDepth) || maxCompositeDepth < 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `CompileOptions.maxCompositeDepth '${maxCompositeDepth}' must be a non-negative safe integer`,
    );
  }

  const maxClipDepth = options.maxClipDepth ?? DEFAULT_MAX_CLIP_DEPTH;
  if (!Number.isSafeInteger(maxClipDepth) || maxClipDepth < 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `CompileOptions.maxClipDepth '${maxClipDepth}' must be a non-negative safe integer`,
    );
  }

  // mark 定义复用同一份箭头注册表
  const arrows = resolveArrowRegistry(options.arrows);

  return Object.freeze({
    host: Object.freeze({
      measureText: options.measureText ?? fallbackMeasurer,
      lowerTex: options.lowerTex,
    }),
    layout: Object.freeze({
      round: createRound(precision),
      nodeDistance,
      labelDistance,
      rootFontSize,
    }),
    limits: Object.freeze({
      maxCompositeDepth,
      maxClipDepth,
    }),
    registries: Object.freeze({
      shapeRegistry: resolveShapeRegistry(options.shapes),
      boundaryRegistry: resolveBoundaryRegistry(options.boundaries),
      clipRegistry: resolveClipRegistry(options.clips),
      arrowRegistry: arrows,
      markRegistry: resolveMarkRegistry(options.marks, arrows),
      patternRegistry: resolvePatternRegistry(options.patterns),
      pathRegistry: resolvePathRegistry(options.paths),
      compositeRegistry: resolveCompositeRegistry(options.composites),
      themeRegistry: resolveThemeRegistry(options.themeDefinitions),
    }),
  });
};
