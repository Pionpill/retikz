import type {
  AnyCompositeDefinition,
  AnyPathDefinition,
  ArrowDefinition,
  BoundaryDefinition,
  ClipDefinition,
  IRAnimationTrack,
  IRScene,
  IRViewBox,
  MarkDefinition,
  PatternDefinition,
  ShapeDefinition,
  TexLowerer,
  TextMeasurer,
  ThemeDefinition,
} from '@retikz/core';
import { ReconcilerMode } from '@retikz/reconciler';
import type { CompositeArtifact } from '@retikz/reconciler';
import type { CompileOptions, CompileResult } from '@retikz/reconciler';
import type { ReconcilerDiagnostic } from '@retikz/reconciler';
import type { AnimationControls } from '@retikz/render/animation';
import { resolveAnimationEnabled } from '@retikz/render/animation';
import type { HydrationHandlers } from '@retikz/render/hydration';
import type { InputScene, ProcessOptions } from '@retikz/vanilla';
import { isInputScene, SceneRuntime, compileToScene } from '@retikz/vanilla';
import type { CSSProperties, FC, ReactNode, Ref } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { RetikzReactError, RetikzReactErrorCode } from '../../../error';
import { collectHydrationHandlers } from '../../../hydration';
import { ProcessingResultHost } from '../../../render/processing-result';
import { usePrefersReducedMotion } from '../../../render/reduced-motion';
import { KernelDisplayName } from '../../../shared';
import type { ScopeStyleProps } from '../../kernel';
import { useAnimationMode } from '../animation-mode';
import { useRendererMode } from '../renderer-mode';
import { mergeThemeOverlays, useTheme } from '../theme';
import { mergeThemeDefinitions, useThemeDefinitions } from '../theme';
import { createInputScene } from './input-scene';
import { pickScopeStyle, wrapRootScope } from './root-scope';
import type { LayoutRuntimeOptions } from './runtime-options';
import { LayoutRuntimeMode } from './runtime-options';

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
  left?.name === right?.name && left?.mode === right?.mode;

/** 为固定 processing options 创建仅供 React 重挂载使用的内部 key */
const createProcessingControllerKey = (): number => {
  nextProcessingControllerKey += 1;
  return nextProcessingControllerKey;
};

