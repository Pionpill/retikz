import type { Lang } from '@/i18n';
import type { PreviewControlContract, PreviewTableRowsResolver } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { readInspectionRows } from './flex-inspection.data';
import { demoI18n } from './flex-inspection.i18n';

/** 当前语言的功能控件与稳定基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const rows: PreviewTableRowsResolver = values => readInspectionRows(values, text);
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        label: text.results,
        controls: [
          {
            kind: 'table',
            id: 'results',
            label: text.results,
            views: [
              { id: 'result', label: text.results, rows },
              {
                id: 'input',
                label: text.input,
                rows: (values: Parameters<PreviewTableRowsResolver>[0]) =>
                  ['A', 'B', 'C'].map(key => ({ [text.key]: key, [text.basis]: values.basis })),
              },
            ],
          },
        ],
      },
      {
        label: text.title,
        controls: [
          { kind: 'range', id: 'width', label: text.width, defaultValue: 260, min: 180, max: 300, step: 1 },
          { kind: 'range', id: 'basis', label: text.basis, defaultValue: 90, min: 60, max: 110, step: 1 },
          {
            kind: 'select',
            id: 'wrap',
            label: text.wrap,
            defaultValue: 'wrap',
            options: [
              { value: 'nowrap', label: text.wrapOption0 },
              { value: 'wrap', label: text.wrapOption1 },
            ],
          },
          { kind: 'switch', id: 'slots', label: text.slots, defaultValue: true },
          { kind: 'switch', id: 'allocation', label: text.allocation, defaultValue: true },
          { kind: 'switch', id: 'gaps', label: text.gaps, defaultValue: true },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { width: 260, basis: 90, wrap: 'wrap', slots: true, allocation: true, gaps: true },
    relatedApis: [
      'FlexLayout.size',
      'FlexLayout.wrap',
      'FlexLayoutItem.basis',
      'FlexLayoutInspectOptions.bounds',
      'FlexLayoutInspectOptions.gaps',
      'FlexLayoutArtifact.items',
    ],
  } satisfies PreviewControlContract;
};
/** 默认语言的注册契约 */
export const previewControlContract = createPreviewControlContract('zh');
