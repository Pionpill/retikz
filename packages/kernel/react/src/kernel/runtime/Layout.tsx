import type {
  AnyCompositeDefinition,
  AnyPathKindDefinition,
  ArrowDefinition,
  BoundaryDefinition,
  ClipDefinition,
  CompileArtifact,
  CompileArtifactOptions,
  CompileOptions,
  CompileResult,
  IRAnimationTrack,
  IRScene,
  IRViewBox,
  LowerTex,
  PathGeneratorDefinition,
  PatternDefinition,
  RibbonWidthProfileDefinition,
  ShapeDefinition,
  TextMeasurer,
  ThemeStyleDefinition,
} from '@retikz/core';
import type { AnimationControls, AnimationPropertyRegistry, EasingRegistry } from '@retikz/render/animation';
import type { HydrationHandlers } from '@retikz/render/hydration';
import type { RuntimeDiagnostic } from '@retikz/runtime';
import type {
  InputScene,
  ProcessingController,
  ProcessingOptions,
  ProcessingResult,
  ProcessingSource,
  VanillaCompileDriver,
} from '@retikz/vanilla';
import type { CSSProperties, FC, ReactNode, Ref } from 'react';

import { resolveAnimationEnabled } from '@retikz/render/animation';
import { createProcessingController, prepareStaticProcessing } from '@retikz/vanilla';
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import type { ScopeStyleProps } from '../protocol';
import type { LayoutRuntimeOptions } from './runtime-options';

import { usePrefersReducedMotion } from '../../render/animation';
import { ProcessingResultHost } from '../../render/processing-result';
import { browserMeasurer } from '../../render/text';
import { pickScopeStyle, wrapRootScope } from '../adapter';
import { createInputScene } from '../adapter/input-scene';
import { useAnimationMode } from './animation-context';
import { collectHydrationHandlers } from './collect-hydration-handlers';
import { useRendererMode } from './renderer-context';
import { captureLayoutRuntimeOptions, LayoutRuntimeMode } from './runtime-options';
import { mergeThemeOverlays, useTheme } from './theme-context';
import { mergeThemeStyleDefinitions, useThemeStyles } from './theme-styles-context';

const styleFontFamily = (style: CSSProperties | undefined): string | undefined => {
  const fontFamily = style?.fontFamily;
  return typeof fontFamily === 'string' && fontFamily.trim().length > 0 ? fontFamily : undefined;
};

/** 同一条诊断消息进程内只告警一次 */
const warnedMessages = new Set<string>();
let nextProcessingControllerKey = 0;

const warnOnce = (message: string): void => {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(message);
};

/** 判断两个 sparse Theme 是否具有完全相同的 selector */
const isSameTheme = (left: IRScene['theme'] | undefined, right: IRScene['theme'] | undefined): boolean =>
  left?.style === right?.style && left?.mode === right?.mode;

/** 为固定 processing options 创建仅供 React 重挂载使用的内部 key */
const createProcessingControllerKey = (): number => {
  nextProcessingControllerKey += 1;
  return nextProcessingControllerKey;
};

/** 判断 processing diagnostics 中的值是否为 Runtime 的结构化诊断 */
const isRuntimeDiagnostic = (diagnostic: unknown): diagnostic is RuntimeDiagnostic => {
  if (typeof diagnostic !== 'object' || diagnostic === null) return false;
  const candidate = diagnostic as Record<string, unknown>;
  return (
    typeof candidate.code === 'string' &&
    typeof candidate.phase === 'string' &&
    (candidate.severity === 'warning' || candidate.severity === 'error') &&
    typeof candidate.message === 'string'
  );
};

/** 逐条隔离通知 Runtime 结构化诊断，避免回调异常影响已提交 processing result */
const deliverProcessingDiagnostics = (
  controller: ProcessingController,
  callback: ((diagnostic: RuntimeDiagnostic) => void) | undefined,
): void => {
  for (const diagnostic of controller.diagnostics()) {
    if (!isRuntimeDiagnostic(diagnostic) || callback === undefined) continue;
    try {
      callback(diagnostic);
    } catch (cause) {
      if (process.env.NODE_ENV !== 'production') console.warn('[retikz] <Layout> onDiagnostic callback failed', cause);
    }
  }
};

