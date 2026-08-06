/** React authored site 的领域中立类别 */
export type LayoutAuthoringSiteKind = 'scene' | 'scope' | 'path' | 'embeddable';

/**
 * React DSL 构建时报告给可选 compile driver 的 authored site
 * @description 基础 adapter 只提供 locator、元素 type 与不解释的 props；具体扩展语义由 driver 自己识别
 */
export type LayoutAuthoringSite = Readonly<{
  /** authored site 类别 */
  kind: LayoutAuthoringSiteKind;
  /** 与 Core compile occurrence 对齐的 authored source path；scene 根为空字符串 */
  sourcePath: string;
  /** 原始 React 元素 type；基础 adapter 不读取其扩展语义 */
  elementType: unknown;
  /** 由可选 wrapper 写入且基础 adapter 不解释的 props */
  props: Readonly<Record<string, unknown>>;
}>;

/** 构造冻结的领域中立 authored site */
export const createLayoutAuthoringSite = (site: LayoutAuthoringSite): LayoutAuthoringSite => Object.freeze(site);
