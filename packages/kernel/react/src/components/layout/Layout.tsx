import type { IRAnimationTrack, IRScene, IRViewBox, TexLowerer, TextMeasurer } from '@retikz/core';
import { compareProperties } from '@retikz/foundation';
import type {
  CompileOptions,
  CompileResult,
  CompositeArtifact,
  ReconcilerDiagnostic,
  ReconcilerResult,
} from '@retikz/reconciler';
import type { AnimationControls } from '@retikz/render/animation';
import { resolveAnimationEnabled } from '@retikz/render/animation';
import type { HydrationHandlers } from '@retikz/render/hydration';
import type { RenderMode } from '@retikz/render/runtime';
import type { InputScene, ProcessOptions } from '@retikz/vanilla';
import { isInputScene, SceneRuntime, compileToScene } from '@retikz/vanilla';
import type { CSSProperties, FC, ReactNode, Ref } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { collectHydrationHandlers } from '../../hydration';
import { ProcessingResultHost } from '../../render/processing-result';
import { usePrefersReducedMotion } from '../../render/reduced-motion';
import { KernelDisplayName } from '../../shared';
import type { ScopeStyleProps } from '../Scope';
import { Scope } from '../Scope';
import { createInputScene } from './input-scene';
import { useAnimationMode } from './use-animation-mode';
import { useRendererMode } from './use-renderer-mode';
import { mergeThemeDefinitions, mergeThemeOverlays, useTheme, useThemeDefinitions } from './use-theme';

/** 同一条诊断消息进程内只告警一次 */
const warnedMessages = new Set<string>();

const warnOnce = (message: string): void => {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(message);
};

/** 判断两个 sparse Theme 是否具有完全相同的 selector */
const isSameTheme = (left: IRScene['theme'] | undefined, right: IRScene['theme'] | undefined): boolean =>
  left?.name === right?.name && left?.mode === right?.mode;

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
    if (callback === undefined || !isReconcilerDiagnostic(diagnostic)) continue;

    try {
      callback(diagnostic);
    } catch (cause) {
      if (__DEV__) console.warn('[retikz] <Layout> onDiagnostic callback failed', cause);
    }
  }
};

/** Layout 支持注册的编译扩展 */
export type LayoutExtensions = Readonly<
  Pick<
    CompileOptions,
    'shapes' | 'boundaries' | 'clips' | 'arrows' | 'marks' | 'patterns' | 'paths' | 'composites' | 'themeDefinitions'
  >
>;

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
  /** 协调器执行选项；省略时使用完整编译 */
  reconciler?: ProcessOptions['reconciler'];
  /** 接收协调器的结构化诊断 */
  onDiagnostic?: (diagnostic: ReconcilerDiagnostic) => void;
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
  renderer?: RenderMode;
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

/**
 * 将 Vanilla 会话接入 React 生命周期；服务端和首次渲染先使用一次性编译结果
 */
const useLayoutResult = (
  source: InputScene | IRScene,
  options: ProcessOptions,
  onDiagnostic: LayoutProps['onDiagnostic'],
) => {
  const [frame, setFrame] = useState(() => ({
    result: compileToScene(source, { compile: options.compile }),
    hasCommitted: false,
  }));
  const active = useRef<{ runtime: SceneRuntime; source: InputScene | IRScene; options: ProcessOptions }>();

  useEffect(
    () => () => {
      active.current?.runtime.dispose();
      active.current = undefined;
    },
    [],
  );

  useEffect(() => {
    const previous = active.current;
    if (!previous || !compareProperties(previous.options.reconciler, options.reconciler)) {
      const runtime = isInputScene(source)
        ? SceneRuntime.fromInput(source, options)
        : new SceneRuntime(source, options);
      previous?.runtime.dispose();
      active.current = { runtime, source, options };
      const publish = ({ compilation }: ReconcilerResult) =>
        setFrame({ result: compilation.result, hasCommitted: true });
      runtime.subscribe(publish);
      publish(runtime.current);
      deliverProcessingDiagnostics(runtime, onDiagnostic);
      return;
    }

    // 内联扩展数组按有序定义引用比较，不因容器变化重新编译
    if (previous.source === source && compareProperties(previous.options.compile, options.compile, { depth: 2 }))
      return;

    active.current = { runtime: previous.runtime, source, options };
    try {
      previous.runtime.replace(source, options.compile);
    } catch {
      // Vanilla 保留最后一次成功结果，失败不发布新帧
    }
    deliverProcessingDiagnostics(previous.runtime, onDiagnostic);
  }, [source, options, onDiagnostic]);

  return frame;
};

