import type { input } from 'zod';

import type { CompositeNodeSchema } from '../../../src/schemas';
import type { CoreEvalCase } from '../../create-suite';

/** CompositeNodeSchema 的完整输入任务与独立参考答案 */
export const cases: Array<CoreEvalCase<input<typeof CompositeNodeSchema>>> = [
  {
    id: 'X001',
    task: '生成 chart 域的 bars 扩展，保留 rows 字段为含一条记录的列表，记录中 v 为 0、active 为 false。',
    expected: {
      namespace: 'chart',
      type: 'bars',
      rows: [
        {
          v: 0,
          active: false,
        },
      ],
    },
  },
  {
    id: 'X002',
    task: '生成 layout 域的 bars 扩展，无额外载荷。',
    expected: {
      namespace: 'layout',
      type: 'bars',
    },
  },
  {
    id: 'X003',
    task: '生成 viz 域的 sample 扩展。原样保留 payload，其中 items 依次为字符串 A、整数 0、false、null 和含空数组 values 的对象，不将领域数据放进元数据。',
    expected: {
      namespace: 'viz',
      type: 'sample',
      payload: {
        items: [
          'A',
          0,
          false,
          null,
          {
            values: [],
          },
        ],
      },
    },
  },
  {
    id: 'X004',
    task: '两个已注册的扩展键分别是 layout 域的 grid 与 grid 域的 layout。选择前者，不提供参数。',
    expected: { namespace: 'layout', type: 'grid' },
    contrastId: 'X005',
  },
  {
    id: 'X005',
    task: '两个已注册的扩展键分别是 layout 域的 grid 与 grid 域的 layout。选择后者，不提供参数。',
    expected: { namespace: 'grid', type: 'layout' },
    contrastId: 'X004',
  },
];
