import type { InputScope } from '@retikz/vanilla';

/** Scope 的级联视觉覆盖与后代默认通道，Layout 通过 rootScope 承载 */
export type ScopeStyleProps = {
  /** 为后代 Node、Path、Label 与 Arrow 提供默认样式；元素显式值优先，reset 可阻断指定外层通道 */
  defaults?: InputScope['defaults'];
};
