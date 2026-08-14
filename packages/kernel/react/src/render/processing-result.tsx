import type { AnimationControls, AnimationPropertyRegistry, EasingRegistry } from '@retikz/render/animation';
import type { HydrationHandlers } from '@retikz/render/hydration';
import type { ProcessingResult } from '@retikz/vanilla';
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

import { CanvasHost } from './canvas';
import { svgToReact } from './svg';

/** Vanilla processing result 的 React 宿主属性 */
export type ProcessingResultHostProps = Readonly<{
  /** Vanilla 已完成编译的完整处理结果 */
  result: ProcessingResult;
  /** 目标渲染后端 */
  backend: 'svg' | 'canvas';
  /** 当前 revision 的 hydration handler 注册表 */
  handlers: HydrationHandlers;
  /** SVG 或 Canvas CSS 宽度 */
  width?: number | string;
  /** SVG 或 Canvas CSS 高度 */
  height?: number | string;
  /** 宿主 className */
  className?: string;
  /** 宿主内联样式 */
  style?: CSSProperties;
  /** 是否播放动画 */
  animate: boolean;
  /** 静态动画采样时刻 */
  snapshotAt?: number;
  /** easing registry */
  easings?: EasingRegistry;
  /** animation property registry */
  animationProperties?: AnimationPropertyRegistry;
  /** 动画控制器出口 */
  animationRef?: Ref<AnimationControls | null>;
  /** 资源 id 前缀 */
  idPrefix: string;
  /** artifacts 成功提交通知 */
  onArtifacts?: (artifacts: ProcessingResult['artifacts']) => void;
  /** Core 完整编译结果通知 */
  onCompileResult?: (result: NonNullable<ProcessingResult['compileResult']>) => void;
}>;

/** 写入 callback ref 或 RefObject */
const assignRef = <T,>(ref: Ref<T> | undefined, value: T): void => {
  if (typeof ref === 'function') ref(value);
  else if (ref !== undefined && ref !== null) (ref as MutableRefObject<T>).current = value;
};

/** 将 hydration 与 SVG 动画控制器绑定到 React SVG 根节点 */
const useSvgRootBinding = (
  handlers: HydrationHandlers,
  result: ProcessingResult,
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
    easings,
    animationProperties,
    animationRef,
    idPrefix,
    onArtifacts,
    onCompileResult,
  } = props;
  const frame = useMemo(() => Object.freeze({ primary: result.scene, layers: result.layers }), [result]);
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
  const hasAnimations = backend === 'svg' && animate && sceneHasAnimations(result.scene);
  const publishAnimation = useCallback(
    (controls: AnimationControls | null) => assignRef(animationRef, controls),
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
      if (process.env.NODE_ENV !== 'production') console.warn('[retikz] <Layout> onArtifacts callback failed', cause);
    }
  }, [result]);
  useEffect(() => {
    try {
      onCompileResultRef.current?.(result.compileResult);
    } catch (cause) {
      if (process.env.NODE_ENV !== 'production')
        console.warn('[retikz] <Layout> onCompileResult callback failed', cause);
    }
  }, [result]);

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