type DefinitionArrayNode = {
  children: WeakMap<object, DefinitionArrayNode>;
  value?: ReadonlyArray<object>;
};

const definitionArrayRoot: DefinitionArrayNode = { children: new WeakMap() };

/** 按有序元素 identity 规范化 Definition 容器，避免等价 inline 数组重建 processing controller */
const canonicalizeDefinitionArray = <TDefinition extends object>(
  definitions: ReadonlyArray<TDefinition> | undefined,
): ReadonlyArray<TDefinition> | undefined => {
  if (definitions === undefined || definitions.length === 0) return undefined;
  let current = definitionArrayRoot;
  for (const definition of definitions) {
    let child = current.children.get(definition);
    if (child === undefined) {
      child = { children: new WeakMap() };
      current.children.set(definition, child);
    }
    current = child;
  }
  current.value ??= Object.freeze([...definitions]);
  return current.value as ReadonlyArray<TDefinition>;
};

/** 将浏览器 text measurer 叠加 Layout style 的默认字体 */
const withDefaultFontFamily = (measureText: TextMeasurer, defaultFontFamily: string | undefined): TextMeasurer => {
  if (defaultFontFamily === undefined) return measureText;
  return (text, font) =>
    measureText(text, {
      ...font,
      family: typeof font.family === 'string' && font.family.trim().length > 0 ? font.family : defaultFontFamily,
    });
};

/** React Layout 的公开属性 */
export type LayoutProps = ScopeStyleProps & {
  /** 直接传入持久化 Source IR，与 children 二选一 */
  ir?: IRScene;
  /** 写入 Scene 根并由后代 Composite 继承的 Theme */
  theme?: IRScene['theme'];
  /** Kernel 或 Sugar JSX children */
  children?: ReactNode;
  /** 只供 Vanilla compile driver 消费的 runtime metadata */
  authoring?: unknown;
  /** Vanilla 领域中立 compile driver */
  compileDriver?: VanillaCompileDriver;
  /** IR 模式下的水合 handler 注册表 */
  handlers?: HydrationHandlers;
  /** retained 或 static processing 模式 */
  runtime?: LayoutRuntimeOptions;
  /** SVG 或 Canvas CSS 宽度 */
  width?: number | string;
  /** SVG 或 Canvas CSS 高度 */
  height?: number | string;
  /** 显式视框 */
  viewBox?: IRViewBox;
  /** 宿主 className */
  className?: string;
  /** 宿主内联样式 */
  style?: CSSProperties;
  /** 渲染目标 */
  renderer?: 'svg' | 'canvas';
  /** 是否播放动画 */
  animate?: boolean;
  /** 静态动画采样时刻 */
  snapshotAt?: number;
  /** 动画控制器出口 */
  animationRef?: Ref<AnimationControls | null>;
  /** Scene 根动画 */
  animations?: ReadonlyArray<IRAnimationTrack>;
  /** easing registry */
  easings?: EasingRegistry;
  /** animation property registry */
  animationProperties?: AnimationPropertyRegistry;
  /** SVG 资源 id 前缀 */
  idPrefix?: string;
  /** 默认 node 距离 */
  nodeDistance?: number;
  /** 默认字号 */
  fontSize?: number;
  /** 自定义形状定义 */
  shapes?: ReadonlyArray<ShapeDefinition>;
  /** 自定义边界定义 */
  boundaries?: ReadonlyArray<BoundaryDefinition>;
  /** 自定义裁剪定义 */
  clips?: ReadonlyArray<ClipDefinition>;
  /** 自定义箭头定义 */
  arrows?: ReadonlyArray<ArrowDefinition>;
  /** 自定义 pattern 定义 */
  patterns?: ReadonlyArray<PatternDefinition>;
  /** 自定义 path generator 定义 */
  pathGenerators?: ReadonlyArray<PathGeneratorDefinition>;
  /** 自定义 path kind 定义 */
  pathKinds?: ReadonlyArray<AnyPathKindDefinition>;
  /** 自定义 ribbon 宽度 profile */
  ribbonWidthProfiles?: ReadonlyArray<RibbonWidthProfileDefinition>;
  /** Tier 2 composite definitions */
  composites?: ReadonlyArray<AnyCompositeDefinition>;
  /** Core Theme style definitions */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
  /** 公式下沉能力 */
  lowerTex?: LowerTex;
  /** artifact 请求 */
  artifacts?: CompileArtifactOptions;
  /** artifacts 成功提交通知 */
  onArtifacts?: (artifacts: ReadonlyArray<CompileArtifact>) => void;
  /** Core 完整编译结果通知 */
  onCompileResult?: (result: CompileResult) => void;
};

