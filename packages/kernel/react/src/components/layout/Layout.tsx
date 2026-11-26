import type { IRScene } from '@retikz/core';
import type { RequireExactlyOne } from '@retikz/foundation';
import { compareProperties } from '@retikz/foundation';
import type { CompileResult, CompositeArtifact, ReconcilerDiagnostic } from '@retikz/reconciler';
import type { AnimationControls } from '@retikz/render/animation';
import { resolveAnimationEnabled } from '@retikz/render/animation';
import { mergeRenderHandlers } from '@retikz/render/runtime';
import type { InputScene, ProcessOptions, SceneOptions, SceneViewOptions } from '@retikz/vanilla';
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

/** React 场景声明与提交生命周期的适配属性 */
type LayoutAdapterProps = RequireExactlyOne<{
  /** 直接传入持久化 Source IR，与 children 二选一 */
  ir: IRScene;
  /** 通过 JSX 声明的图形内容 */
  children: ReactNode;
}> & {
  /** JSX 子图的隐式根 Scope 覆盖；完整 ir 优先，style 宿主 CSS 独立生效 */
  rootScope?: ScopeStyleProps;
  /** 宿主 className */
  className?: string;
  /** 宿主内联样式 */
  style?: CSSProperties;
  /** 动画控制器出口 */
  animationRef?: Ref<AnimationControls | null>;
  /** Core 完整编译结果通知 */
  onCompileResult?: (result: CompileResult) => void;
  /** 编译附加产物成功提交后的通知 */
  onArtifacts?: (artifacts: ReadonlyArray<CompositeArtifact>) => void;
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
  const {
    compile,
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
    onArtifacts,
    onCompileResult,
    rootScope,
  } = props;

  const ambientThemeDefinitions = useThemeDefinitions();
  const reducedMotion = usePrefersReducedMotion();
  const animationMode = useAnimationMode();
  const contextRenderer = useRendererMode();

  const renderer = rendererProp ?? contextRenderer ?? 'svg';

  const ambientTheme = useTheme();
  if (__DEV__ && irFromProp !== undefined && rootScope?.defaults !== undefined && warnedMessages.size === 0) {
    const message = '[retikz] <Layout>：同时提供 `ir` 与 `rootScope` 时，`rootScope` 被忽略，`ir` 已是完整 IR';
    warnedMessages.add(message);
    console.warn(message);
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
      mergedTheme === undefined || (base.theme?.name === mergedTheme.name && base.theme?.mode === mergedTheme.mode)
        ? base
        : { ...base, theme: mergedTheme };
    const viewed = viewBox === undefined ? themed : { ...themed, viewBox };
    if (rootAnimations === undefined) return viewed;

    return {
      ...viewed,
      animations: viewed.animations === undefined ? rootAnimations : [...viewed.animations, ...rootAnimations],
    };
  }, [ambientTheme, base, rootAnimations, theme, viewBox]);

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
      runtime.subscribe(({ compilation }) => setFrame({ result: compilation.result, hasCommitted: true }));
      setFrame({ result: runtime.current.compilation.result, hasCommitted: true });
    } else {
      // 扩展数组按定义引用比较；Composite 输入是与 Source 配对的不透明句柄，按身份比较
      if (
        previous.source === source &&
        previous.options.compile?.compositeInputs === options.compile?.compositeInputs &&
        compareProperties(previous.options.compile, options.compile, { depth: 2 })
      )
        return;
      active.current = { runtime: previous.runtime, source, options };
      try {
        previous.runtime.replace(source, options.compile ?? {});
      } catch {
        // Vanilla 保留最后一次成功结果，失败不发布新帧
      }
    }

    for (const diagnostic of active.current.runtime.diagnostics()) {
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
  }, [source, options, onDiagnostic]);

  const rawId = useId();
  const resolvedIdPrefix = idPrefix ?? rawId.replace(/[^a-zA-Z0-9]/g, '');
  const resolvedHandlers = useMemo(() => {
    if (irFromProp !== undefined) return handlers ?? {};
    const collected = collectHydrationHandlers(children);
    return handlers === undefined
      ? collected
      : mergeRenderHandlers({
          handlerContributions: [
            { registration: 0, handlers: collected },
            { registration: 1, handlers },
          ],
        });
  }, [children, handlers, irFromProp]);

  return (
    <ProcessingResultHost
      key={`${renderer}:${resolvedIdPrefix}`}
      result={frame.result}
      backend={renderer}
      handlers={resolvedHandlers}
      width={width}
      height={height}
      className={className}
      style={style}
      animate={resolveAnimationEnabled(
        animationMode === undefined
          ? animateProp
          : animationMode === 'system'
            ? undefined
            : animationMode === 'enabled',
        reducedMotion,
      )}
      snapshotAt={snapshotAt}
      animationRef={animationRef}
      idPrefix={resolvedIdPrefix}
      onArtifacts={frame.hasCommitted ? onArtifacts : undefined}
      onCompileResult={frame.hasCommitted ? onCompileResult : undefined}
    />
  );
};
Layout.displayName = KernelDisplayName.Layout;
