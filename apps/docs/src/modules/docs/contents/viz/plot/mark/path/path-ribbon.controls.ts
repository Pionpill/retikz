import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { createPlotTransformResultView } from '../../transform-table-views';
import { createRibbonRows } from './path-ribbon.data';
import { pathRibbonI18n } from './path-ribbon.i18n';

/** 流带外观与中心线曲率控件 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const t = pathRibbonI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.title,
      sections: [
        {
          label: t.data,
          defaultCollapsed: true,
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: t.data,
              views: [
                {
                  id: 'source',
                  label: t.source,
                  rows: values => createRibbonRows(Number(values.curvature), Number(values.widthFactor)),
                },
                createPlotTransformResultView(
                  'flows',
                  t.flows,
                  (values: { curvature: number; widthFactor: number }) =>
                    createRibbonRows(values.curvature, values.widthFactor),
                  () => ({ kind: 'select', params: { groupBy: ['flowId'], selector: { kind: 'first' } } }),
                ),
                createPlotTransformResultView(
                  'nodes',
                  t.nodes,
                  (values: { curvature: number; widthFactor: number }) =>
                    createRibbonRows(values.curvature, values.widthFactor),
                  () => ({ kind: 'select', params: { groupBy: ['nodeId'], selector: { kind: 'first' } } }),
                ),
              ],
            },
          ],
        },
        {
          label: t.section,
          controls: [
            { kind: 'range', id: 'curvature', label: t.curvature, defaultValue: 0.5, min: 0.1, max: 0.9, step: 0.1 },
            { kind: 'range', id: 'widthFactor', label: t.width, defaultValue: 1, min: 0, max: 1, step: 0.1 },
            { kind: 'range', id: 'opacity', label: t.opacity, defaultValue: 0.65, min: 0.1, max: 1, step: 0.05 },
            { kind: 'switch', id: 'labels', label: t.labels, defaultValue: false },
          ],
        },
      ],
    }),
    canonicalValues: { curvature: 0.5, widthFactor: 1, opacity: 0.65, labels: false },
    relatedApis: [
      'PathMark.encodings.ribbon.width',
      'PathMark.properties.opacity',
      'PathMark.properties.label',
      'PlotPathStep.control1',
      'PlotPathStep.control2',
    ],
  } satisfies PreviewControlContract;
};
/** 默认控件契约 */
export const previewControlContract = createPreviewControlContract();
