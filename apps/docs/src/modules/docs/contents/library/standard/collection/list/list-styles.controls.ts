import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { listStylesI18n } from './list-styles.i18n';

/** 按文档语言创建交互面板 */
const createControls = (lang: Lang) => {
  const t = listStylesI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    defaultSize: 50,
    title: t.title,
    sections: [
      {
        label: t.geometry,
        controls: [
          {
            kind: 'select',
            id: 'direction',
            label: t.direction,
            defaultValue: 'row',
            options: [
              { value: 'row', label: t.row },
              { value: 'column', label: t.column },
            ],
          },
          {
            kind: 'select',
            id: 'widthMode',
            label: t.widthMode,
            defaultValue: 'fixed',
            options: [
              { value: 'fixed', label: t.fixedWidth },
              { value: 'auto', label: t.autoWidth },
              { value: 'content', label: t.contentWidth },
            ],
          },
          {
            kind: 'range',
            id: 'width',
            label: t.width,
            defaultValue: 64,
            min: 40,
            max: 90,
            step: 1,
            visibleWhen: { controlId: 'widthMode', oneOf: ['fixed'] },
          },
          { kind: 'switch', id: 'autoHeight', label: t.autoHeight, defaultValue: false },
          {
            kind: 'range',
            id: 'height',
            label: t.height,
            defaultValue: 40,
            min: 24,
            max: 60,
            step: 1,
            visibleWhen: { controlId: 'autoHeight', oneOf: [false] },
          },
          { kind: 'range', id: 'padding', label: t.padding, defaultValue: 4, min: 0, max: 10, step: 1 },
          { kind: 'range', id: 'gap', label: t.gap, defaultValue: 6, min: 0, max: 16, step: 1 },
        ],
      },
      {
        label: t.appearance,
        controls: [
          { kind: 'color', id: 'fill', label: t.fill, defaultValue: '#94a3b8' },
          { kind: 'color', id: 'stroke', label: t.stroke, defaultValue: '#64748b' },
          { kind: 'range', id: 'strokeWidth', label: t.strokeWidth, defaultValue: 1, min: 0, max: 4, step: 0.5 },
          { kind: 'range', id: 'fontSize', label: t.fontSize, defaultValue: 14, min: 10, max: 24, step: 1 },
          { kind: 'range', id: 'cornerRadius', label: t.cornerRadius, defaultValue: 0, min: 0, max: 20, step: 1 },
        ],
      },
      {
        label: t.index,
        controls: [
          { kind: 'switch', id: 'indexEnabled', label: t.indexEnabled, defaultValue: true },
          {
            kind: 'select',
            id: 'indexPosition',
            label: t.indexPosition,
            defaultValue: 'before',
            options: [
              { value: 'before', label: t.before },
              { value: 'after', label: t.after },
            ],
            visibleWhen: { controlId: 'indexEnabled', oneOf: [true] },
          },
          {
            kind: 'range',
            id: 'indexStart',
            label: t.indexStart,
            defaultValue: 0,
            min: 0,
            max: 10,
            step: 1,
            visibleWhen: { controlId: 'indexEnabled', oneOf: [true] },
          },
          {
            kind: 'range',
            id: 'indexFontSize',
            label: t.fontSize,
            defaultValue: 14,
            min: 10,
            max: 28,
            step: 1,
            visibleWhen: { controlId: 'indexEnabled', oneOf: [true] },
          },
          {
            kind: 'select',
            id: 'indexFontWeight',
            label: t.fontWeight,
            defaultValue: 'normal',
            options: [
              { value: 'normal', label: t.normal },
              { value: 'bold', label: t.bold },
            ],
            visibleWhen: { controlId: 'indexEnabled', oneOf: [true] },
          },
          {
            kind: 'color',
            id: 'indexTextColor',
            label: t.textColor,
            defaultValue: '#64748b',
            visibleWhen: { controlId: 'indexEnabled', oneOf: [true] },
          },
        ],
      },
      { label: t.local, controls: [{ kind: 'switch', id: 'override', label: t.override, defaultValue: true }] },
    ],
  });
};
/** 交互示例的稳定状态和 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: {
      direction: 'row',
      widthMode: 'fixed',
      autoHeight: false,
      width: 64,
      height: 40,
      padding: 4,
      gap: 6,
      indexEnabled: true,
      indexPosition: 'before',
      indexStart: 0,
      indexFontSize: 14,
      indexFontWeight: 'normal',
      indexTextColor: '#64748b',
      cornerRadius: 0,
      fill: '#94a3b8',
      stroke: '#64748b',
      strokeWidth: 1,
      fontSize: 14,
      override: true,
    },
    relatedApis: ['List.layout', 'List.style', 'List.index', 'List.items'],
  }) satisfies PreviewControlContract;
/** 注册与源码派生使用的默认契约 */
export const previewControlContract = createPreviewControlContract('zh');
