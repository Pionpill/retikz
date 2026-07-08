import type { IRScope } from '@retikz/core';

/**
 * Scope 级联样式 props 子集——`<Scope>` 与 `<Layout>` 共用同一份定义，避免两处漂移
 * @description 取 IRScope 的「级联样式」通道（graphic state + 四通道 every-X），**不含**容器 / 命名空间 /
 *   局部变换语义字段（`id` / `localNamespace` / `transforms` / `resetStyle` / `zIndex` / `clip`）——这些挂在
 *   顶层 `<Layout>` 上要么无意义、要么语义易混，故不在此暴露。
 *   `<Layout>` 设任一字段时把 children 包进合成根 `<Scope>`，编译产物 = 用户手写一层根 `<Scope>` 的同一 IR。
 */
export type ScopeStyleProps = {
  /** 级联主色（TikZ scope `color=`）；内部元素 stroke / fill / 文字未单设则随它，并级联到边 label / 箭头 */
  color?: IRScope['color'];
  /** 级联默认描边色（覆盖主色的 stroke 通道） */
  stroke?: IRScope['stroke'];
  /** 级联默认填充色 */
  fill?: IRScope['fill'];
  /** 级联默认描边宽度（user units） */
  strokeWidth?: IRScope['strokeWidth'];
  /** 级联默认整体透明度 0~1（嵌套替换、不复合，与 TikZ 默认一致） */
  opacity?: IRScope['opacity'];
  /** 级联默认填充透明度 0~1 */
  fillOpacity?: IRScope['fillOpacity'];
  /** 级联默认描边透明度 0~1（TikZ `stroke opacity`） */
  strokeOpacity?: IRScope['strokeOpacity'];
  /** every node 默认样式（TikZ `every node`），扁平独立通道 */
  nodeDefault?: IRScope['nodeDefault'];
  /** every path 默认样式（TikZ `every path`）；箭头走 arrowDefault 通道 */
  pathDefault?: IRScope['pathDefault'];
  /** every label 默认样式（node label + step label 共享） */
  labelDefault?: IRScope['labelDefault'];
  /** every arrow 默认样式（TikZ `every arrow`） */
  arrowDefault?: IRScope['arrowDefault'];
};
