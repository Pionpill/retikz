import type { CompileResult } from '@retikz/reconciler';
import type { AnimationControls } from '@retikz/render/animation';
import { bindWaapiDescriptors, sceneHasAnimations } from '@retikz/render/animation';
import type { HydrationHandlers } from '@retikz/render/hydration';
import {
  createContextBuilder,
  createHydrationController,
  createSvgAnimationControls,
  locateSvg,
  resolvePointViaLayout,
  resolveSvgElement,
} from '@retikz/render/hydration';
import type { RenderMode } from '@retikz/render/runtime';
import { computeDisplaySize } from '@retikz/render/runtime';
import { buildSvgDocument } from '@retikz/render/svg';
import type { FC, MutableRefObject, ReactElement, Ref } from 'react';
import { cloneElement, useCallback, useEffect, useMemo, useRef } from 'react';

import type { LayoutProps } from '../components';
import { CanvasHost } from './CanvasHost';
import { svgToReact } from './svg-to-react';

/** Vanilla processing result 的 React 宿主属性 */
export type ProcessingResultHostProps = Readonly<
  Pick<
    LayoutProps,
    'width' | 'height' | 'className' | 'style' | 'snapshotAt' | 'animationRef' | 'onArtifacts' | 'onCompileResult'
  > &
    Required<Pick<LayoutProps, 'handlers' | 'animate' | 'idPrefix'>> & {
      /** Vanilla 已完成编译的完整处理结果 */
      result: CompileResult;
      /** 目标渲染后端 */
      backend: RenderMode;
    }
>;

/** 将两个渲染后端发布的控制器写入宿主的回调或对象 ref */
const assignAnimationRef = (
  ref: Ref<AnimationControls | null> | undefined,
  controls: AnimationControls | null,
): void => {
  if (typeof ref === 'function') ref(controls);
  else if (ref) (ref as MutableRefObject<AnimationControls | null>).current = controls;
};

/** 将 hydration 与 SVG 动画控制器绑定到 React SVG 根节点 */
const useSvgRootBinding = (
  handlers: HydrationHandlers,
  result: CompileResult,
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

    const context = createContextBuilder({
      renderer: 'svg',
      root,
      scene: result.scene,
      resolveElement: resolveSvgElement,
      resolvePoint: resolvePointViaLayout(root, result.scene.layout),
      makeAnimation: id => createSvgAnimationControls(root, id),
    });
    const controller = createHydrationController(root, handlers, locateSvg, context);

    return () => controller.dispose();
  }, [handlers, result]);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null || !hasAnimations) return undefined;

    const controls = bindWaapiDescriptors(root);
    publishAnimation(controls);

    return () => {
      controls.dispose();
      publishAnimation(null);
    };
  }, [hasAnimations, result, publishAnimation]);

  return setRoot;
};

/** 将 Vanilla 只读 processing result 映射为 React SVG 或 Canvas 宿主 */
export const ProcessingResultHost: FC<ProcessingResultHostProps> = props => {
  const {
    result,
    backend,
    handlers,
    width,
    height,
    className,
    style,
    animate,
    snapshotAt,
    animationRef,
    idPrefix,
    onArtifacts,
    onCompileResult,
  } = props;

  const scene = result.scene;
  const document = useMemo(
    () =>
      backend === 'canvas'
        ? null
        : buildSvgDocument(scene, {
            idPrefix,
            animate,
            snapshotAt,
          }),
    [backend, scene, idPrefix, animate, snapshotAt],
  );

  const hasAnimations = backend === 'svg' && animate && sceneHasAnimations(result.scene);
  const publishAnimation = useCallback(
    (controls: AnimationControls | null) => assignAnimationRef(animationRef, controls),
    [animationRef],
  );
  const setRoot = useSvgRootBinding(handlers, result, hasAnimations, publishAnimation);

  const onArtifactsRef = useRef(onArtifacts);
  const onCompileResultRef = useRef(onCompileResult);

  useEffect(() => {
    onArtifactsRef.current = onArtifacts;
    onCompileResultRef.current = onCompileResult;
  }, [onArtifacts, onCompileResult]);
  useEffect(() => {
    try {
      onArtifactsRef.current?.(result.artifacts);
    } catch (cause) {
      if (__DEV__) console.warn('[retikz] <Layout> onArtifacts callback failed', cause);
    }
  }, [result]);
  useEffect(() => {
    try {
      onCompileResultRef.current?.(result);
    } catch (cause) {
      if (__DEV__) console.warn('[retikz] <Layout> onCompileResult callback failed', cause);
    }
  }, [result]);

  if (backend === 'canvas') {
    return (
      <CanvasHost
        scene={scene}
        handlers={handlers}
        width={width}
        height={height}
        className={className}
        style={style}
        animate={animate}
        snapshotAt={snapshotAt}
        publishAnimation={publishAnimation}
      />
    );
  }

  const svg = svgToReact(document as NonNullable<typeof document>) as ReactElement;
  const size = computeDisplaySize(result.scene.layout, width, height);

  return cloneElement(svg, { ...size, className, style, ref: setRoot });
};
