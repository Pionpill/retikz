import type { CompileObservationOwner } from '@retikz/core';

/** React 声明位置的领域中立类别 */
export type LayoutAuthoringSiteKind = 'scene' | 'scope' | 'path' | 'embeddable';

/**
 * React 声明构建时报告给可选编译驱动的位置
 * @description 基础适配器只提供定位信息、元素类型与不解释的属性，具体扩展语义由驱动识别
 */
export type LayoutAuthoringSite = Readonly<{
  /** 声明位置的类别 */
  kind: LayoutAuthoringSiteKind;
  /** 与 Core 编译实例对齐的声明来源路径；场景根为空字符串 */
  sourcePath: string;
  /** 声明位置对应的可观察所属者；场景与作用域等无所属者的容器可省略 */
  owner?: CompileObservationOwner;
  /** 原始 React 元素类型；基础适配器不读取其扩展语义 */
  elementType: unknown;
  /** 由可选包装组件写入且基础适配器不解释的属性 */
  props: Readonly<Record<string, unknown>>;
}>;

/** 构造冻结的领域中立声明位置 */
export const createLayoutAuthoringSite = (site: LayoutAuthoringSite): LayoutAuthoringSite => Object.freeze(site);
