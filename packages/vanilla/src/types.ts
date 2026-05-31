import type { IR, Scene, TextMeasurer } from '@retikz/core';

/** mountSvg / renderToSvgString 的入参：已编译 `Scene` 或待编译 `IR` */
export type RenderInput = Scene | IR;

/**
 * 两个入口共享的选项
 * @description `idPrefix`：SVG 资源 id 前缀，确定性（SSR↔客户端一致）；缺省 `'r'`，多实例同页须显式区分以免 id 撞。
 *   `measureText`：文本度量器；收 `ir` 且未给时回退 core `fallbackMeasurer`（近似、零 DOM、Node/浏览器一致），
 *   收 `scene` 时忽略（已在 compile 期测量）。要精确换行 / 节点尺寸须显式注入。
 */
export type CommonOptions = {
  idPrefix?: string;
  measureText?: TextMeasurer;
};

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
