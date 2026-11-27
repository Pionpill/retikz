import type { IRScene } from '@retikz/core';
import { compareProperties } from '@retikz/foundation';
import type { CompileResult, CompositeArtifact, ReconcilerDiagnostic } from '@retikz/reconciler';
import type { AnimationControls } from '@retikz/render/animation';
import type { InputRendererFactory, InputRenderRuntimeConfig, RenderTarget } from '@retikz/render/runtime';
import { mergeRenderHandlers } from '@retikz/render/runtime';
import type { InputScene, ProcessOptions, SceneOptions, SceneViewOptions } from '@retikz/vanilla';
import { isInputScene, SceneRuntime, compileToScene } from '@retikz/vanilla';
import { createDomRenderTarget } from '@retikz/vanilla/dom';
import type { CSSProperties, FC, ReactNode, Ref } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import type { ScopeStyleProps } from '../components/Scope';
import { Scope } from '../components/Scope';
import { KernelDisplayName } from '../shared';
import {
  mergeThemeDefinitions,
  mergeThemeOverlays,
  useDefaultAnimationEnabled,
  useRendererMode,
  useTheme,
  useThemeDefinitions,
} from './context';
import { convertReactToInputScene } from './convert';
import { collectHydrationHandlers } from './hydration';
import { LayoutOutput } from './render/LayoutOutput';

/** React 场景声明与提交生命周期的适配属性 */
type LayoutAdapterProps = (
  | {
      /** 完整的持久化场景 */
      ir: IRScene;
      children?: never;
      rootScope?: never;
    }
  | {
      ir?: never;
      /** 通过 JSX 声明的图形内容 */
      children: ReactNode;
      /** JSX 子图的隐式根 Scope 覆盖 */
      rootScope?: ScopeStyleProps;
    }
) & {
  /** 宿主 className */
  className?: string;
  /** 宿主内联样式 */
  style?: CSSProperties;
  /** 动画控制器出口 */
  animationRef?: Ref<AnimationControls | null>;
  /** 编译附加产物成功提交后的通知 */
  onArtifacts?: (artifacts: ReadonlyArray<CompositeArtifact>) => void;
  /** Core 完整编译结果通知 */
  onCompileResult?: (result: CompileResult) => void;
  /** 接收协调器的结构化诊断 */
  onDiagnostic?: (diagnostic: ReconcilerDiagnostic) => void;
};

/** React Layout 的公开属性 */
export type LayoutProps = Omit<SceneOptions, 'children'> & SceneViewOptions & LayoutAdapterProps;

/**
 * 绘图容器
 * @description 将 JSX 子图元或完整 IR 渲染为 SVG 或 Canvas，必须选择一种输入
 */
