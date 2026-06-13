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
 * figure 根级级联样式默认（与 React `<Layout>` 顶层样式 props 对齐）
 * @description 取 `IRScope` 的级联样式通道（graphic state + 四通道 every-X），**不含**容器 / 命名空间 / 变换 /
 *   屏障 / 栈序 / 裁剪字段（那些挂在 figure 根上语义易混）。组 IR 时若任一字段携带样式指令，把根 children 包进
 *   一层合成根 `<Scope>`，等价于用户手写一层根 scope；全缺省时不包，IR 形态逐字保持。
 */
export type FigureRootStyle = Pick<
  IRScope,
  | 'color'
  | 'stroke'
  | 'fill'
  | 'strokeWidth'
  | 'opacity'
  | 'fillOpacity'
  | 'drawOpacity'
  | 'nodeDefault'
  | 'pathDefault'
  | 'labelDefault'
  | 'arrowDefault'
>;

/** {@link FigureRootStyle} 的字段表——`figure.ts` 组 IR 时拣根样式 + 从 render options 剔除（IR-only 字段不下发） */
export const FIGURE_ROOT_STYLE_FIELDS = [
  'color',
  'stroke',
  'fill',
  'strokeWidth',
  'opacity',
  'fillOpacity',
  'drawOpacity',
  'nodeDefault',
  'pathDefault',
  'labelDefault',
  'arrowDefault',
] as const satisfies ReadonlyArray<keyof FigureRootStyle>;

/**
 * figure 的 config
 * @description `viewBox` → IR.viewBox（内容坐标系）；`animations` → IR 根 `animations`（镜头时间轴，配 cameraTo
 *   preset）；`width`/`height` → 根 `<svg>` 显示尺寸（adapter 职责）；`idPrefix` → SVG 资源 id 前缀；根级级联样式
 *   （color / nodeDefault / pathDefault / labelDefault / arrowDefault 等）按需包合成根 `<Scope>`；其余（measureText /
 *   shapes / arrows / patterns / pathGenerators / padding / precision / nodeDistance / onWarn）派生自 core
 *   `CompileOptions`、原样喂 compileToScene。
 */
export type FigureConfig = {
  width?: number;
  height?: number;
  viewBox?: IRViewBox;
  idPrefix?: string;
  /** scene 根（镜头）时间轴动画 tracks（`viewBox` property，配 `cameraTo()` preset）；注入 IR 根 `animations` */
  animations?: Array<IRAnimationTrack>;
} & FigureRootStyle &
  CompileOptions;
