import type { InputFlowEntity } from '@retikz/diagram-vanilla/flow';

import type { Lang } from '@/i18n';

export const inspectOutputFlowI18n: Record<
  Lang,
  Record<'options' | 'inspect' | 'subject' | 'fragment' | 'compile' | 'layers', InputFlowEntity['text']>
> = {
  zh: {
    options: [
      'options',
      {
        text: '级联 → 默认值 → 简写展开',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    inspect: [
      'inspect()',
      {
        text: '配置 + 几何 → 辅助 IR',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    subject: [
      'subject',
      {
        text: 'value 经 schema 校验',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    fragment: [
      '输出片段',
      {
        text: '整理回调输出',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    compile: [
      '隔离编译',
      {
        text: '片段 → 辅助平面',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    layers: [
      '宿主适配',
      {
        text: '平面 → 只读图层',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
  },
  en: {
    options: [
      'options',
      {
        text: 'Cascade → defaults → expand',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    inspect: [
      'inspect()',
      {
        text: 'Options + geometry → IR',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    subject: [
      'subject',
      {
        text: 'Schema-validated value',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    fragment: [
      'Output fragments',
      {
        text: 'Prepare callback output',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    compile: [
      'Isolated compile',
      {
        text: 'Fragments → plane',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
    layers: [
      'Host adapter',
      {
        text: 'Plane → readonly layers',
        fill: 'gray',
        font: {
          size: 'sm',
        },
      },
    ],
  },
};
