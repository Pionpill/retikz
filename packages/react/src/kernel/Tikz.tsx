import { type CSSProperties, type FC, type ReactNode, useId, useMemo } from 'react';
import { type ArrowShape, type IR, type ScenePrimitive, compileToScene } from '@retikz/core';
import { buildIR } from './_builder';
import { ArrowMarker } from '../render/arrowMarkers';
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
  /**
   * 节点相对定位（`Node.position = { direction, of }`）的默认距离，单位 user units
   * @description 对应 TikZ `node distance=...`；节点 position 自带 `distance` 时优先用自带值，都缺省时回退到 1
   */
  nodeDistance?: number;
};

/** 递归收集 scene 里所有 PathPrim 用到的 arrow 形状——按需注入 marker defs */
const collectArrowShapes = (prims: Array<ScenePrimitive>): Set<ArrowShape> => {
  const shapes = new Set<ArrowShape>();
  for (const p of prims) {
    if (p.type === 'path') {
      if (p.arrowStart) shapes.add(p.arrowStart);
      if (p.arrowEnd) shapes.add(p.arrowEnd);
    } else if (p.type === 'group') {
      for (const s of collectArrowShapes(p.children)) shapes.add(s);
    }
  }
  return shapes;
};

/**
 * <Tikz> 顶层容器
 * @description 流水线：从 children 构造 IR（或直接接受外部 IR）→ compileToScene 得 Scene → 渲染 SVG 元素并按需注入 `<defs>` 与每种 arrow 形状的 `<marker>`；marker id 用 `useId()` 派生稳定前缀避免多实例冲突，每种 shape 一个定义（`${prefix}-${shape}`），marker 内借 `context-stroke` / `context-fill` 让颜色随 path 同步
 */
export const Tikz: FC<TikzProps> = props => {
  const { ir: irFromProp, children, width, height, className, style, nodeDistance } = props;
  const ir = useMemo(() => irFromProp ?? buildIR(children), [irFromProp, children]);
  const scene = useMemo(
    () => compileToScene(ir, { measureText: browserMeasurer, nodeDistance }),
    [ir, nodeDistance],
  );

  // useId 返回 ":r0:" 含冒号；SVG `url(#id)` 对冒号兼容性差，剥成纯字母数字
  const rawId = useId();
  const arrowMarkerPrefix = `retikz-arrow-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const usedShapes = collectArrowShapes(scene.primitives);

  const arrowMarkerIdFor = (shape: ArrowShape) => `${arrowMarkerPrefix}-${shape}`;

  return (
    <svg viewBox={formatViewBox(scene.viewBox)} width={width} height={height} className={className} style={style}>
      {usedShapes.size > 0 && (
        <defs>
          {Array.from(usedShapes).map(shape => (
            <ArrowMarker key={shape} id={arrowMarkerIdFor(shape)} shape={shape} />
          ))}
        </defs>
      )}
      {scene.primitives.map((p, i) => renderPrim(p, i, { arrowMarkerIdFor }))}
    </svg>
  );
};
