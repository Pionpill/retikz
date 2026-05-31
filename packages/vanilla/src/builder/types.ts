import type {
  CompileOptions,
  IRChild,
  IRCoordinate,
  IRNode,
  IRPath,
  IRScope,
  IRViewBox,
  WayDSL,
} from '@retikz/core';

/** builder 函数返回的 IR 子节点（node / draw / coordinate / scope 的产物） */
export type Child = IRChild;

/** node 的 config：从 IRNode 派生，剔除判别符 type 与提为 positional 的 id */
export type NodeConfig = Omit<IRNode, 'type' | 'id'>;

/** draw 的 config：从 IRPath 派生，剔除 type 与由 way 生成的 children（steps） */
export type DrawConfig = Omit<IRPath, 'type' | 'children'>;

/** coordinate 的 config：从 IRCoordinate 派生，剔除 type 与 positional 的 id（剩 position 必填） */
export type CoordinateConfig = Omit<IRCoordinate, 'type' | 'id'>;

/** scope 的 config：从 IRScope 派生，剔除 type 与单列的 children（含 transforms 等全部样式默认） */
export type ScopeConfig = Omit<IRScope, 'type' | 'children'>;

/** draw 的 way：直接复用 core 的 way DSL 全集（id 串 / 坐标 / Cycle / 折角 / 相对 / 曲线 / 弧 …） */
export type Way = WayDSL;

/**
 * figure 的 config
 * @description `viewBox` → IR.viewBox（内容坐标系）；`width`/`height` → 根 `<svg>` 显示尺寸（adapter 职责）；
 *   `idPrefix` → SVG 资源 id 前缀；其余（measureText / shapes / arrows / patterns / pathGenerators /
 *   padding / precision / nodeDistance / onWarn）派生自 core `CompileOptions`、原样喂 compileToScene。
 */
export type FigureConfig = {
  width?: number;
  height?: number;
  viewBox?: IRViewBox;
  idPrefix?: string;
} & CompileOptions;
