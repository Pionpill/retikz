import type { IRNode } from '@retikz/core';

import type { BranchLayoutInput } from '../contract';
import type { IRBranchDiagram } from '../schemas';

/** Branch 引用和拓扑已解析的编译输入 */
export type CanonicalBranchDiagram = Readonly<{
  /** 解析后的分支图源描述 */
  source: IRBranchDiagram;
  /** 具有明确身份的共享节点目录 */
  nodes: ReadonlyArray<
    IRNode & {
      /** 用于分支节点引用与布局结果对应的唯一标识 */
      id: string;
    }
  >;
  /** 已补齐方向与净间距的布局参数 */
  layout: BranchLayoutInput['layout'];
}>;
