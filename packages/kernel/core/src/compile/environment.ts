import type {
  AnyCompositeDefinition,
  AnyPathKindDefinition,
  ArrowDefinition,
  BoundaryDefinition,
  ClipDefinition,
  PathGeneratorDefinition,
  PatternDefinition,
  ShapeDefinition,
  ThemeDefinition,
} from '../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../error';
import {
  resolveArrowRegistry,
  resolveBoundaryRegistry,
  resolveClipRegistry,
  resolveCompositeRegistry,
  resolvePathGeneratorRegistry,
  resolvePathKindRegistry,
  resolvePatternRegistry,
  resolveShapeRegistry,
  resolveThemeRegistry,
} from '../providers';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_LABEL_DISTANCE,
  DEFAULT_LAYOUT_PADDING,
  DEFAULT_NODE_DISTANCE,
  DEFAULT_MAX_COMPOSITE_DEPTH,
} from './constants';
import { DEFAULT_MAX_CLIP_DEPTH } from './resource';
import { createRound, DEFAULT_PRECISION } from './scene';
import { fallbackMeasurer } from './text';
import type { CompileOptions } from './types';

/** 编译能力定义、稳定配置与宿主服务；不持有输入树或本次资源工作区 */
export type CompileEnvironment = Readonly<{
  /** Core 主题风格注册表 */
  themeDefinitions: ReadonlyMap<string, ThemeDefinition>;
  /** 文字度量函数 */
  measureText: NonNullable<CompileOptions['measureText']>;
  /** 运行时注入的 TeX lowering 钩子 */
  lowerTex: CompileOptions['lowerTex'];
  /** layout-aware composite 注册表 */
  composites: ReadonlyMap<string, AnyCompositeDefinition>;
  /** 复合编译的嵌套深度上限 */
  maxCompositeDepth: number;
  /** 本次请求的 artifact 开关 */
  artifacts: CompileOptions['artifacts'];
  /** Scene 输出 rounder */
  round: (n: number) => number;
  /** 自动 layout padding */
  layoutPadding: number;
  /** 相对定位距离 */
  nodeDistance: number;
  /** 节点 label 默认距离 */
  labelDistance: number;
  /** preset 与 rem 字号解析的根字号 */
  rootFontSize: number;
  /** shape provider 注册表 */
  shapes: ReadonlyMap<string, ShapeDefinition>;
  /** boundary provider 注册表 */
  boundaries: ReadonlyMap<string, BoundaryDefinition>;
  /** clip provider 注册表 */
  clips: ReadonlyMap<string, ClipDefinition>;
  /** operation resolve 与 shape lower 共用的最大遍历边数 */
  maxClipDepth: number;
  /** arrow provider 注册表 */
  arrows: ReadonlyMap<string, ArrowDefinition>;
  /** pattern provider 注册表 */
  patterns: ReadonlyMap<string, PatternDefinition>;
  /** path generator provider 注册表 */
  pathGenerators: ReadonlyMap<string, PathGeneratorDefinition>;
  /** path kind provider 注册表 */
  pathKinds: ReadonlyMap<string, AnyPathKindDefinition>;
}>;

/** 可跨次持有的编译环境选项，不包含单次输入、观测及诊断接收器 */
export type CompileEnvironmentOptions = Omit<CompileOptions, 'onWarn' | 'trace' | 'compositeInputs'>;

/** 创建稳定编译环境；服务或定义行为变化时必须替换环境 */
export const createCompileEnvironment = (options: CompileEnvironmentOptions = {}): CompileEnvironment => {
  const round = createRound(options.precision ?? DEFAULT_PRECISION);
  const labelDistance = options.labelDistance ?? DEFAULT_LABEL_DISTANCE;
  if (!Number.isFinite(labelDistance) || labelDistance < 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `CompileOptions.labelDistance '${labelDistance}' must be a non-negative finite number`,
    );
  }

  const clips = resolveClipRegistry(options.clips);
  const maxClipDepth = options.maxClipDepth ?? DEFAULT_MAX_CLIP_DEPTH;
  if (!Number.isSafeInteger(maxClipDepth) || maxClipDepth < 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `CompileOptions.maxClipDepth '${maxClipDepth}' must be a non-negative safe integer`,
    );
  }

  const patterns = resolvePatternRegistry(options.patterns);
  const composites = resolveCompositeRegistry(options.composites);
  const themeDefinitions = resolveThemeRegistry(options.themeDefinitions);

  return Object.freeze({
    themeDefinitions,
    measureText: options.measureText ?? fallbackMeasurer,
    lowerTex: options.lowerTex,
    composites,
    maxCompositeDepth: options.maxCompositeDepth ?? DEFAULT_MAX_COMPOSITE_DEPTH,
    artifacts: options.artifacts,
    round,
    layoutPadding: options.padding ?? DEFAULT_LAYOUT_PADDING,
    nodeDistance: options.nodeDistance ?? DEFAULT_NODE_DISTANCE,
    labelDistance,
    rootFontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
    shapes: resolveShapeRegistry(options.shapes),
    boundaries: resolveBoundaryRegistry(options.boundaries),
    clips,
    maxClipDepth,
    arrows: resolveArrowRegistry(options.arrows),
    patterns,
    pathGenerators: resolvePathGeneratorRegistry(options.pathGenerators),
    pathKinds: resolvePathKindRegistry(options.pathKinds),
  });
};