/**
 * 绘图容器
 * @description 将 JSX 子图元或传入的 ir 渲染为 SVG 或 Canvas；同时提供时使用 ir
 */
export const Layout: FC<LayoutProps> = props => {
  const {
    measureText,
    ir: irFromProp,
    theme,
    children,
    authoring,
    handlers,
    reconciler,
    onDiagnostic,
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

  const ambientThemeDefinitions = useThemeDefinitions();

  const reducedMotion = usePrefersReducedMotion();
  const animationMode = useAnimationMode();
  const contextRenderer = useRendererMode();
  const animate = resolveAnimationEnabled(
    animationMode === undefined ? animateProp : animationMode === 'system' ? undefined : animationMode === 'enabled',
    reducedMotion,
  );
  const renderer = rendererProp ?? contextRenderer ?? 'svg';

  const ambientTheme = useTheme();
  if (__DEV__) {
    if (irFromProp !== undefined && rootScope?.defaults !== undefined) {
      warnOnce('[retikz] <Layout>：同时提供 `ir` 与 `rootScope` 时，`rootScope` 被忽略，`ir` 已是完整 IR');
    }
  }

  const base = useMemo(() => {
    if (irFromProp !== undefined) return irFromProp;
    const input = createInputScene(
      rootScope?.defaults === undefined ? children : <Scope defaults={rootScope.defaults}>{children}</Scope>,
    );
    return authoring === undefined ? input : { ...input, authoring };
  }, [authoring, children, irFromProp, rootScope]);

  const source = useMemo<InputScene | IRScene>(() => {
    const mergedTheme = mergeThemeOverlays(ambientTheme, base.theme, theme);
    const themed =
      mergedTheme === undefined || isSameTheme(base.theme, mergedTheme) ? base : { ...base, theme: mergedTheme };
    const viewed = viewBox === undefined ? themed : { ...themed, viewBox };
    if (rootAnimations === undefined) return viewed;

    const animations = viewed.animations === undefined ? rootAnimations : [...viewed.animations, ...rootAnimations];

    return { ...viewed, animations } as InputScene | IRScene;
  }, [ambientTheme, base, rootAnimations, theme, viewBox]);

  const options = useMemo<ProcessOptions>(
    () => ({
      reconciler,
      compile: {
        ...extensions,
        measureText,
        nodeDistance,
        fontSize,
        lowerTex,
        themeDefinitions: mergeThemeDefinitions(ambientThemeDefinitions, extensions?.themeDefinitions),
      },
    }),
    [ambientThemeDefinitions, extensions, fontSize, lowerTex, measureText, nodeDistance, reconciler],
  );
  const { result, hasCommitted } = useLayoutResult(source, options, onDiagnostic);

  const rawId = useId();
  const resolvedIdPrefix = idPrefix ?? rawId.replace(/[^a-zA-Z0-9]/g, '');
  const resolvedHandlers = useMemo(
    () => (irFromProp === undefined ? collectHydrationHandlers(children) : (handlers ?? {})),
    [children, handlers, irFromProp],
  );

  return (
    <ProcessingResultHost
      key={`${renderer}:${resolvedIdPrefix}`}
      result={result}
      backend={renderer}
      handlers={resolvedHandlers}
      width={width}
      height={height}
      className={className}
      style={style}
      animate={animate}
      snapshotAt={snapshotAt}
      animationRef={animationRef}
      idPrefix={resolvedIdPrefix}
      onArtifacts={hasCommitted ? onArtifacts : undefined}
      onCompileResult={hasCommitted ? onCompileResult : undefined}
    />
  );
};
Layout.displayName = KernelDisplayName.Layout;
