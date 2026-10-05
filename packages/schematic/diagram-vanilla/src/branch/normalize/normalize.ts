import type { IRBranchDiagram } from '@retikz/diagram/branch';

import type { InputBranchDiagram } from './types';

/** 将类型化作者输入组装为唯一 Branch Source，不物化默认值 */
export const normalizeBranchDiagram = (input: InputBranchDiagram): IRBranchDiagram => ({
  namespace: 'diagram',
  type: 'branch',
  ...input,
});
