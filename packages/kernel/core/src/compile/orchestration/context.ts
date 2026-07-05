import type {
  ArrowDefinition,
  BoundaryDefinition,
  ClipDefinition,
  PathGeneratorDefinition,
  PathKindDefinition,
  PatternDefinition,
  RibbonWidthProfileDefinition,
  ShapeDefinition,
} from '../../contract';
import type { IRScene } from '../../schemas';
import type { CompileOptions } from '../compile';
import type { CompileWarning } from '../warning';

import { resolveArrowRegistry } from '../../providers/arrow';
import { resolveBoundaryRegistry } from '../../providers/boundary';
import { resolveClipRegistry } from '../../providers/clip';
import { resolveCompositeRegistry } from '../../providers/composite';
import { resolvePathGeneratorRegistry } from '../../providers/path-generator';
import { resolvePathKindRegistry } from '../../providers/path-kind';
import { resolvePatternRegistry } from '../../providers/pattern';
import { resolveRibbonWidthProfileRegistry } from '../../providers/ribbon';
import { resolveShapeRegistry } from '../../providers/shape';
import { DEFAULT_LAYOUT_PADDING, DEFAULT_NODE_DISTANCE } from '../constants';
import { createClipRegistry, createPaintRegistry } from '../resource';
import { createRound, DEFAULT_PRECISION } from '../scene';
import { fallbackMeasurer } from '../text';
import { formatCompileWarning } from '../warning';
import { lowerComposites } from './composite';

/**
 * 标准化后的 compile 依赖上下文
 * @description compileToScene 入口把选项、内置 provider、自定义 provider、资源表和 rounding 规则集中解析到这里；
 */
export type CompileContext = {
  /** composite lowering 后的 Tier 1 IR。 */
  loweredIr: IRScene;
  /** 文字度量函数。 */
  measureText: NonNullable<CompileOptions['measureText']>;
  /** 运行时注入的 TeX lowering 钩子。 */
  lowerTex: CompileOptions['lowerTex'];
  /** 编译 warning dispatcher。 */
  onWarn: (warning: CompileWarning) => void;
  /** Scene 输出 rounder。 */
  round: (n: number) => number;
  /** 自动 layout padding。 */
  layoutPadding: number;
  /** 相对定位距离。 */
  nodeDistance: number;
  /** shape provider 注册表。 */
  shapes: ReadonlyMap<string, ShapeDefinition>;
  /** boundary provider 注册表。 */
  boundaries: ReadonlyMap<string, BoundaryDefinition>;
  /** clip provider 注册表。 */
  clips: ReadonlyMap<string, ClipDefinition>;
  /** arrow provider 注册表。 */
  arrows: ReadonlyMap<string, ArrowDefinition>;
  /** pattern provider 注册表。 */
  patterns: ReadonlyMap<string, PatternDefinition>;
  /** path generator provider 注册表。 */
  pathGenerators: ReadonlyMap<string, PathGeneratorDefinition>;
  /** path kind provider 注册表。 */
  pathKinds: ReadonlyMap<string, PathKindDefinition>;
  /** ribbon width profile provider 注册表。 */
  ribbonWidthProfiles: ReadonlyMap<string, RibbonWidthProfileDefinition>;
  /** paint 资源注册表。 */
  paint: ReturnType<typeof createPaintRegistry>;
  /** clip 资源注册表。 */
  clip: ReturnType<typeof createClipRegistry>;
};

/** 创建 compile 编排所需的不可变依赖上下文。 */
export const createCompileContext = (ir: IRScene, options: CompileOptions): CompileContext => {
  const round = createRound(options.precision ?? DEFAULT_PRECISION);

  const defaultWarnDispatcher = (warning: CompileWarning): void => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
    console.warn(formatCompileWarning(warning));
  };
  const onWarn = options.onWarn ?? defaultWarnDispatcher;

  const clips = resolveClipRegistry(options.clips);
  const patterns = resolvePatternRegistry(options.patterns);

  return {
    loweredIr: lowerComposites(ir, resolveCompositeRegistry(options.composites), {
      onWarn,
      maxDepth: options.maxCompositeDepth,
    }),
    measureText: options.measureText ?? fallbackMeasurer,
    lowerTex: options.lowerTex,
    onWarn,
    round,
    layoutPadding: options.padding ?? DEFAULT_LAYOUT_PADDING,
    nodeDistance: options.nodeDistance ?? DEFAULT_NODE_DISTANCE,
    shapes: resolveShapeRegistry(options.shapes),
    boundaries: resolveBoundaryRegistry(options.boundaries),
    clips,
    arrows: resolveArrowRegistry(options.arrows),
    patterns,
    pathGenerators: resolvePathGeneratorRegistry(options.pathGenerators),
    pathKinds: resolvePathKindRegistry(options.pathKinds),
    ribbonWidthProfiles: resolveRibbonWidthProfileRegistry(options.ribbonWidthProfiles),
    paint: createPaintRegistry(patterns, round),
    clip: createClipRegistry(round, clips),
  };
};
