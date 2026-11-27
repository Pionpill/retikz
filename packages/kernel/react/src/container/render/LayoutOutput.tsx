import type { CompileResult } from '@retikz/reconciler';
import type { AnimationControls } from '@retikz/render/animation';
import type { RenderMode } from '@retikz/render/runtime';
import { computeDisplaySize } from '@retikz/render/runtime';
import type { FC, MutableRefObject, Ref } from 'react';
import { useEffect } from 'react';

import type { LayoutProps } from '../Layout';
import { CanvasHost } from './CanvasHost';
import { SvgHost } from './SvgHost';

/** Vanilla processing result 的 React 宿主属性 */
export type LayoutOutputProps = Readonly<
  Pick<LayoutProps, 'width' | 'height' | 'className' | 'style' | 'animationRef' | 'onArtifacts' | 'onCompileResult'> & {
    /** Vanilla 已完成编译的完整处理结果 */
    result: CompileResult;
    /** 目标渲染后端 */
    backend: RenderMode;
    svgRef: Ref<SVGSVGElement>;
    canvasRef: Ref<HTMLCanvasElement>;
    animation?: AnimationControls;
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

/** 将 Vanilla 只读 processing result 映射为 React SVG 或 Canvas 宿主 */
export const LayoutOutput: FC<LayoutOutputProps> = props => {
  const {
    result,
    backend,
    canvasRef,
    animation,
    svgRef,
    width,
    height,
    className,
    style,
    animationRef,
    onArtifacts,
    onCompileResult,
  } = props;

  useEffect(() => {
    assignAnimationRef(animationRef, animation ?? null);
    return () => assignAnimationRef(animationRef, null);
  }, [animationRef, animation]);

  useEffect(() => {
    try {
      onArtifacts?.(result.artifacts);
    } catch (cause) {
      if (__DEV__) console.warn('[retikz] <Layout> onArtifacts callback failed', cause);
    }
  }, [result, onArtifacts]);

  useEffect(() => {
    try {
      onCompileResult?.(result);
    } catch (cause) {
      if (__DEV__) console.warn('[retikz] <Layout> onCompileResult callback failed', cause);
    }
  }, [result, onCompileResult]);

  const displaySize = computeDisplaySize(result.scene.layout, width, height);
  const hostProps = { ...displaySize, className, style };

  return backend === 'canvas' ? (
    <CanvasHost {...hostProps} canvasRef={canvasRef} scene={result.scene} />
  ) : (
    <SvgHost {...hostProps} svgRef={svgRef} />
  );
};
