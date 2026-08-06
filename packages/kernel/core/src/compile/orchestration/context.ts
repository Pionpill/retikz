import type {
  AnyCompositeDefinition,
  AnyPathKindDefinition,
  ArrowDefinition,
  BoundaryDefinition,
  ClipDefinition,
  PathGeneratorDefinition,
  PatternDefinition,
  RibbonWidthProfileDefinition,
  ShapeDefinition,
} from '../../contract';
import type { IRScene } from '../../schemas';
import type { ResolvedTheme } from '../../shared';
import type { CompileOptions } from '../types';
import type { CompileWarningInput } from '../warning';
import type { PreparedCompileInspection } from './inspection';

import { resolveArrowRegistry } from '../../providers/arrow';
import { resolveBoundaryRegistry } from '../../providers/boundary';
import { resolveClipRegistry } from '../../providers/clip';
import { resolveCompositeRegistry } from '../../providers/composite';
import { resolvePathGeneratorRegistry } from '../../providers/path-generator';
import { resolvePathKindRegistry } from '../../providers/path-kind';
import { resolvePatternRegistry } from '../../providers/pattern';
import { resolveRibbonWidthProfileRegistry } from '../../providers/ribbon';
import { resolveShapeRegistry } from '../../providers/shape';
import { DEFAULT_FONT_SIZE, DEFAULT_LABEL_DISTANCE, DEFAULT_LAYOUT_PADDING, DEFAULT_NODE_DISTANCE } from '../constants';
import { createClipRegistry, createPaintRegistry } from '../resource';
import { createRound, DEFAULT_PRECISION } from '../scene';
import { fallbackMeasurer } from '../text';
import { formatCompileWarning } from '../warning';
import { DEFAULT_MAX_COMPOSITE_DEPTH } from './composite';
import { prepareCompileInspection } from './inspection';
import { DEFAULT_RESOLVED_THEME, resolveTheme } from './theme';

/**
 * 标准化后的 compile 依赖上下文
 * @description compileToScene 入口把选项、内置 provider、自定义 provider、资源表和 rounding 规则集中解析到这里；
 */
export type CompileContext = {
  /** canonical 输入 IR；composite 分支在 traversal 中保留 occurrence provenance 后处理 */
  loweredIr: IRScene;
  /** Scene 根解析后的完整 Theme */
  theme: ResolvedTheme;
  /** 文字度量函数 */
  measureText: NonNullable<CompileOptions['measureText']>;
  /** 运行时注入的 TeX lowering 钩子 */
  lowerTex: CompileOptions['lowerTex'];
  /** 编译 warning dispatcher */
  onWarn: (warning: CompileWarningInput) => void;
  /** layout-aware composite 注册表 */
  composites: ReadonlyMap<string, AnyCompositeDefinition>;
  /** expand 与 layout-aware compile 共用的嵌套深度上限 */
  maxCompositeDepth: number;
  /** 本次请求的 artifact 开关 */
  artifacts: CompileOptions['artifacts'];
  /** admission 后的 runtime-only inspection sidecar */
  inspection: PreparedCompileInspection | undefined;
  /** 本次 full compile 共享的可选 trace 计数器 */
  trace: { reporter: NonNullable<CompileOptions['trace']>; visited: number } | undefined;
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
  /** arrow provider 注册表 */
  arrows: ReadonlyMap<string, ArrowDefinition>;
  /** pattern provider 注册表 */
  patterns: ReadonlyMap<string, PatternDefinition>;
  /** path generator provider 注册表 */
  pathGenerators: ReadonlyMap<string, PathGeneratorDefinition>;
  /** path kind provider 注册表 */
  pathKinds: ReadonlyMap<string, AnyPathKindDefinition>;
  /** ribbon width profile provider 注册表 */
  ribbonWidthProfiles: ReadonlyMap<string, RibbonWidthProfileDefinition>;
  /** paint 资源注册表 */
  paint: ReturnType<typeof createPaintRegistry>;
  /** clip 资源注册表 */
  clip: ReturnType<typeof createClipRegistry>;
};

/** 创建内部编译上下文时允许接收尚未补全 origin 的 warning */
type CreateCompileContextOptions = Omit<CompileOptions, 'onWarn'> & {
  onWarn?: (warning: CompileWarningInput) => void;
};

/** 创建 compile 编排所需的不可变依赖上下文 */
export const createCompileContext = (ir: IRScene, options: CreateCompileContextOptions): CompileContext => {
  const round = createRound(options.precision ?? DEFAULT_PRECISION);
  const labelDistance = options.labelDistance ?? DEFAULT_LABEL_DISTANCE;
  if (!Number.isFinite(labelDistance) || labelDistance < 0) {
    throw new Error(`CompileOptions.labelDistance '${labelDistance}' must be a non-negative finite number`);
  }

  const defaultWarnDispatcher = (warning: CompileWarningInput): void => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
    console.warn(formatCompileWarning({ ...warning, origin: warning.origin ?? { kind: 'primary' } }));
  };
  const onWarn = options.onWarn ?? defaultWarnDispatcher;

  const clips = resolveClipRegistry(options.clips);
  const patterns = resolvePatternRegistry(options.patterns);
  const composites = resolveCompositeRegistry(options.composites);

  return {
    loweredIr: ir,
    theme: resolveTheme(DEFAULT_RESOLVED_THEME, ir.theme, 'scene.theme'),
    measureText: options.measureText ?? fallbackMeasurer,
    lowerTex: options.lowerTex,
    onWarn,
    composites,
    maxCompositeDepth: options.maxCompositeDepth ?? DEFAULT_MAX_COMPOSITE_DEPTH,
    artifacts: options.artifacts,
    inspection: prepareCompileInspection(ir, options.inspection),
    trace: options.trace === undefined ? undefined : { reporter: options.trace, visited: 0 },
    round,
    layoutPadding: options.padding ?? DEFAULT_LAYOUT_PADDING,
    nodeDistance: options.nodeDistance ?? DEFAULT_NODE_DISTANCE,
    labelDistance,
    rootFontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
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
