/** Vanilla authored site 的领域中立类别 */
export type VanillaAuthoringSiteKind = 'scene' | 'scope' | 'path' | 'embeddable';

/**
 * Vanilla 规范化时报告给可选编译驱动的 authored site
 * @description 基础 adapter 只提供来源路径、类型与不解释的 authoring 载荷；具体扩展语义由驱动自行识别
 */
export type VanillaAuthoringSite = Readonly<{
  /** authored site 类别 */
  kind: VanillaAuthoringSiteKind;
  /** 与 Core compile occurrence 对齐的 authored source path；scene 根为空字符串 */
  sourcePath: string;
  /** plain spec 节点类型或嵌入 kind */
  type: string;
  /** 由可选扩展写入且基础 adapter 不解释的运行时载荷 */
  authoring: unknown;
}>;

/** 构造冻结的领域中立 authored site */
export const createVanillaAuthoringSite = (site: VanillaAuthoringSite): VanillaAuthoringSite => Object.freeze(site);