export const Layout: FC<LayoutProps> = props => {
  const ambientThemeDefinitions = useThemeDefinitions();
  const defaultAnimate = useDefaultAnimationEnabled();
  const contextRenderer = useRendererMode();
  const ambientTheme = useTheme();

  const {
    ir,
    children,
    rootScope,
    theme,
    authoring,
    handlers,
    width,
    height,
    viewBox,
    renderer = contextRenderer ?? 'svg',
    animate = defaultAnimate,
    snapshotAt,
    compile,
    reconciler,
    animations,
    idPrefix,
    className,
    style,
    animationRef,
    onArtifacts,
    onCompileResult,
    onDiagnostic,
  } = props;

  const resolvedIR = useMemo<InputScene | IRScene>(() => {
    let scene: InputScene | IRScene;
    if (ir !== undefined) {
      scene = ir;
    } else {
      const input = convertReactToInputScene(
        rootScope?.defaults === undefined ? children : <Scope defaults={rootScope.defaults}>{children}</Scope>,
      );
      scene = authoring === undefined ? input : { ...input, authoring };
    }

    const mergedTheme = mergeThemeOverlays(ambientTheme, scene.theme, theme);
    const themed =
      mergedTheme === undefined || (scene.theme?.name === mergedTheme.name && scene.theme?.mode === mergedTheme.mode)
        ? scene
        : { ...scene, theme: mergedTheme };
    const viewed = viewBox === undefined ? themed : { ...themed, viewBox };
    if (animations === undefined) return viewed;

    return {
      ...viewed,
      animations: viewed.animations === undefined ? animations : [...viewed.animations, ...animations],
    };
  }, [ambientTheme, animations, authoring, children, ir, rootScope, theme, viewBox]);

  const options = useMemo<ProcessOptions>(
    () => ({
      reconciler,
      compile:
        ambientThemeDefinitions === undefined
          ? compile
          : {
              ...compile,
              themeDefinitions: mergeThemeDefinitions(ambientThemeDefinitions, compile?.themeDefinitions),
            },
    }),
    [ambientThemeDefinitions, compile, reconciler],
  );
  const rawId = useId();
  const resolvedIdPrefix = idPrefix ?? rawId.replace(/[^a-zA-Z0-9]/g, '');
  const resolvedHandlers = useMemo(() => {
    if (ir !== undefined) return handlers ?? {};
    const collected = collectHydrationHandlers(children);
    return handlers === undefined
      ? collected
      : mergeRenderHandlers({
          handlerContributions: [
            { registration: 0, handlers: collected },
            { registration: 1, handlers },
          ],
        });
  }, [children, handlers, ir]);

  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWidth = renderer === 'canvas' && typeof width === 'number' ? width : undefined;
  const canvasHeight = renderer === 'canvas' && typeof height === 'number' ? height : undefined;
  const renderConfig = useMemo<InputRenderRuntimeConfig>(
    () => ({
      animation: { enabled: animate, snapshotAt },
      handlerContributions: [{ registration: 0, handlers: resolvedHandlers }],
      canvas: renderer === 'canvas' ? { width: canvasWidth, height: canvasHeight } : undefined,
    }),
    [animate, snapshotAt, resolvedHandlers, renderer, canvasWidth, canvasHeight],
  );
  const [frame, setFrame] = useState<{ result: CompileResult; hasCommitted: boolean; animation?: AnimationControls }>(
    () => ({
      result: compileToScene(resolvedIR, { compile: options.compile }),
      hasCommitted: false,
    }),
  );
  const active = useRef<{
    runtime: SceneRuntime;
    resolvedIR: InputScene | IRScene;
    options: ProcessOptions;
    host: HTMLCanvasElement | SVGSVGElement;
    config: { current: InputRenderRuntimeConfig };
  }>();

  useEffect(
    () => () => {
      active.current?.runtime.dispose();
      active.current = undefined;
    },
    [],
  );

  useEffect(() => {
    const previous = active.current;
    let session: SceneRuntime;
    let rendererInput: InputRendererFactory;
    if (renderer === 'svg') {
      const host = svgRef.current;
      if (!host) return;
      rendererInput = { backend: 'svg', host, immutableOptions: { backend: 'svg', idPrefix: resolvedIdPrefix } };
    } else {
      const host = canvasRef.current;
      if (!host) return;
      rendererInput = { backend: 'canvas', host, immutableOptions: { backend: 'canvas', idPrefix: resolvedIdPrefix } };
    }
    const { host } = rendererInput;
    if (!previous || previous.host !== host || !compareProperties(previous.options.reconciler, options.reconciler)) {
      const config = { current: renderConfig };
      let target: RenderTarget;
      const runtimeOptions = {
        ...options,
        createTarget: () => {
          target = createDomRenderTarget(rendererInput, () => config.current);
          return target.target;
        },
      };
      const runtime = isInputScene(resolvedIR)
        ? SceneRuntime.fromInput(resolvedIR, runtimeOptions)
        : new SceneRuntime(resolvedIR, runtimeOptions);
      previous?.runtime.dispose();
      active.current = { runtime, resolvedIR, options, host, config };
      const publish = () =>
        setFrame({
          result: runtime.current.compilation.result,
          hasCommitted: true,
          animation: target.read().animation,
        });
      session = runtime;
      runtime.subscribe(publish);
      publish();
    } else {
      // 扩展数组按定义引用比较；Composite 输入是与 Source 配对的不透明句柄，按身份比较
      session = previous.runtime;
      const sameInput =
        previous.resolvedIR === resolvedIR &&
        previous.options.compile?.compositeInputs === options.compile?.compositeInputs &&
        compareProperties(previous.options.compile, options.compile, { depth: 2 });
      if (sameInput && previous.config.current === renderConfig) return;
      const priorConfig = previous.config.current;
      previous.config.current = renderConfig;
      try {
        if (sameInput) previous.runtime.updateTarget();
        else previous.runtime.replace(resolvedIR, options.compile ?? {});
        active.current = { ...previous, resolvedIR, options };
      } catch {
        previous.config.current = priorConfig;
        // Vanilla 保留最后一次成功结果，失败不发布新帧
      }
    }

    for (const diagnostic of session.diagnostics()) {
      if (!onDiagnostic || typeof diagnostic !== 'object' || diagnostic === null) continue;
      const candidate = diagnostic as Partial<ReconcilerDiagnostic>;
      if (
        typeof candidate.code !== 'string' ||
        typeof candidate.phase !== 'string' ||
        (candidate.severity !== 'warning' && candidate.severity !== 'error') ||
        typeof candidate.message !== 'string'
      )
        continue;

      try {
        onDiagnostic(candidate as ReconcilerDiagnostic);
      } catch (cause) {
        if (__DEV__) console.warn('[retikz] <Layout> onDiagnostic callback failed', cause);
      }
    }
  }, [resolvedIR, options, onDiagnostic, renderConfig, renderer, resolvedIdPrefix]);

  return (
    <LayoutOutput
      key={`${renderer}:${resolvedIdPrefix}`}
      result={frame.result}
      backend={renderer}
      canvasRef={canvasRef}
      svgRef={svgRef}
      animation={frame.animation}
      width={width}
      height={height}
      className={className}
      style={style}
      animationRef={animationRef}
      onArtifacts={frame.hasCommitted ? onArtifacts : undefined}
      onCompileResult={frame.hasCommitted ? onCompileResult : undefined}
    />
  );
};
Layout.displayName = KernelDisplayName.Layout;
