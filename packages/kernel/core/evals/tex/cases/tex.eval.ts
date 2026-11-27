import type { input } from 'zod';

import type { TexContentSchema } from '../../../src/schemas';
import type { CoreEvalCase } from '../../create-suite';

/** TexContentSchema 的完整输入任务与独立参考答案 */
export const cases: Array<CoreEvalCase<input<typeof TexContentSchema>>> = [
  {
    id: 'T001',
    contrastId: 'T003',
    task: '用块级度量排版公式 x^2，不带数学分隔符。',
    expected: {
      tex: 'x^2',
      displayMode: true,
    },
  },
  {
    id: 'T002',
    task: '以默认行内度量排版 a+b，省略模式设置。',
    expected: {
      tex: 'a+b',
    },
  },
  {
    id: 'T003',
    task: '保留同一段公式 x^2。显式选择行内度量，不依赖默认值。',
    expected: { tex: 'x^2', displayMode: false },
    contrastId: 'T001',
  },
];
