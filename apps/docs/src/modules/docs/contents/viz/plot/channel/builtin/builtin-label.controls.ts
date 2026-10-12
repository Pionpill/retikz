import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { labelRows } from './builtin-label.data';
import { builtinLabelI18n } from './builtin-label.i18n';

/** 标签布局的双语交互契约 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = builtinLabelI18n[lang];
  const canonicalValues = {
    showLabel: true,
    labelPosition: 'top',
    labelDistance: 14,
    labelPin: true,
    labelTextColor: '#475569',
  } as const;
  const controls = definePreviewControls({
    presentation: 'panel',
    title: i18n.title,
    sections: [
      {
        label: i18n.data,
        defaultCollapsed: true,
        controls: [
          {
            kind: 'table',
            id: 'rows',
            label: i18n.rows,
            rows: labelRows,
            columns: [{ key: 'x' }, { key: 'y' }, { key: 'tag' }],
          },
        ],
      },
      {
        label: i18n.label,
        controls: [
          { kind: 'switch', id: 'showLabel', label: i18n.show, defaultValue: true },
          {
            kind: 'select',
            id: 'labelPosition',
            label: i18n.position,
            defaultValue: 'top',
            options: [
              { value: 'top', label: i18n.top },
              { value: 'right', label: i18n.right },
              { value: 'bottom', label: i18n.bottom },
              { value: 'left', label: i18n.left },
            ],
            visibleWhen: { controlId: 'showLabel', oneOf: [true] },
          },
          {
            kind: 'range',
            id: 'labelDistance',
            label: i18n.distance,
            defaultValue: 14,
            min: 0,
            max: 40,
            step: 2,
            visibleWhen: { controlId: 'showLabel', oneOf: [true] },
          },
          {
            kind: 'switch',
            id: 'labelPin',
            label: i18n.pin,
            defaultValue: true,
            visibleWhen: { controlId: 'showLabel', oneOf: [true] },
          },
          {
            kind: 'color',
            id: 'labelTextColor',
            label: i18n.color,
            defaultValue: '#475569',
            visibleWhen: { controlId: 'showLabel', oneOf: [true] },
          },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues,
    presetSelector: { label: i18n.preset, customLabel: i18n.custom },
    presets: [
      { id: 'pinned', label: i18n.pinned, values: canonicalValues },
      {
        id: 'beside',
        label: i18n.beside,
        values: { ...canonicalValues, labelPosition: 'right', labelDistance: 12, labelPin: false },
      },
    ],
    relatedApis: [
      'PointMark.label',
      'PointMark.label.position',
      'PointMark.label.distance',
      'PointMark.label.pin',
      'PointMark.label.textColor',
    ],
  } satisfies PreviewControlContract;
};
