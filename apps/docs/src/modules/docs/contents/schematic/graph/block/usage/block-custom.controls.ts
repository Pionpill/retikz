import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { blockCustomI18n } from './block-custom.i18n';

/** Block 自定义元素 playground 使用的稳定字段 id */
export const BlockCustomControlId = {
  Content: 'content',
  FontSize: 'fontSize',
  Shape: 'shape',
  Padding: 'padding',
  MinimumWidth: 'minimumWidth',
  MinimumHeight: 'minimumHeight',
  Rotate: 'rotate',
  CornerRadius: 'cornerRadius',
  Fill: 'fill',
  Stroke: 'stroke',
  StrokeWidth: 'strokeWidth',
  Dashed: 'dashed',
  Opacity: 'opacity',
  Shadow: 'shadow',
  TextColor: 'textColor',
} as const;

/** Block 自定义元素 playground 的稳定默认值 */
export const blockCustomCanonicalValues = {
  content: 'Cache hit rate 98.7%',
  fontSize: 'sm',
  shape: 'diamond',
  padding: 10,
  minimumWidth: 160,
  minimumHeight: 40,
  rotate: 0,
  cornerRadius: 6,
  fill: '#e2e8f0',
  stroke: '#64748b',
  strokeWidth: 1,
  dashed: false,
  opacity: 1,
  shadow: 'none',
  textColor: '#0f172a',
} as const;

/** 只在矩形 Node 上显示圆角控制 */
export const BlockCustomVisibleWhen = {
  CornerRadius: { controlId: BlockCustomControlId.Shape, oneOf: ['rectangle'] },
} as const;

/** Block 自定义元素的中文控制 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const controls = definePreviewControls({
    presentation: 'panel',
    defaultSize: 50,
    title: blockCustomI18n[lang].controls[0],
    sections: [
      {
        label: blockCustomI18n[lang].controls[1],
        controls: [
          {
            kind: 'text',
            id: BlockCustomControlId.Content,
            label: blockCustomI18n[lang].controls[2],
            defaultValue: blockCustomCanonicalValues.content,
            placeholder: blockCustomI18n[lang].controls[3],
          },
          {
            kind: 'select',
            id: BlockCustomControlId.FontSize,
            label: blockCustomI18n[lang].controls[4],
            defaultValue: blockCustomCanonicalValues.fontSize,
            options: [
              { value: 'xs', label: blockCustomI18n[lang].controls[5] },
              { value: 'sm', label: blockCustomI18n[lang].controls[6] },
              { value: 'base', label: blockCustomI18n[lang].controls[7] },
              { value: 'lg', label: blockCustomI18n[lang].controls[8] },
            ],
          },
        ],
      },
      {
        label: blockCustomI18n[lang].controls[9],
        controls: [
          {
            kind: 'select',
            id: BlockCustomControlId.Shape,
            label: blockCustomI18n[lang].controls[10],
            defaultValue: blockCustomCanonicalValues.shape,
            options: [
              { value: 'rectangle', label: blockCustomI18n[lang].controls[11] },
              { value: 'circle', label: blockCustomI18n[lang].controls[12] },
              { value: 'ellipse', label: blockCustomI18n[lang].controls[13] },
              { value: 'diamond', label: blockCustomI18n[lang].controls[14] },
            ],
          },
          {
            kind: 'range',
            id: BlockCustomControlId.Padding,
            label: blockCustomI18n[lang].controls[15],
            defaultValue: blockCustomCanonicalValues.padding,
            min: 0,
            max: 24,
            step: 2,
          },
          {
            kind: 'range',
            id: BlockCustomControlId.MinimumWidth,
            label: blockCustomI18n[lang].controls[16],
            defaultValue: blockCustomCanonicalValues.minimumWidth,
            min: 80,
            max: 224,
            step: 8,
          },
          {
            kind: 'range',
            id: BlockCustomControlId.MinimumHeight,
            label: blockCustomI18n[lang].controls[17],
            defaultValue: blockCustomCanonicalValues.minimumHeight,
            min: 24,
            max: 96,
            step: 8,
          },
          {
            kind: 'range',
            id: BlockCustomControlId.Rotate,
            label: blockCustomI18n[lang].controls[18],
            defaultValue: blockCustomCanonicalValues.rotate,
            min: -45,
            max: 45,
            step: 5,
          },
          {
            kind: 'range',
            id: BlockCustomControlId.CornerRadius,
            label: blockCustomI18n[lang].controls[19],
            defaultValue: blockCustomCanonicalValues.cornerRadius,
            min: 0,
            max: 24,
            step: 2,
            visibleWhen: BlockCustomVisibleWhen.CornerRadius,
          },
        ],
      },
      {
        label: blockCustomI18n[lang].controls[20],
        controls: [
          {
            kind: 'color',
            id: BlockCustomControlId.Fill,
            label: blockCustomI18n[lang].controls[21],
            defaultValue: blockCustomCanonicalValues.fill,
          },
          {
            kind: 'color',
            id: BlockCustomControlId.Stroke,
            label: blockCustomI18n[lang].controls[22],
            defaultValue: blockCustomCanonicalValues.stroke,
          },
          {
            kind: 'range',
            id: BlockCustomControlId.StrokeWidth,
            label: blockCustomI18n[lang].controls[23],
            defaultValue: blockCustomCanonicalValues.strokeWidth,
            min: 0,
            max: 6,
            step: 0.5,
          },
          {
            kind: 'switch',
            id: BlockCustomControlId.Dashed,
            label: blockCustomI18n[lang].controls[24],
            defaultValue: blockCustomCanonicalValues.dashed,
          },
          {
            kind: 'range',
            id: BlockCustomControlId.Opacity,
            label: blockCustomI18n[lang].controls[25],
            defaultValue: blockCustomCanonicalValues.opacity,
            min: 0.2,
            max: 1,
            step: 0.05,
          },
          {
            kind: 'select',
            id: BlockCustomControlId.Shadow,
            label: blockCustomI18n[lang].controls[26],
            defaultValue: blockCustomCanonicalValues.shadow,
            options: [
              { value: 'none', label: blockCustomI18n[lang].controls[27] },
              { value: 'sm', label: blockCustomI18n[lang].controls[28] },
              { value: 'md', label: blockCustomI18n[lang].controls[29] },
              { value: 'lg', label: blockCustomI18n[lang].controls[30] },
            ],
          },
          {
            kind: 'color',
            id: BlockCustomControlId.TextColor,
            label: blockCustomI18n[lang].controls[31],
            defaultValue: blockCustomCanonicalValues.textColor,
          },
        ],
      },
    ],
  });

  /** Block 自定义元素 playground 的稳定文档契约 */
  return {
    controls,
    canonicalValues: blockCustomCanonicalValues,
    relatedApis: [
      'Block.children',
      'Node.children',
      'Node.style.font',
      'Node.shape',
      'Node.layout.padding',
      'Node.layout.minimumSize',
      'Node.rotate',
      'Node.cornerRadius',
      'Node.style.fill',
      'Node.style.stroke',
      'Node.style.strokeWidth',
      'Node.style.dashed',
      'Node.style.opacity',
      'Node.style.shadow',
      'Node.style.textColor',
    ],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract();
export const blockCustomControls = previewControlContract.controls;
