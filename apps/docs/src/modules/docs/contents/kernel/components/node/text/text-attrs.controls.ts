import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Text 行级属性 playground 使用的稳定字段 id */
export const TextAttrsControlId = {
  Fill: 'fill',
  Opacity: 'opacity',
  FontFamily: 'fontFamily',
  FontSize: 'fontSize',
  FontWeight: 'fontWeight',
  FontStyle: 'fontStyle',
} as const;

/** Text 行级覆盖的中文属性面板 */
export const textAttrsControls = definePreviewControls({
  presentation: 'panel',
  title: '行级属性',
  sections: [
    {
      label: '颜色与透明度',
      controls: [
        {
          kind: 'color',
          id: TextAttrsControlId.Fill,
          label: '文字颜色',
          defaultValue: '#f97316',
        },
        {
          kind: 'range',
          id: TextAttrsControlId.Opacity,
          label: '透明度',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: '字体',
      controls: [
        {
          kind: 'select',
          id: TextAttrsControlId.FontFamily,
          label: '字族',
          defaultValue: 'sans-serif',
          options: [
            { value: 'sans-serif', label: '无衬线' },
            { value: 'serif', label: '衬线' },
            { value: 'monospace', label: '等宽' },
          ],
        },
        {
          kind: 'range',
          id: TextAttrsControlId.FontSize,
          label: '字号',
          defaultValue: 18,
          min: 10,
          max: 28,
          step: 1,
        },
        {
          kind: 'select',
          id: TextAttrsControlId.FontWeight,
          label: '字重',
          defaultValue: 'bold',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'bold', label: '粗体' },
          ],
        },
        {
          kind: 'select',
          id: TextAttrsControlId.FontStyle,
          label: '字形',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'italic', label: '斜体' },
          ],
        },
      ],
    },
  ],
});

/** Text 属性面板的稳定文档契约 */
export const previewControlContract = {
  controls: textAttrsControls,
  canonicalValues: {
    fill: '#f97316',
    opacity: 1,
    fontFamily: 'sans-serif',
    fontSize: 18,
    fontWeight: 'bold',
    fontStyle: 'normal',
  },
  relatedApis: ['Text.fill', 'Text.opacity', 'Text.font'],
} satisfies PreviewControlContract;
