import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { axisCoordinateBasicsRows } from './axis-coordinate-basics.data';
import { controlLabels } from './axis-coordinate-basics.i18n';

/** 坐标系基础示例的中文控件 */
const createControls = (lang: Lang) => {
  const text = controlLabels[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: text.coordinateSystemAndAxisRoles,
    sections: [
      {
        label: text.data,
        defaultCollapsed: true,
        controls: [
          {
            kind: 'table',
            id: 'rows',
            label: text.dimensionValues,
            rows: axisCoordinateBasicsRows,
            columns: [{ key: 'dimension' }, { key: 'value' }, { key: 'order' }],
          },
        ],
      },
      {
        label: text.coordinate,
        controls: [
          {
            kind: 'select',
            id: 'coordinate',
            label: text.projection,
            defaultValue: 'cartesian2D',
            options: [
              { value: 'cartesian2D', label: text.cartesian },
              { value: 'polar2D', label: text.polar },
            ],
          },
        ],
      },
      {
        label: text.axes,
        controls: [
          { kind: 'switch', id: 'showX', label: text.showXAngularAxis, defaultValue: true },
          { kind: 'switch', id: 'showY', label: text.showYRadialAxis, defaultValue: true },
          {
            kind: 'switch',
            id: 'showGrid',
            label: text.showYRadialGrid,
            defaultValue: true,
            visibleWhen: { controlId: 'showY', oneOf: [true] },
          },
          {
            kind: 'range',
            id: 'tickCount',
            label: text.targetYRadialTickCount,
            defaultValue: 5,
            min: 2,
            max: 8,
            step: 1,
            visibleWhen: { controlId: 'showY', oneOf: [true] },
          },
        ],
      },
    ],
  });
};

/** 坐标系基础示例的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: {
      coordinate: 'cartesian2D',
      showX: true,
      showY: true,
      showGrid: true,
      tickCount: 5,
    },
    relatedApis: ['Plot.coordinate', 'PlotAxis.dimension', 'PlotAxis.grid', 'PlotAxis.ticks'],
  }) satisfies PreviewControlContract;
