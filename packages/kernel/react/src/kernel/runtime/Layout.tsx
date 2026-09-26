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
  ShapeDefinition,
  TextMeasurer,
  ThemeStyleDefinition,
} from '@retikz/core';
import type { AnimationControls, AnimationPropertyRegistry, EasingRegistry } from '@retikz/render/animation';
import { resolveAnimationEnabled } from '@retikz/render/animation';
import type { HydrationHandlers } from '@retikz/render/hydration';
import type { RuntimeDiagnostic } from '@retikz/runtime';
import type {
  InputScene,
  InputScope,
  ProcessingController,
  ProcessingOptions,
  ProcessingResult,
  ProcessingSource,
  VanillaCompileDriver,
} from '@retikz/vanilla';
import { createProcessingController, prepareStaticProcessing } from '@retikz/vanilla';
import type { CSSProperties, FC, ReactNode, Ref } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { RetikzReactError, RetikzReactErrorCode } from '../../error';
import { usePrefersReducedMotion } from '../../render/animation';
import { ProcessingResultHost } from '../../render/processing-result';
import { browserMeasurer } from '../../render/text';
import { pickScopeStyle, wrapRootScope } from '../adapter';
import { createInputScene } from '../adapter/input-scene';
import { useAnimationMode } from './animation-context';
import { collectHydrationHandlers } from './collect-hydration-handlers';
import { useRendererMode } from './renderer-context';
import type { LayoutRuntimeOptions } from './runtime-options';
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

/**
 * 为 Layout 注册自定义形状、箭头、裁剪及其他绘图扩展
 * @description 通过 Layout 的 extensions 属性传入，各字段接收对应的定义数组；这些运行时定义不写入可持久化的场景数据
 */
export type LayoutExtensions = Readonly<{
  /**
   * 形状定义
   * @default BUILTIN_SHAPES
   */
  shapes?: ReadonlyArray<ShapeDefinition>;
  /**
   * 连接表面定义
   * @default BUILTIN_BOUNDARIES
   */
  boundaries?: ReadonlyArray<BoundaryDefinition>;
  /**
   * 裁剪定义
   * @default BUILTIN_CLIPS
   */
  clips?: ReadonlyArray<ClipDefinition>;
  /**
   * 箭头定义
   * @default BUILTIN_ARROWS
   */
  arrows?: ReadonlyArray<ArrowDefinition>;
  /**
   * 图案定义
   * @default BUILTIN_PATTERNS
   */
  patterns?: ReadonlyArray<PatternDefinition>;
  /**
   * 路径生成器定义
   * @default BUILTIN_PATH_GENERATORS
   */
  pathGenerators?: ReadonlyArray<PathGeneratorDefinition>;
  /**
   * 路径种类定义
   * @default BUILTIN_PATH_KINDS
   */
  pathKinds?: ReadonlyArray<AnyPathKindDefinition>;
  /**
   * Tier 2 composite 展开逻辑
   * @default BUILTIN_COMPOSITES
   */
  composites?: ReadonlyArray<AnyCompositeDefinition>;
  /**
   * 主题样式定义
   * @default ThemeStylesContext
   */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
}>;

