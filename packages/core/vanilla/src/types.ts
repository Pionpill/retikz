import type { CompileOptions, IR, Scene } from '@retikz/core';
import type { Figure } from './figure';

/** mountSvg / renderToSvgString 的入参：已编译 `Scene`、待编译 `IR`，或命令式 builder 的 `Figure` */
export type RenderInput = Scene | IR | Figure;

/**
 * 两个入口共享的选项
 * @description `idPrefix`：SVG 资源 id 前缀，确定性（SSR↔客户端一致），缺省 `'r'`。`width`/`height`：写回根
 *   `<svg>` 的显示尺寸（adapter 职责，`@retikz/render/svg` 只产 viewBox）；缺省不写、由 CSS/容器定。其余继承 core
 *   `CompileOptions`（`measureText` / `shapes` / `arrows` / `patterns` / `pathGenerators` / `padding` /
 *   `precision` / `nodeDistance` / `onWarn`）——收 `ir` 时透传给 `compileToScene`，收 `scene` 时忽略。
 */
export type CommonOptions = {
  idPrefix?: string;
  width?: number;
  height?: number;
} & CompileOptions;

export type RenderToStringOptions = CommonOptions;
export type MountOptions = CommonOptions;

/** `mountSvg` 返回的句柄：`root` 元素 identity 跨 `update` 稳定、永不失效 */
export type VanillaView = {
  /** 挂载出的根 `<svg>`；跨 `update` 同一元素（不被替换） */
  readonly root: SVGSVGElement;
  /** 整图重渲染（原地复用 `root`，清子节点 + 重设 root attrs + 重物化），不承诺局部 patch */
  update: (next: RenderInput) => void;
  /** 卸载：移除 `root`、置 view 失效（再调 `update` 抛、`dispose` noop） */
  dispose: () => void;
};
