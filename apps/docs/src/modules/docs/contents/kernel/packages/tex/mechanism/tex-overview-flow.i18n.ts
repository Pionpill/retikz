import type { InputFlowEntity } from '@retikz/diagram-vanilla/flow';

import type { Lang } from '@/i18n';

export const texOverviewFlowI18n: Record<
  Lang,
  {
    recognize: InputFlowEntity['text'];
    typeset: InputFlowEntity['text'];
    convert: InputFlowEntity['text'];
    emit: InputFlowEntity['text'];
  }
> = {
  zh: {
    recognize: ['识别公式', { text: '文本 → 公式片段', fill: 'gray', font: { size: 'sm' } }],
    typeset: ['引擎排版', { text: '公式 → SVG', fill: 'gray', font: { size: 'sm' } }],
    convert: ['转换字形与度量', { text: 'SVG → 路径', fill: 'gray', font: { size: 'sm' } }],
    emit: ['基线布局与输出', { text: '路径 → Scene', fill: 'gray', font: { size: 'sm' } }],
  },
  en: {
    recognize: ['Recognize', { text: 'Text → math run', fill: 'gray', font: { size: 'sm' } }],
    typeset: ['Typeset', { text: 'Formula → SVG', fill: 'gray', font: { size: 'sm' } }],
    convert: ['Convert', { text: 'SVG → paths', fill: 'gray', font: { size: 'sm' } }],
    emit: ['Lay out and emit', { text: 'Paths → Scene', fill: 'gray', font: { size: 'sm' } }],
  },
};
