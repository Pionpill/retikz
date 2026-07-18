import type { IRScope } from '@retikz/core';

/**
 * Scope 与 Layout 可共用的级联样式 props
 * @description 用于设置局部或全图默认样式；不包含 id、命名空间、变换、裁剪等容器语义字段
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
