import type { IRNode } from '@retikz/core';

import type { BranchLayoutInput } from '../contract';
import type { IRBranchDiagram } from '../schemas';

/** Branch 引用和拓扑已解析的编译输入 */
export type CanonicalBranchDiagram = Readonly<{
  source: IRBranchDiagram;
  nodes: ReadonlyArray<IRNode & { id: string }>;
  layout: BranchLayoutInput['layout'];
}>;
