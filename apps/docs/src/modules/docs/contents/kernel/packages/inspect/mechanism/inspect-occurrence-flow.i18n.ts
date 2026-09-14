import type { InputFlowEntity } from '@retikz/diagram-vanilla/flow';

import type { Lang } from '@/i18n';

export const inspectOccurrenceFlowI18n: Record<
  Lang,
  Record<'source' | 'admit' | 'compile' | 'instances' | 'match' | 'selected', InputFlowEntity['text']>
> = {
  zh: {
    source: [
      '输入对象',
      {
        text: '同一个 source path',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    admit: [
      '准入',
      {
        text: '检查定位与选项',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    compile: [
      'Core 编译',
      {
        text: '收集最终通知',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    instances: [
      '实例 0 · 实例 1',
      {
        text: '各自的 occurrence + value',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    match: [
      '最终匹配',
      {
        text: 'occurrenceIndex: 1',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    selected: [
      '选中实例 1',
      {
        text: '第二个最终实例',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
  },
  en: {
    source: [
      'Input object',
      {
        text: 'One source path',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    admit: [
      'Admission',
      {
        text: 'Location + options',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    compile: [
      'Core compile',
      {
        text: 'Collect final outputs',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    instances: [
      'Instance 0 · Instance 1',
      {
        text: 'Separate occurrence + value',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    match: [
      'Final matching',
      {
        text: 'occurrenceIndex: 1',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    selected: [
      'Instance 1 selected',
      {
        text: 'Second final instance',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
  },
};
