import { type CSSProperties, type FC, type ReactNode, useId, useMemo } from 'react';
import { type IR, type ScenePrimitive, compileToScene } from '@retikz/core';
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

/** 递归判断 scene 里是否有 PathPrim 设了 arrowStart / arrowEnd——决定是否注入 marker defs */
const sceneNeedsArrowMarker = (prims: Array<ScenePrimitive>): boolean =>
  prims.some(p => {
    if (p.type === 'path') return !!p.arrowStart || !!p.arrowEnd;
    if (p.type === 'group') return sceneNeedsArrowMarker(p.children);
    return false;
  });

/**
 * <Tikz> 顶层容器。
 * 1. 从 children 构造 IR（或直接接受外部 IR）
 * 2. 调 compileToScene 得 Scene
 * 3. 把 Scene primitives 渲染为 SVG 元素；按需注入 `<defs><marker>` 给箭头用
 *
 * 箭头 marker 用 `useId()` 派生稳定 id，多个 Tikz 实例共存不会冲突；
 * 单一 marker 通过 `orient="auto-start-reverse"` 同时服务 marker-start
 * 与 marker-end，节省一个 defs 条目。
 */
export const Tikz: FC<TikzProps> = ({ ir: irFromProp, children, width, height, className, style }) => {
  const ir = useMemo(() => irFromProp ?? buildIR(children), [irFromProp, children]);
  const scene = useMemo(() => compileToScene(ir, { measureText: browserMeasurer }), [ir]);

  // useId 返回形如 ":r0:" 含冒号；SVG `url(#id)` 引用对冒号兼容性差，剥成纯字母数字
  const rawId = useId();
  const arrowMarkerId = `retikz-arrow-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const needsArrowMarker = sceneNeedsArrowMarker(scene.primitives);

  return (
    <svg viewBox={formatViewBox(scene.viewBox)} width={width} height={height} className={className} style={style}>
      {needsArrowMarker && (
        <defs>
          <marker
            id={arrowMarkerId}
            viewBox="0 0 10 10"
            refX={10}
            refY={5}
            markerWidth={6}
            markerHeight={6}
            orient="auto-start-reverse"
            markerUnits="strokeWidth"
          >
            {/* fill="context-stroke" 让箭头颜色随 path 的 stroke 自动同步 */}
            <path d="M 0 0 L 10 5 L 0 10 Z" fill="context-stroke" />
          </marker>
        </defs>
      )}
      {scene.primitives.map((p, i) => renderPrim(p, i, { arrowMarkerId }))}
    </svg>
  );
};