/** 订阅 Vanilla retained controller 的最后一次成功 result，在提交前回退静态结果 */
const useProcessingResult = (
  controller: ProcessingController | undefined,
  fallbackResult: ProcessingResult,
): ProcessingResult => {
  const subscribe = useCallback(
    (notify: () => void) => (controller === undefined ? () => undefined : controller.subscribe(() => notify())),
    [controller],
  );
  const read = useCallback(() => controller?.read() ?? fallbackResult, [controller, fallbackResult]);
  return useSyncExternalStore(subscribe, read, read);
};

/** Processing result 宿主需要的固定属性 */
type LayoutResultHostProps = Omit<React.ComponentProps<typeof ProcessingResultHost>, 'result'>;

/** static 模式只执行一次无生命周期的 Vanilla processing */
const StaticLayoutContent: FC<{
  source: ProcessingSource;
  options: ProcessingOptions;
  hostKey: string;
  hostProps: LayoutResultHostProps;
}> = ({ source, options, hostKey, hostProps }) => {
  const processing = useMemo(() => prepareStaticProcessing(source, options, 0), [source, options]);
  useEffect(() => {
    processing.commit();
  }, [processing]);
  return <ProcessingResultHost key={hostKey} {...hostProps} result={processing.result} />;
};

/** retained 模式复用同一 Vanilla controller，仅将后续 source 推入 update */
const RetainedLayoutContent: FC<{
  source: ProcessingSource;
  options: ProcessingOptions;
  onDiagnostic?: (diagnostic: RuntimeDiagnostic) => void;
  hostKey: string;
  hostProps: LayoutResultHostProps;
}> = ({ source, options, onDiagnostic, hostKey, hostProps }) => {
  const [fallbackResult] = useState(() => prepareStaticProcessing(source, options, 0).result);
  const [controller, setController] = useState<ProcessingController | undefined>(undefined);
  const currentSourceRef = useRef(source);
  const result = useProcessingResult(controller, fallbackResult);
  const appliedSourceRef = useRef<Readonly<{ controller: ProcessingController; source: ProcessingSource }> | undefined>(
    undefined,
  );
  const pendingDisposalRef = useRef<
    Readonly<{ controller: ProcessingController; timer: ReturnType<typeof setTimeout> }> | undefined
  >(undefined);
  const onDiagnosticRef = useRef(onDiagnostic);
  useEffect(() => {
    onDiagnosticRef.current = onDiagnostic;
  }, [onDiagnostic]);
  useEffect(() => {
    currentSourceRef.current = source;
  }, [source]);
  useEffect(() => {
    const nextController = createProcessingController(currentSourceRef.current, options);
    setController(nextController);
    return () => {
      const timer = setTimeout(() => {
        nextController.dispose();
        if (pendingDisposalRef.current?.timer === timer) pendingDisposalRef.current = undefined;
      });
      pendingDisposalRef.current = { controller: nextController, timer };
    };
  }, [options]);
  useEffect(() => {
    if (controller === undefined) return;
    const previous = appliedSourceRef.current;
    try {
      if (previous?.controller === controller && previous.source !== source) controller.update(source);
      appliedSourceRef.current = { controller, source };
    } catch {
      // controller 已记录受控诊断，保留最后一次成功 result 以维持现有宿主帧
    } finally {
      deliverProcessingDiagnostics(controller, onDiagnosticRef.current);
    }
  }, [controller, source]);
  const resultHostProps =
    controller === undefined ? { ...hostProps, onArtifacts: undefined, onCompileResult: undefined } : hostProps;
  return <ProcessingResultHost key={hostKey} {...resultHostProps} result={result} />;
};

