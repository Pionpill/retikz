import type { input } from 'zod';

import type { ClipFillRuleSchema } from '../../../src/schemas';
import type { CoreEvalCase } from '../../create-suite';

/** ClipFillRuleSchema 的完整输入任务与独立参考答案 */
export const cases: Array<CoreEvalCase<input<typeof ClipFillRuleSchema>>> = [
  {
    id: 'F001',
    contrastId: 'F002',
    task: '裁剪判定使用奇偶交叉规则。',
    expected: 'evenodd',
  },
  {
    id: 'F002',
    contrastId: 'F001',
    task: '按非零环绕数判定裁剪区域。',
    expected: 'nonzero',
  },
];
