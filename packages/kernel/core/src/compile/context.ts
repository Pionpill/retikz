import type { ArrowDefinition } from '../contract';
import type { BoundaryDefinition } from '../contract';
import type { ClipDefinition } from '../contract';
import type { PathGeneratorDefinition } from '../contract';
import type { PathKindDefinition } from '../contract';
import type { PatternDefinition } from '../contract';
import type { RibbonWidthProfileDefinition } from '../contract';
import type { ShapeDefinition } from '../contract';
import type { IR } from '../schemas';
import type { CompileOptions } from './compile';
import type { CompileWarning } from './constant';

import { resolveArrowRegistry } from '../providers/arrow';
import { resolveBoundaryRegistry } from '../providers/boundary';
import { resolveClipRegistry } from '../providers/clip';
import { resolveCompositeRegistry } from '../providers/composite';
import { resolvePathGeneratorRegistry } from '../providers/path-generator';
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
 * 默认 warning 分发器：开发模式写到 console.warn，生产环境静默
 * @description 用户传入 onWarn 时使用用户回调；未传时走此兜底逻辑。
 */
const defaultWarnDispatcher = (warning: CompileWarning): void => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
  console.warn(formatCompileWarning(warning));
};

/**
 * 标准化后的 compile 依赖上下文
 * @description compileToScene 入口把选项、内置 provider、自定义 provider、资源表和 rounding 规则集中解析到这里；
 *   traversal / emit 阶段只消费已解析结果，不再重复合并注册表。
 */
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
  /** shape provider 注册表。 */
  shapes: ReadonlyMap<string, ShapeDefinition>;
  /** boundary provider 注册表。 */
  boundaries: ReadonlyMap<string, BoundaryDefinition>;
  /** clip provider 注册表。 */
  clips: ReadonlyMap<string, ClipDefinition>;
  /** path generator provider 注册表。 */
  pathGenerators: ReadonlyMap<string, PathGeneratorDefinition>;
  /** path kind provider 注册表。 */
  pathKinds: ReadonlyMap<string, PathKindDefinition>;
  /** ribbon width profile provider 注册表。 */
  ribbonWidthProfiles: ReadonlyMap<string, RibbonWidthProfileDefinition>;
  /** arrow provider 注册表。 */
  arrows: ReadonlyMap<string, ArrowDefinition>;
  /** pattern provider 注册表。 */
  patterns: ReadonlyMap<string, PatternDefinition>;
  /** paint 资源注册表。 */
  paint: ReturnType<typeof createPaintRegistry>;
  /** clip 资源注册表。 */
  clip: ReturnType<typeof createClipRegistry>;
  /** 运行时注入的 TeX lowering 钩子。 */
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

  // provider 注册表在 compile 入口统一 resolve：内置和自定义同表，重复 key 直接报错。
  // compile 主流程只消费已解析 Map；未知字符串引用 provider 时仍立即报错。
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
