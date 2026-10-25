import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { rows } from './path-construction.data';
import { pathConstructionI18n } from './path-construction.i18n';

/** 路径构造的控件与重置基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const t = pathConstructionI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.title,
      sections: [
        { label: t.data, defaultCollapsed: true, controls: [{ kind: 'table', id: 'rows', label: t.rows, rows }] },
        {
          label: t.geometry,
          controls: [
            {
              kind: 'select',
              id: 'kind',
              label: t.kind,
              defaultValue: 'bend',
              options: [
                { value: 'line', label: t.line },
                { value: 'bend', label: t.bend },
                { value: 'fold', label: t.fold },
              ],
            },
            {
              kind: 'range',
              id: 'angle',
              label: t.angle,
              defaultValue: 25,
              min: 0,
              max: 60,
              step: 5,
              visibleWhen: { controlId: 'kind', oneOf: ['bend'] },
            },
            {
              kind: 'select',
              id: 'direction',
              label: t.direction,
              defaultValue: 'left',
              options: [
                { value: 'left', label: t.left },
                { value: 'right', label: t.right },
              ],
              visibleWhen: { controlId: 'kind', oneOf: ['bend'] },
            },
          ],
        },
        {
          label: t.fold,
          visibleWhen: { controlId: 'kind', oneOf: ['fold'] },
          controls: [
            {
              kind: 'select',
              id: 'via',
              label: t.via,
              defaultValue: '-|-',
              options: [
                { value: '-|', label: t.hv },
                { value: '|-', label: t.vh },
                { value: '-|-', label: t.hvh },
                { value: '|-|', label: t.vhv },
              ],
              visibleWhen: { controlId: 'kind', oneOf: ['fold'] },
            },
            {
              kind: 'range',
              id: 'fraction',
              label: t.fraction,
              defaultValue: 0.5,
              min: 0,
              max: 1,
              step: 0.1,
              visibleWhen: { controlId: 'via', oneOf: ['-|-', '|-|'] },
            },
            {
              kind: 'range',
              id: 'radius',
              label: t.radius,
              defaultValue: 5,
              min: 0,
              max: 20,
              step: 1,
              visibleWhen: { controlId: 'kind', oneOf: ['fold'] },
            },
          ],
        },
        {
          label: t.appearance,
          controls: [
            { kind: 'range', id: 'width', label: t.width, defaultValue: 1.5, min: 0.5, max: 5, step: 0.5 },
            {
              kind: 'select',
              id: 'arrow',
              label: t.arrow,
              defaultValue: 'end',
              options: [
                { value: 'none', label: t.none },
                { value: 'end', label: t.end },
                { value: 'both', label: t.both },
              ],
            },
            { kind: 'switch', id: 'dashed', label: t.dashed, defaultValue: false },
          ],
        },
      ],
    }),
    canonicalValues: {
      kind: 'bend',
      angle: 25,
      direction: 'left',
      via: '-|-',
      fraction: 0.5,
      radius: 5,
      width: 1.5,
      arrow: 'end',
      dashed: false,
    },
    relatedApis: [
      'PlotPathStep.kind',
      'PlotPathStep.bendAngle',
      'PlotPathStep.bendDirection',
      'PlotPathStep.via',
      'PlotPathStep.fraction',
      'PathMark.properties.cornerRadius',
      'PathMark.properties.strokeWidth',
      'PathMark.properties.dashPattern',
      'PathMark.arrow',
    ],
  } satisfies PreviewControlContract;
};
/** 默认控件契约 */
export const previewControlContract = createPreviewControlContract();
