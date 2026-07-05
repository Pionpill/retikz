import type {
  CompileOptions,
  IRAnimationTrack,
  IRChild,
  IRCoordinate,
  IRNode,
  IRPath,
  IRScope,
  IRViewBox,
  WayDSL,
} from '@retikz/core';

/** builder 函数返回的 IR 子节点。 */
export type Child = IRChild;

/** node 的 config：从 IRNode 派生，剔除判别符 type 与 positional id。 */
export type NodeConfig = Omit<IRNode, 'type' | 'id'>;

/** draw 的 config：从 IRPath 派生，剔除 type 与由 way 生成的 children。 */
export type DrawConfig = Omit<IRPath, 'type' | 'children'>;

/** coordinate 的 config：从 IRCoordinate 派生，剔除 type 与 positional id。 */
export type CoordinateConfig = Omit<IRCoordinate, 'type' | 'id'>;

/** scope 的 config：从 IRScope 派生，剔除 type 与 children。 */
export type ScopeConfig = Omit<IRScope, 'type' | 'children'>;

/** draw/ribbon 的 way：复用 core 的 way DSL。 */
export type Way = WayDSL;

/**
 * figure 根级级联样式默认。
 * @description 只取 IRScope 的级联样式通道，不含容器、命名空间、变换、屏障、栈序或裁剪字段。
 */
export type FigureRootStyle = Pick<
  IRScope,
  | 'color'
  | 'stroke'
  | 'fill'
  | 'strokeWidth'
  | 'opacity'
  | 'fillOpacity'
  | 'strokeOpacity'
  | 'nodeDefault'
  | 'pathDefault'
  | 'labelDefault'
  | 'arrowDefault'
>;

/** {@link FigureRootStyle} 的字段表。 */
export const FIGURE_ROOT_STYLE_FIELDS = [
  'color',
  'stroke',
  'fill',
  'strokeWidth',
  'opacity',
  'fillOpacity',
  'strokeOpacity',
  'nodeDefault',
  'pathDefault',
  'labelDefault',
  'arrowDefault',
] as const satisfies ReadonlyArray<keyof FigureRootStyle>;

/**
 * figure 的 config。
 * @description viewBox/animations 注入 IR 根；width/height/idPrefix 交给 adapter；其余编译参数来自 core CompileOptions。
 */
export type FigureConfig = {
  width?: number;
  height?: number;
  viewBox?: IRViewBox;
  idPrefix?: string;
  /** scene 根时间轴动画 tracks。 */
  animations?: Array<IRAnimationTrack>;
} & FigureRootStyle &
  CompileOptions;
