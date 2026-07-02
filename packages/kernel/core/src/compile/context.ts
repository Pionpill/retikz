import type { ArrowDefinition } from '../contract/arrow';
import type { BoundaryDefinition } from '../contract/boundary';
import type { ClipDefinition } from '../contract/clip';
import type { PathGeneratorDefinition } from '../contract/path';
import type { PathKindDefinition } from '../contract/path';
import type { PatternDefinition } from '../contract/pattern';
import type { RibbonWidthProfileDefinition } from '../contract/ribbon';
import type { ShapeDefinition } from '../contract/shape';
import type { IR } from '../schemas';
import type { CompileOptions } from './compile';
import type { CompileWarning } from './constant';

import { resolveArrowRegistry } from '../providers/arrow';
import { resolveBoundaryRegistry } from '../providers/boundary';
import { resolveClipRegistry } from '../providers/clip';
import { resolveCompositeRegistry } from '../providers/composite';
import { resolvePathGeneratorRegistry } from '../providers/path';
import { resolvePathKindRegistry } from '../providers/path-kind';
import { resolvePatternRegistry } from '../providers/pattern';
import { resolveRibbonWidthProfileRegistry } from '../providers/ribbon';
import { resolveShapeRegistry } from '../providers/shape';
import { createClipRegistry } from './clip';
import { lowerComposites } from './composite';
import { formatCompileWarning } from './constant';
import { createPaintRegistry } from './paint';
import { createRound, DEFAULT_PRECISION } from './precision';
import { fallbackMeasurer } from './text-metrics';

/**
 * 默认 warn dispatcher：dev 模式 console.warn、生产静默
 * @description 用户传 onWarn 时使用用户的；不传走此 fallback
 */
const defaultWarnDispatcher = (warning: CompileWarning): void => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
  console.warn(formatCompileWarning(warning));
};

/** 标准化后的 compile 依赖上下文。 */
export type CompileContext = {
  /** composite lowering 后的 Tier 1 IR。 */
  loweredIr: IR;
  /** 文字度量函数。 */
  measureText: NonNullable<CompileOptions['measureText']>;
  /** 自动 layout padding。 */
  layoutPadding: number;
  /** Scene 输出 rounder。 */
  round: (n: number) => number;
  /** 默认 node distance。 */
  nodeDistance: CompileOptions['nodeDistance'];
  /** 编译 warning dispatcher。 */
  onWarn: (warning: CompileWarning) => void;
  /** shape provider registry。 */
  shapes: ReadonlyMap<string, ShapeDefinition>;
  /** boundary provider registry。 */
  boundaries: ReadonlyMap<string, BoundaryDefinition>;
  /** clip provider registry。 */
  clips: ReadonlyMap<string, ClipDefinition>;
  /** path generator provider registry。 */
  pathGenerators: ReadonlyMap<string, PathGeneratorDefinition>;
  /** path kind provider registry。 */
  pathKinds: ReadonlyMap<string, PathKindDefinition>;
  /** ribbon width profile provider registry。 */
  ribbonWidthProfiles: ReadonlyMap<string, RibbonWidthProfileDefinition>;
  /** arrow provider registry。 */
  arrows: ReadonlyMap<string, ArrowDefinition>;
  /** pattern provider registry。 */
  patterns: ReadonlyMap<string, PatternDefinition>;
  /** paint resource registry。 */
  paint: ReturnType<typeof createPaintRegistry>;
  /** clip resource registry。 */
  clip: ReturnType<typeof createClipRegistry>;
  /** Runtime TeX lowering hook. */
  lowerTex: CompileOptions['lowerTex'];
};

/** 创建 compile 编排所需的不可变依赖上下文。 */
export const createCompileContext = (ir: IR, options: CompileOptions): CompileContext => {
  const measureText = options.measureText ?? fallbackMeasurer;
  const layoutPadding = options.padding ?? 10;
  const round = createRound(options.precision ?? DEFAULT_PRECISION);
  const onWarn = options.onWarn ?? defaultWarnDispatcher;

  const loweredIr = lowerComposites(ir, resolveCompositeRegistry(options.composites), {
    onWarn,
    maxDepth: options.maxCompositeDepth,
  });

  // provider registry 在 compile 入口统一 resolve：内置和自定义同表，duplicate key fail-loud。
  // compile 主流程只消费 resolved Map；unknown string-reference provider 仍 fail-fast。
  const shapes = resolveShapeRegistry(options.shapes);
  const boundaries = resolveBoundaryRegistry(options.boundaries);
  const clips = resolveClipRegistry(options.clips);
  const pathGenerators = resolvePathGeneratorRegistry(options.pathGenerators);
  const pathKinds = resolvePathKindRegistry(options.pathKinds);
  const ribbonWidthProfiles = resolveRibbonWidthProfileRegistry(options.ribbonWidthProfiles);
  const arrows = resolveArrowRegistry(options.arrows);
  const patterns = resolvePatternRegistry(options.patterns);

  return {
    loweredIr,
    measureText,
    layoutPadding,
    round,
    nodeDistance: options.nodeDistance,
    onWarn,
    shapes,
    boundaries,
    clips,
    pathGenerators,
    pathKinds,
    ribbonWidthProfiles,
    arrows,
    patterns,
    paint: createPaintRegistry(patterns, round),
    clip: createClipRegistry(round, clips),
    lowerTex: options.lowerTex,
  };
};