/** 判断 processing diagnostics 中的值是否为 Runtime 的结构化诊断 */
const isReconcilerDiagnostic = (diagnostic: unknown): diagnostic is ReconcilerDiagnostic => {
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
  controller: Pick<SceneRuntime, 'diagnostics'>,
  callback: ((diagnostic: ReconcilerDiagnostic) => void) | undefined,
): void => {
  for (const diagnostic of controller.diagnostics()) {
    if (!isReconcilerDiagnostic(diagnostic) || callback === undefined) continue;

    try {
      callback(diagnostic);
    } catch (cause) {
      if (__DEV__) console.warn('[retikz] <Layout> onDiagnostic callback failed', cause);
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

/**
 * 为 Layout 注册自定义形状、箭头、裁剪及其他绘图扩展
 * @description 通过 Layout 的 extensions 属性传入，各字段接收对应的定义数组；这些运行时定义不写入可持久化的场景数据
 */
export type LayoutExtensions = Readonly<{
  /**
   * 形状定义
   * @default undefined
   */
  shapes?: ReadonlyArray<ShapeDefinition>;
  /**
   * 连接表面定义
   * @default undefined
   */
  boundaries?: ReadonlyArray<BoundaryDefinition>;
  /**
   * 裁剪定义
   * @default undefined
   */
  clips?: ReadonlyArray<ClipDefinition>;
  /**
   * 箭头定义
   * @default undefined
   */
  arrows?: ReadonlyArray<ArrowDefinition>;
  /** 沿路径放置的标记定义 */
  marks?: ReadonlyArray<MarkDefinition>;
  /**
   * 图案定义
   * @default undefined
   */
  patterns?: ReadonlyArray<PatternDefinition>;
  /**
   * 路径定义
   * @default undefined
   */
  paths?: ReadonlyArray<AnyPathDefinition>;
  /**
   * Tier 2 composite 展开逻辑
   * @default []
   */
  composites?: ReadonlyArray<AnyCompositeDefinition>;
  /**
   * 主题样式定义
   * @default ThemeDefinitionsContext
   */
  themeDefinitions?: ReadonlyArray<ThemeDefinition>;
}>;

/** React Layout 的公开属性 */
export type LayoutProps = {
  /** 自定义文字测量；省略时使用 Vanilla 的环境测量与估算降级 */
  measureText?: TextMeasurer;
  /** JSX 子图的隐式根 Scope 覆盖；完整 ir 优先，style 宿主 CSS 独立生效 */
  rootScope?: ScopeStyleProps;
  /** 直接传入持久化 Source IR，与 children 二选一 */
  ir?: IRScene;
  /** 写入 Scene 根并由后代 Composite 继承的 Theme */
  theme?: IRScene['theme'];
  /** 通过 JSX 声明的图形内容 */
  children?: ReactNode;
  /** 归一化时收集的 JSX 作者元数据；传入 ir 时忽略，不写入持久化 Scene IR */
  authoring?: unknown;
  /** 直接传入 ir 时使用的事件处理函数表 */
  handlers?: HydrationHandlers;
  /**
   * 选择 session 增量更新或 static 完整编译模式；省略时使用 session
   * @default LayoutRuntimeMode.Session
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
  lowerTex?: TexLowerer;
  /** 编译附加产物成功提交后的通知 */
  onArtifacts?: (artifacts: ReadonlyArray<CompositeArtifact>) => void;
  /** Core 完整编译结果通知 */
  onCompileResult?: (result: CompileResult) => void;
};

/** 订阅 Vanilla session controller 的最后一次成功 result，在提交前回退静态结果 */
const useProcessingResult = (controller: SceneRuntime | undefined, fallbackResult: CompileResult): CompileResult => {
  const subscribe = useCallback(
    (notify: () => void) => (controller === undefined ? () => undefined : controller.subscribe(() => notify())),
    [controller],
  );
  const read = () => controller?.current.compilation.result ?? fallbackResult;

  return useSyncExternalStore(subscribe, read, read);
};

/** Processing result 宿主需要的固定属性 */
type LayoutResultHostProps = Omit<React.ComponentProps<typeof ProcessingResultHost>, 'result'>;

/** static 模式只执行一次无生命周期的 Vanilla processing */
const StaticLayoutContent: FC<{
  source: InputScene | IRScene;
  options: ProcessOptions;
  hostKey: string;
  hostProps: LayoutResultHostProps;
}> = ({ source, options, hostKey, hostProps }) => {
  const result = useMemo(() => compileToScene(source, options), [source, options]);
  return <ProcessingResultHost key={hostKey} {...hostProps} result={result} />;
};

/** session 模式复用同一 Vanilla controller，仅将后续 source 推入 update */
const SessionLayoutContent: FC<{
  source: InputScene | IRScene;
  options: ProcessOptions;
  onDiagnostic?: (diagnostic: ReconcilerDiagnostic) => void;
  hostKey: string;
  hostProps: LayoutResultHostProps;
}> = ({ source, options, onDiagnostic, hostKey, hostProps }) => {
  const [fallbackResult] = useState(() => compileToScene(source, options));
  const [controller, setController] = useState<SceneRuntime | undefined>(undefined);
  const currentSourceRef = useRef(source);
  const result = useProcessingResult(controller, fallbackResult);
  const appliedSourceRef = useRef<Readonly<{ controller: SceneRuntime; source: InputScene | IRScene }> | undefined>(
    undefined,
  );
  const pendingDisposalRef = useRef<
    Readonly<{ controller: SceneRuntime; timer: ReturnType<typeof setTimeout> }> | undefined
  >(undefined);

  const onDiagnosticRef = useRef(onDiagnostic);
  useEffect(() => {
    onDiagnosticRef.current = onDiagnostic;
  }, [onDiagnostic]);

  useEffect(() => {
    currentSourceRef.current = source;
  }, [source]);

  useEffect(() => {
    const nextController = isInputScene(currentSourceRef.current)
      ? SceneRuntime.fromInput(currentSourceRef.current, options)
      : new SceneRuntime(currentSourceRef.current, options);
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
      if (previous?.controller === controller && previous.source !== source) {
        controller.replace(source);
      }
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
 * @description 通过 children 声明图形，或通过 ir 传入完整场景；同时提供时使用 ir。默认使用 session 模式处理后续更新，可通过 runtime 切换为 static 完整编译模式
 */
export const Layout: FC<LayoutProps> = props => {
  const {
    measureText,
    ir: irFromProp,
    theme,
    children,
    authoring,
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

    idPrefix,
    nodeDistance,
    fontSize,
    extensions,
    lowerTex,
    onArtifacts,
    onCompileResult,
    rootScope,
  } = props;

  const { shapes, boundaries, clips, arrows, marks, patterns, paths, composites, themeDefinitions } = extensions ?? {};
  const { mode = LayoutRuntimeMode.Session, updateStrategy, onDiagnostic } = runtime ?? {};
  const stableShapes = canonicalizeDefinitionArray(shapes);
  const stableBoundaries = canonicalizeDefinitionArray(boundaries);
  const stableClips = canonicalizeDefinitionArray(clips);
  const stableArrows = canonicalizeDefinitionArray(arrows);
  const stableMarks = canonicalizeDefinitionArray(marks);
  const stablePatterns = canonicalizeDefinitionArray(patterns);
  const stablePaths = canonicalizeDefinitionArray(paths);
  const stableComposites = canonicalizeDefinitionArray(composites);
  const ambientThemeDefinitions = useThemeDefinitions();
  const stableThemeDefinitions = canonicalizeDefinitionArray(
    useMemo(
      () => mergeThemeDefinitions(ambientThemeDefinitions, themeDefinitions),
      [ambientThemeDefinitions, themeDefinitions],
    ),
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
  if (__DEV__) {
    if (irFromProp !== undefined && Object.keys(pickScopeStyle(scopeStyle)).length > 0) {
      warnOnce('[retikz] <Layout>：同时提供 `ir` 与 `rootScope` 时，`rootScope` 被忽略，`ir` 已是完整 IR');
    }
  }

  const reactInput = useMemo(() => {
    if (irFromProp !== undefined) return undefined;

    const input = createInputScene(wrapRootScope(children, scopeStyle));

    return authoring === undefined ? input : { ...input, authoring };
  }, [authoring, children, irFromProp, scopeStyle]);

  const source = useMemo<InputScene | IRScene>(() => {
    const base: InputScene | IRScene =
      irFromProp ??
      reactInput ??
      (() => {
        throw new RetikzReactError(RetikzReactErrorCode.Kernel, '[retikz] <Layout> requires ir or children');
      })();
    const mergedTheme = mergeThemeOverlays(ambientTheme, base.theme, theme);
    const themed =
      mergedTheme === undefined || isSameTheme(base.theme, mergedTheme) ? base : { ...base, theme: mergedTheme };
    const viewed = viewBox === undefined ? themed : { ...themed, viewBox };
    if (rootAnimations === undefined) return viewed;

    const animations = viewed.animations === undefined ? rootAnimations : [...viewed.animations, ...rootAnimations];

    return { ...viewed, animations } as InputScene | IRScene;
  }, [ambientTheme, irFromProp, reactInput, rootAnimations, theme, viewBox]);

  const processingOptions = useMemo<ProcessOptions>(
    () => ({
      ...(mode === LayoutRuntimeMode.Static
        ? {}
        : { reconciler: { mode: ReconcilerMode.Incremental, updateStrategy } }),
      compile: {
        measureText,
        nodeDistance,
        fontSize,
        shapes: stableShapes,
        boundaries: stableBoundaries,
        clips: stableClips,
        arrows: stableArrows,
        marks: stableMarks,
        patterns: stablePatterns,
        paths: stablePaths,
        composites: stableComposites,
        themeDefinitions: stableThemeDefinitions,
        lowerTex,
      } satisfies CompileOptions,
    }),
    [
      mode,
      updateStrategy,
      measureText,
      nodeDistance,
      fontSize,
      stableShapes,
      stableBoundaries,
      stableClips,
      stableArrows,
      stableMarks,
      stablePatterns,
      stablePaths,
      stableComposites,
      stableThemeDefinitions,
      lowerTex,
    ],
  );

  const rawId = useId();
  const processingControllerIdentity = useMemo(
    () => ({ options: processingOptions, key: createProcessingControllerKey() }),
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

    idPrefix: resolvedIdPrefix,
    onArtifacts,
    onCompileResult,
  };
  const hostKey = `${mode}:${renderer}:${resolvedIdPrefix}`;
  return mode === LayoutRuntimeMode.Static ? (
    <StaticLayoutContent source={source} options={processingOptions} hostKey={hostKey} hostProps={hostProps} />
  ) : (
    <SessionLayoutContent
      key={processingControllerIdentity.key}
      source={source}
      options={processingOptions}
      onDiagnostic={onDiagnostic}
      hostKey={hostKey}
      hostProps={hostProps}
    />
  );
};
Layout.displayName = KernelDisplayName.Layout;