/**
 * React Layout：JSX 转 Vanilla Input，随后只宿主化 Vanilla processing result
 * @description React 不创建 Core Program、Runtime session 或 retained renderer；所有处理状态归 Vanilla
 */
export const Layout: FC<LayoutProps> = props => {
  const {
    ir: irFromProp,
    theme,
    children,
    authoring,
    compileDriver,
    handlers,
    runtime,
    width,
    height,
    viewBox,
    className,
    style,
    renderer: rendererProp,
    animate: animateProp,
    snapshotAt,
    animationRef,
    animations: rootAnimations,
    easings,
    animationProperties,
    idPrefix,
    nodeDistance,
    fontSize,
    shapes,
    boundaries,
    clips,
    arrows,
    patterns,
    pathGenerators,
    pathKinds,
    ribbonWidthProfiles,
    composites,
    themeStyles,
    lowerTex,
    artifacts,
    onArtifacts,
    onCompileResult,
    color,
    stroke,
    fill,
    strokeWidth,
    opacity,
    fillOpacity,
    strokeOpacity,
    nodeDefault,
    pathDefault,
    labelDefault,
    arrowDefault,
  } = props;
  const resolvedRuntime = captureLayoutRuntimeOptions(runtime);
  const stableShapes = canonicalizeDefinitionArray(shapes);
  const stableBoundaries = canonicalizeDefinitionArray(boundaries);
  const stableClips = canonicalizeDefinitionArray(clips);
  const stableArrows = canonicalizeDefinitionArray(arrows);
  const stablePatterns = canonicalizeDefinitionArray(patterns);
  const stablePathGenerators = canonicalizeDefinitionArray(pathGenerators);
  const stablePathKinds = canonicalizeDefinitionArray(pathKinds);
  const stableRibbonWidthProfiles = canonicalizeDefinitionArray(ribbonWidthProfiles);
  const stableComposites = canonicalizeDefinitionArray(composites);
  const ambientThemeStyles = useThemeStyles();
  const stableThemeStyles = canonicalizeDefinitionArray(
    useMemo(() => mergeThemeStyleDefinitions(ambientThemeStyles, themeStyles), [ambientThemeStyles, themeStyles]),
  );
  const reducedMotion = usePrefersReducedMotion();
  const animationMode = useAnimationMode();
  const contextRenderer = useRendererMode();
  const animate = resolveAnimationEnabled(
    animationMode === undefined ? animateProp : animationMode === 'system' ? undefined : animationMode === 'enabled',
    reducedMotion,
  );
  const renderer = rendererProp ?? contextRenderer ?? 'svg';
  const ambientTheme = useTheme();
  const scopeStyle = useMemo<ScopeStyleProps>(
    () => ({
      color,
      stroke,
      fill,
      strokeWidth,
      opacity,
      fillOpacity,
      strokeOpacity,
      nodeDefault,
      pathDefault,
      labelDefault,
      arrowDefault,
    }),
    [
      color,
      stroke,
      fill,
      strokeWidth,
      opacity,
      fillOpacity,
      strokeOpacity,
      nodeDefault,
      pathDefault,
      labelDefault,
      arrowDefault,
    ],
  );
  const hasScopeStyle = Object.keys(pickScopeStyle(scopeStyle)).length > 0;
  if (process.env.NODE_ENV !== 'production' && irFromProp !== undefined && hasScopeStyle) {
    warnOnce('[retikz] <Layout>：同时提供 `ir` 与级联样式 props 时，样式 props 被忽略——`ir` 已是完整 IR');
  }

  const reactInput = useMemo(() => {
    if (irFromProp !== undefined) return undefined;
    const input = createInputScene(wrapRootScope(children, scopeStyle));
    return Object.freeze({
      ...input,
      scene: {
        ...input.scene,
        ...(authoring === undefined ? {} : { authoring }),
      },
    });
  }, [authoring, children, irFromProp, scopeStyle]);
  const stableInputAdapters = canonicalizeDefinitionArray(reactInput?.adapters);
  const source = useMemo<ProcessingSource>(() => {
    const base: ProcessingSource =
      irFromProp ??
      reactInput?.scene ??
      (() => {
        throw new Error('[retikz] <Layout> requires ir or children');
      })();
    const mergedTheme = mergeThemeOverlays(ambientTheme, base.theme, theme);
    const themed =
      mergedTheme === undefined || isSameTheme(base.theme, mergedTheme) ? base : { ...base, theme: mergedTheme };
    const viewed = viewBox === undefined ? themed : { ...themed, viewBox };
    if (rootAnimations === undefined) return viewed;
    const animations = viewed.animations === undefined ? rootAnimations : [...viewed.animations, ...rootAnimations];
    return { ...viewed, animations } as InputScene;
  }, [ambientTheme, irFromProp, reactInput, rootAnimations, theme, viewBox]);
  const defaultFontFamily = styleFontFamily(style);
  const measureText = useMemo(() => withDefaultFontFamily(browserMeasurer, defaultFontFamily), [defaultFontFamily]);
  const compileArtifacts = useMemo<CompileArtifactOptions | undefined>(
    () => (artifacts?.nodeLayouts === true ? { nodeLayouts: true } : undefined),
    [artifacts?.nodeLayouts],
  );
  const processingOptions = useMemo<ProcessingOptions>(
    () => ({
      compileDriver,
      ...(stableInputAdapters === undefined ? {} : { adapters: stableInputAdapters }),
      ...(resolvedRuntime.updateStrategy === undefined ? {} : { updateStrategy: resolvedRuntime.updateStrategy }),
      compile: {
        measureText,
        nodeDistance,
        fontSize,
        shapes: stableShapes,
        boundaries: stableBoundaries,
        clips: stableClips,
        arrows: stableArrows,
        patterns: stablePatterns,
        pathGenerators: stablePathGenerators,
        pathKinds: stablePathKinds,
        ribbonWidthProfiles: stableRibbonWidthProfiles,
        composites: stableComposites,
        themeStyles: stableThemeStyles,
        lowerTex,
        artifacts: compileArtifacts,
      } satisfies CompileOptions,
    }),
    [
      compileDriver,
      stableInputAdapters,
      resolvedRuntime.updateStrategy,
      measureText,
      nodeDistance,
      fontSize,
      stableShapes,
      stableBoundaries,
      stableClips,
      stableArrows,
      stablePatterns,
      stablePathGenerators,
      stablePathKinds,
      stableRibbonWidthProfiles,
      stableComposites,
      stableThemeStyles,
      lowerTex,
      compileArtifacts,
    ],
  );
  const rawId = useId();
  const processingControllerIdentity = useMemo(
    () => Object.freeze({ options: processingOptions, key: createProcessingControllerKey() }),
    [processingOptions],
  );
  const resolvedIdPrefix = idPrefix ?? rawId.replace(/[^a-zA-Z0-9]/g, '');
  const resolvedHandlers = useMemo(
    () => (irFromProp === undefined ? collectHydrationHandlers(children) : (handlers ?? {})),
    [children, handlers, irFromProp],
  );

  const hostProps: LayoutResultHostProps = {
    backend: renderer,
    handlers: resolvedHandlers,
    width,
    height,
    className,
    style,
    animate,
    snapshotAt,
    animationRef,
    easings,
    animationProperties,
    idPrefix: resolvedIdPrefix,
    onArtifacts,
    onCompileResult,
  };
  const hostKey = `${resolvedRuntime.mode}:${renderer}:${resolvedIdPrefix}`;
  return resolvedRuntime.mode === LayoutRuntimeMode.Static ? (
    <StaticLayoutContent source={source} options={processingOptions} hostKey={hostKey} hostProps={hostProps} />
  ) : (
    <RetainedLayoutContent
      key={processingControllerIdentity.key}
      source={source}
      options={processingOptions}
      onDiagnostic={resolvedRuntime.onDiagnostic}
      hostKey={hostKey}
      hostProps={hostProps}
    />
  );
};
