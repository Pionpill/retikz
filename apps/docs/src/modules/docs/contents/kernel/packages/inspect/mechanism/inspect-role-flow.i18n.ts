import type { InputFlowEntity } from '@retikz/diagram-vanilla/flow';

import type { Lang } from '@/i18n';

export const inspectRoleFlowI18n: Record<
  Lang,
  Record<'selection' | 'lookup' | 'inspector' | 'registry', InputFlowEntity['text']>
> = {
  zh: {
    selection: [
      'selection',
      {
        text: '声明观测意图',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    lookup: [
      'Inspect 调度',
      {
        text: '按名称查找定义',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    inspector: [
      'Inspector',
      {
        text: '等待最终几何',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    registry: [
      'registry',
      {
        text: '保存可用定义',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
  },
  en: {
    selection: [
      'selection',
      {
        text: 'Declare intent',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    lookup: [
      'Inspect driver',
      {
        text: 'Look up definition',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    inspector: [
      'Inspector',
      {
        text: 'Await final geometry',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    registry: [
      'registry',
      {
        text: 'Available definitions',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
  },
};
