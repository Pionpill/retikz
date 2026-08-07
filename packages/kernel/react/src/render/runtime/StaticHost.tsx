import type { CompileArtifact, Scene } from '@retikz/core';
import type { AnimationControls, AnimationPropertyRegistry, EasingRegistry } from '@retikz/render/animation';
import type { HydrationHandlers } from '@retikz/render/hydration';
import type { StaticRenderFrame } from '@retikz/render/runtime';
import type { CSSProperties, FC, MutableRefObject, ReactElement, Ref } from 'react';

import { bindWaapiDescriptors, sceneHasAnimations } from '@retikz/render/animation';
import {
  createContextBuilder,
  createHydrationController,
  createSvgAnimationControls,
  locateSvg,
  resolvePointViaLayout,
  resolveSvgElement,
} from '@retikz/render/hydration';
import { buildSvgFrameDocument } from '@retikz/render/svg';
import { cloneElement, useCallback, useEffect, useMemo, useRef } from 'react';

import { CanvasHost } from '../canvas';
import { svgToReact } from '../svg';

/** React static host 的公开输入 */
export type StaticHostProps = Readonly<{
  /** 要完整物化的 renderer 后端 */
  backend: 'svg' | 'canvas';
  /** 当前 render 已完整编译的主图与只读辅助层 */
  frame: StaticRenderFrame;
  /** 当前完整编译产生的 artifacts */
  artifacts: ReadonlyArray<CompileArtifact>;
  /** 当前 hydration handler 注册表 */
  handlers: HydrationHandlers;
  /** SVG CSS 宽度或 Canvas CSS user-space 宽度 */
  width?: number | string;
  /** SVG CSS 高度或 Canvas CSS user-space 高度 */
  height?: number | string;
  /** 透传到宿主根元素的类名 */
  className?: string;
  /** 透传到宿主根元素的样式 */
  style?: CSSProperties;
  /** 当前动画播放开关 */
  animate: boolean;
  /** 可选静态动画采样时刻 */
  snapshotAt?: number;
  /** 自定义 easing registry */
  easings?: EasingRegistry;
  /** 自定义 animation property registry */
  animationProperties?: AnimationPropertyRegistry;
  /** 当前动画控制器出口 */
  animationRef?: Ref<AnimationControls | null>;
  /** SSR 与资源引用共用的稳定 id 前缀 */
  idPrefix: string;
  /** 完整编译 commit 后的 artifacts 通知出口 */
  onArtifacts?: (artifacts: ReadonlyArray<CompileArtifact>) => void;
  /** 当前完整 frame 成功提交后的领域中立 driver 通知 */
  onCompileCommit?: () => void;
}>;

/** 写入 callback ref 或 RefObject */
const assignRef = <T,>(ref: Ref<T> | undefined, value: T): void => {
  if (typeof ref === 'function') ref(value);
  else if (ref !== undefined && ref !== null) (ref as MutableRefObject<T>).current = value;
};

/** 把水合与 SVG 动画控制器绑定到 static figure root */
const useSvgRootBinding = (
  handlers: HydrationHandlers,
  scene: Scene,
  hasAnimations: boolean,
  publishAnimation: (controls: AnimationControls | null) => void,
): ((element: SVGSVGElement | null) => void) => {
  const rootRef = useRef<SVGSVGElement | null>(null);
  const setRoot = useCallback((element: SVGSVGElement | null) => {
    rootRef.current = element;
  }, []);
  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return undefined;
    const buildContext = createContextBuilder({
      renderer: 'svg',
      root,
      scene,
      resolveElement: resolveSvgElement,
      resolvePoint: resolvePointViaLayout(root, scene.layout),
      makeAnimation: id => createSvgAnimationControls(root, id),
    });
    const controller = createHydrationController(root, handlers, locateSvg, buildContext);
    return () => controller.dispose();
  }, [handlers, scene]);
  useEffect(() => {
    const root = rootRef.current;
    if (root === null || !hasAnimations) return undefined;
    const controls = bindWaapiDescriptors(root);
    publishAnimation(controls);
    return () => {
      controls.dispose();
      publishAnimation(null);
    };
  }, [hasAnimations, scene, publishAnimation]);
  return setRoot;
};

/** 使用完整 Scene 重绘且不创建 Runtime Session 的 React host */
export const StaticHost: FC<StaticHostProps> = props => {
  const {
    backend,
    frame,
    artifacts,
    handlers,
    width,
    height,
    className,
    style,
    animate,
    snapshotAt,
    easings,
    animationProperties,
    animationRef,
    idPrefix,
    onArtifacts,
    onCompileCommit,
  } = props;
  const scene = frame.primary;
  const document = useMemo(
    () =>
      backend === 'canvas'
        ? null
        : buildSvgFrameDocument(frame, {
            idPrefix,
            animate,
            snapshotAt,
            easings,
          }),
    [backend, frame, idPrefix, animate, snapshotAt, easings],
  );
  const hasAnimations = backend === 'svg' && animate && sceneHasAnimations(scene);
  const publishAnimation = useCallback(
    (controls: AnimationControls | null) => assignRef(animationRef, controls),
    [animationRef],
  );
  const setRoot = useSvgRootBinding(handlers, scene, hasAnimations, publishAnimation);
  const onArtifactsRef = useRef(onArtifacts);

  useEffect(() => {
    onArtifactsRef.current = onArtifacts;
  }, [onArtifacts]);
  useEffect(() => {
    onArtifactsRef.current?.(artifacts);
  }, [artifacts]);
  useEffect(() => {
    try {
      onCompileCommit?.();
    } catch (cause) {
      if (process.env.NODE_ENV !== 'production') console.warn('[retikz] <Layout> compile driver commit failed', cause);
    }
  }, [onCompileCommit]);

  if (backend === 'canvas') {
    return (
      <CanvasHost
        frame={frame}
        handlers={handlers}
        width={width}
        height={height}
        className={className}
        style={style}
        animate={animate}
        snapshotAt={snapshotAt}
        animationRef={animationRef}
        easings={easings}
        animationProperties={animationProperties}
      />
    );
  }

  const svg = svgToReact(document as NonNullable<typeof document>) as ReactElement;
  return cloneElement(svg, { width, height, className, style, ref: setRoot });
};
