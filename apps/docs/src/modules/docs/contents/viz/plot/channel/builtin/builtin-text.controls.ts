import { NodeTextAlign } from '@retikz/core';

import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { textRows } from './builtin-text.data';
import { builtinTextI18n } from './builtin-text.i18n';

/** 按语言构建独立试验场契约 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = builtinTextI18n[lang];
  /** 试验场控件 */
  const builtinTextControls = definePreviewControls({
    presentation: 'panel',
    title: i18n.title,
    defaultSize: 38,
    sections: [
      {
        label: i18n.data,
        defaultCollapsed: true,
        controls: [
          {
            kind: 'table',
            id: 'rows',
            label: i18n.rows,
            rows: textRows,
            columns: [{ key: 'x' }, { key: 'y' }, { key: 'word' }],
          },
        ],
      },
      {
        label: i18n.typography,
        controls: [
          { kind: 'color', id: 'textColor', label: i18n.textColor, defaultValue: '#1e3a8a' },
          {
            kind: 'select',
            id: 'align',
            label: i18n.align,
            defaultValue: NodeTextAlign.Middle,
            options: [
              { value: NodeTextAlign.Start, label: i18n.start },
              { value: NodeTextAlign.Middle, label: i18n.middle },
              { value: NodeTextAlign.End, label: i18n.end },
            ],
          },
          { kind: 'range', id: 'fontSize', label: i18n.fontSize, defaultValue: 14, min: 10, max: 24, step: 1 },
          {
            kind: 'range',
            id: 'lineHeight',
            label: i18n.lineHeight,
            defaultValue: 18,
            min: 12,
            max: 32,
            step: 1,
          },
          {
            kind: 'range',
            id: 'maxTextWidth',
            label: i18n.maxTextWidth,
            defaultValue: 96,
            min: 48,
            max: 144,
            step: 8,
          },
        ],
      },
    ],
  });

  /** 稳定文档契约 */
  return {
    controls: builtinTextControls,
    canonicalValues: {
      textColor: '#1e3a8a',
      align: NodeTextAlign.Middle,
      fontSize: 14,
      lineHeight: 18,
      maxTextWidth: 96,
    },
    presetSelector: { label: i18n.preset, customLabel: i18n.custom },
    presets: [
      {
        id: 'card',
        label: i18n.compact,
        values: {
          textColor: '#1e3a8a',
          align: NodeTextAlign.Middle,
          fontSize: 14,
          lineHeight: 18,
          maxTextWidth: 96,
        },
      },
      {
        id: 'large',
        label: i18n.large,
        values: {
          textColor: '#7c2d12',
          align: NodeTextAlign.Middle,
          fontSize: 16,
          lineHeight: 22,
          maxTextWidth: 112,
        },
      },
    ],
    relatedApis: [
      'PointMark.textColor',
      'PointMark.align',
      'PointMark.font',
      'PointMark.lineHeight',
      'PointMark.maxTextWidth',
    ],
  } satisfies PreviewControlContract;
};
