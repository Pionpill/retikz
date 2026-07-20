import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Node 文本 playground 使用的稳定字段 id */
export const NodeTextControlId = {
  Content: 'content',
  Shape: 'shape',
  Align: 'align',
  MaxTextWidth: 'maxTextWidth',
  LineHeight: 'lineHeight',
  FirstFill: 'firstFill',
  FirstEmphasis: 'firstEmphasis',
  FirstOpacity: 'firstOpacity',
  SecondFill: 'secondFill',
  SecondEmphasis: 'secondEmphasis',
  SecondOpacity: 'secondOpacity',
  RestFill: 'restFill',
  RestEmphasis: 'restEmphasis',
  RestOpacity: 'restOpacity',
} as const;

/** Node 多行内容、换行与行级样式的中文属性面板 */
export const nodeTextControls = definePreviewControls({
  presentation: 'panel',
  title: '文本',
  sections: [
    {
      label: '内容与排版',
      controls: [
        {
          kind: 'select',
          id: NodeTextControlId.Content,
          label: '内容',
          defaultValue: 'A\nB\nC',
          options: [
            { value: 'A\nB\nC', label: 'A / B / C' },
            { value: 'First\nSecond\nThird', label: '第一 / 第二 / 第三' },
            { value: 'Short\nline\nset', label: '短行集合' },
          ],
        },
        {
          kind: 'select',
          id: NodeTextControlId.Shape,
          label: 'shape',
          defaultValue: 'rectangle',
          options: [
            { value: 'rectangle', label: '矩形' },
            { value: 'circle', label: '圆形' },
            { value: 'ellipse', label: '椭圆' },
            { value: 'diamond', label: '菱形' },
          ],
        },
        {
          kind: 'select',
          id: NodeTextControlId.Align,
          label: 'align',
          defaultValue: 'middle',
          options: [
            { value: 'start', label: '左对齐' },
            { value: 'middle', label: '居中' },
            { value: 'end', label: '右对齐' },
          ],
        },
        {
          kind: 'range',
          id: NodeTextControlId.MaxTextWidth,
          label: '折行阈值',
          defaultValue: 150,
          min: 60,
          max: 220,
          step: 10,
        },
        {
          kind: 'range',
          id: NodeTextControlId.LineHeight,
          label: '行高',
          defaultValue: 24,
          min: 16,
          max: 36,
          step: 2,
        },
      ],
    },
    {
      label: '第 1 行样式',
      controls: [
        { kind: 'color', id: NodeTextControlId.FirstFill, label: '文字颜色', defaultValue: '#2563eb' },
        {
          kind: 'select',
          id: NodeTextControlId.FirstEmphasis,
          label: '强调',
          defaultValue: 'bold',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'bold', label: '粗体' },
            { value: 'italic', label: '斜体' },
            { value: 'bold-italic', label: '粗斜体' },
          ],
        },
        {
          kind: 'range',
          id: NodeTextControlId.FirstOpacity,
          label: '透明度',
          defaultValue: 1,
          min: 0.2,
          max: 1,
          step: 0.1,
        },
      ],
    },
    {
      label: '第 2 行样式',
      controls: [
        { kind: 'color', id: NodeTextControlId.SecondFill, label: '文字颜色', defaultValue: '#172033' },
        {
          kind: 'select',
          id: NodeTextControlId.SecondEmphasis,
          label: '强调',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'bold', label: '粗体' },
            { value: 'italic', label: '斜体' },
            { value: 'bold-italic', label: '粗斜体' },
          ],
        },
        {
          kind: 'range',
          id: NodeTextControlId.SecondOpacity,
          label: '透明度',
          defaultValue: 1,
          min: 0.2,
          max: 1,
          step: 0.1,
        },
      ],
    },
    {
      label: '第 3 行及以后',
      controls: [
        { kind: 'color', id: NodeTextControlId.RestFill, label: '文字颜色', defaultValue: '#f97316' },
        {
          kind: 'select',
          id: NodeTextControlId.RestEmphasis,
          label: '强调',
          defaultValue: 'italic',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'bold', label: '粗体' },
            { value: 'italic', label: '斜体' },
            { value: 'bold-italic', label: '粗斜体' },
          ],
        },
        {
          kind: 'range',
          id: NodeTextControlId.RestOpacity,
          label: '透明度',
          defaultValue: 0.75,
          min: 0.2,
          max: 1,
          step: 0.1,
        },
      ],
    },
  ],
});

/** Node 文本面板的稳定文档契约 */
export const previewControlContract = {
  controls: nodeTextControls,
  canonicalValues: {
    content: 'A\nB\nC',
    shape: 'rectangle',
    align: 'middle',
    maxTextWidth: 150,
    lineHeight: 24,
    firstFill: '#2563eb',
    firstEmphasis: 'bold',
    firstOpacity: 1,
    secondFill: '#172033',
    secondEmphasis: 'normal',
    secondOpacity: 1,
    restFill: '#f97316',
    restEmphasis: 'italic',
    restOpacity: 0.75,
  },
  relatedApis: ['Node.text', 'Node.shape', 'Node.align', 'Node.maxTextWidth', 'Node.lineHeight', 'IRLineSpec'],
} satisfies PreviewControlContract;
