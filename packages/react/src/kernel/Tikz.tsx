import { type CSSProperties, type FC, type ReactNode, useMemo } from 'react';
import { type IR, compileToScene } from '@retikz/core';
import { buildIR } from './_builder';
import { browserMeasurer } from '../render/browser-measurer';
import { renderPrim } from '../render/renderPrim';
import { formatViewBox } from '../render/viewBox';

/** <Tikz> 组件的 props */
export type TikzProps = {
  /** 直接喂 IR JSON（持久化 / AI / 编辑器场景），与 children 二选一 */
  ir?: IR;
  /** Kernel/Sugar JSX children */
  children?: ReactNode;
  /** SVG 元素宽度（CSS 长度或数字） */
  width?: number | string;
  /** SVG 元素高度（CSS 长度或数字） */
  height?: number | string;
  /** 透传到 svg 元素的 className */
  className?: string;
  /** 透传到 svg 元素的内联样式 */
  style?: CSSProperties;
};

/**
 * <Tikz> 顶层容器。
 * 1. 从 children 构造 IR（或直接接受外部 IR）
 * 2. 调 compileToScene 得 Scene
 * 3. 把 Scene primitives 渲染为 SVG 元素
 */
export const Tikz: FC<TikzProps> = ({ ir: irFromProp, children, width, height, className, style }) => {
  const ir = useMemo(() => irFromProp ?? buildIR(children), [irFromProp, children]);
  const scene = useMemo(() => compileToScene(ir, { measureText: browserMeasurer }), [ir]);

  return (
    <svg viewBox={formatViewBox(scene.viewBox)} width={width} height={height} className={className} style={style}>
      {scene.primitives.map((p, i) => renderPrim(p, i))}
    </svg>
  );
};