/** React Layout 的公开属性 */
export type LayoutProps = {
  /** JSX 子图的隐式根 Scope 覆盖；完整 ir 优先，style 宿主 CSS 独立生效 */
  rootScope?: Pick<InputScope, 'style' | 'defaults'>;
  /** 直接传入持久化 Source IR，与 children 二选一 */
  ir?: IRScene;
  /** 写入 Scene 根并由后代 Composite 继承的 Theme */
  theme?: IRScene['theme'];
  /** 通过 JSX 声明的图形内容 */
  children?: ReactNode;
  /** 供自定义 compileDriver 消费的 JSX 输入元数据；传入 ir 时忽略，不写入持久化 Scene IR */
  authoring?: unknown;
  /** 处理作者输入的编译驱动 */
  compileDriver?: VanillaCompileDriver;
  /** 直接传入 ir 时使用的事件处理函数表 */
  handlers?: HydrationHandlers;
  /**
   * 选择 retained 增量更新或 static 完整编译模式；省略时使用 retained
   * @default captureLayoutRuntimeOptions
   */
  runtime?: LayoutRuntimeOptions;
  /**
   * SVG 或 Canvas CSS 宽度；缺省按内容尺寸计算，单轴数值尺寸按内容比例补齐另一轴，CSS 字符串尺寸由浏览器排版
   * @default computeDisplaySize
   */
  width?: number | string;
  /**
   * SVG 或 Canvas CSS 高度；缺省按内容尺寸计算，单轴数值尺寸按内容比例补齐另一轴，CSS 字符串尺寸由浏览器排版
   * @default computeDisplaySize
   */
  height?: number | string;
  /** 显式视框，使用绘图坐标；优先于 ir.viewBox，省略时沿用场景视框，场景未指定时按内容计算 */
  viewBox?: IRViewBox;
  /** 宿主 className */
  className?: string;
  /** 宿主内联样式 */
  style?: CSSProperties;
  /**
   * 渲染后端；显式值优先，否则继承 Renderer 上下文，未提供上下文时使用 SVG
   * @default 'svg'
   */
  renderer?: 'svg' | 'canvas';
  /**
   * 是否播放动画；由动画模式上下文优先决定，未指定时遵循系统减少动态效果偏好
   * @default resolveAnimationEnabled
   */
  animate?: boolean;
  /** 动画采样时刻，单位为毫秒；指定后定格在该时刻，不播放动画，优先于 animate */
  snapshotAt?: number;
  /** 动画控制器出口 */
  animationRef?: Ref<AnimationControls | null>;
  /** Scene 根动画 */
  animations?: ReadonlyArray<IRAnimationTrack>;
  /** 动画缓动函数注册表 */
  easings?: EasingRegistry;
  /** 可动画属性注册表 */
  animationProperties?: AnimationPropertyRegistry;
  /**
   * SVG 资源 id 前缀；省略时由 React useId 生成
   * @default useId
   */
  idPrefix?: string;
  /**
   * 节点相对定位的默认距离，单位为绘图单位；position 使用 direction/of 且省略 distance 时生效
   * @default 24
   */
  nodeDistance?: number;
  /**
   * 默认字号，单位为绘图单位；font.size 缺省时使用，同时作为字号预设与 rem 的根字号，不覆盖显式数字字号
   * @default 16
   */
  fontSize?: number;
  /** 按能力分类的运行时扩展注册，复用 Core 编译契约 */
  extensions?: LayoutExtensions;
  /** 公式下沉能力 */
  lowerTex?: LowerTex;
  /** 请求生成的编译附加产物 */
  artifacts?: CompileArtifactOptions;
  /** 编译附加产物成功提交后的通知 */
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
 * 将 JSX 图形或场景 IR 渲染为 SVG 或 Canvas，并接入更新与动画
 * @description 通过 children 声明图形，或通过 ir 传入完整场景；同时提供时使用 ir。默认使用 retained 模式处理后续更新，可通过 runtime 切换为 static 完整编译模式
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
    extensions,
    lowerTex,
    artifacts,
    onArtifacts,
    onCompileResult,
    rootScope,
  } = props;
  const { shapes, boundaries, clips, arrows, patterns, pathGenerators, pathKinds, composites, themeStyles } =
    extensions ?? {};
  const resolvedRuntime = captureLayoutRuntimeOptions(runtime);
  const stableShapes = canonicalizeDefinitionArray(shapes);
  const stableBoundaries = canonicalizeDefinitionArray(boundaries);
  const stableClips = canonicalizeDefinitionArray(clips);
  const stableArrows = canonicalizeDefinitionArray(arrows);
  const stablePatterns = canonicalizeDefinitionArray(patterns);
  const stablePathGenerators = canonicalizeDefinitionArray(pathGenerators);
  const stablePathKinds = canonicalizeDefinitionArray(pathKinds);
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
  const scopeStyle = useMemo(() => rootScope ?? {}, [rootScope]);
  const hasScopeStyle = Object.keys(pickScopeStyle(scopeStyle)).length > 0;
  if (process.env.NODE_ENV !== 'production' && irFromProp !== undefined && hasScopeStyle) {
    warnOnce('[retikz] <Layout>：同时提供 `ir` 与 `rootScope` 时，`rootScope` 被忽略，`ir` 已是完整 IR');
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
        throw new RetikzReactError(RetikzReactErrorCode.Kernel, '[retikz] <Layout> requires ir or children');
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
