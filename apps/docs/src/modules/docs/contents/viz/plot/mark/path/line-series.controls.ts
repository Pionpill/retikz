import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { climate } from './line-series.data';
import { lineSeriesI18n } from './line-series.i18n';

/** 路径系列 playground 的稳定控件 id */
export const LINE_SERIES_CONTROL_IDS = {
  coordinate: 'path-series-coordinate',
  closed: 'path-series-closed',
  grouping: 'line-series-field',
  showLabels: 'line-series-show-labels',
  position: 'line-series-label-position',
  side: 'line-series-label-side',
  sloped: 'line-series-label-sloped',
  interrupt: 'line-series-label-interrupt',
  distance: 'line-series-label-distance',
} as const;

/** 兼容既有测试与源码引用的系列字段控件 id */
export const LINE_SERIES_CONTROL_ID = LINE_SERIES_CONTROL_IDS.grouping;

/** 路径系列的中文属性面板 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = lineSeriesI18n[lang];
  const visibleLabels = { controlId: LINE_SERIES_CONTROL_IDS.showLabels, oneOf: [true] };
  const lineSeriesControls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        label: text.data,
        defaultCollapsed: true,
        controls: [{ kind: 'table', id: 'climate', label: text.dataset, rows: climate }],
      },
      {
        label: text.coordinate,
        controls: [
          {
            kind: 'select',
            id: LINE_SERIES_CONTROL_IDS.coordinate,
            label: text.projection,
            defaultValue: 'cartesian2D',
            options: [
              { value: 'cartesian2D', label: text.cartesian },
              { value: 'polar2D', label: text.polar },
            ],
          },
          {
            kind: 'switch',
            id: LINE_SERIES_CONTROL_IDS.closed,
            label: text.closed,
            defaultValue: false,
            visibleWhen: { controlId: LINE_SERIES_CONTROL_IDS.coordinate, oneOf: ['polar2D'] },
          },
        ],
      },
      {
        label: text.grouping,
        controls: [
          {
            kind: 'select',
            id: LINE_SERIES_CONTROL_IDS.grouping,
            label: text.splitMode,
            defaultValue: 'series',
            options: [
              { value: 'series', label: text.explicitSeries },
              { value: 'color', label: text.implicitColor },
              { value: 'none', label: text.singlePath },
            ],
          },
        ],
      },
      {
        label: text.labels,
        visibleWhen: { controlId: LINE_SERIES_CONTROL_IDS.grouping, oneOf: ['series', 'color'] },
        controls: [
          {
            kind: 'switch',
            id: LINE_SERIES_CONTROL_IDS.showLabels,
            label: text.showLabels,
            defaultValue: true,
          },
          {
            kind: 'range',
            id: LINE_SERIES_CONTROL_IDS.position,
            label: text.position,
            defaultValue: 0.85,
            min: 0,
            max: 1,
            step: 0.05,
            visibleWhen: visibleLabels,
          },
          {
            kind: 'select',
            id: LINE_SERIES_CONTROL_IDS.side,
            label: text.side,
            defaultValue: 'auto',
            visibleWhen: visibleLabels,
            options: [
              { value: 'auto', label: text.auto },
              { value: 'top', label: text.top },
              { value: 'bottom', label: text.bottom },
              { value: 'left', label: text.left },
              { value: 'right', label: text.right },
            ],
          },
          {
            kind: 'switch',
            id: LINE_SERIES_CONTROL_IDS.sloped,
            label: text.sloped,
            defaultValue: false,
            visibleWhen: visibleLabels,
          },
          {
            kind: 'switch',
            id: LINE_SERIES_CONTROL_IDS.interrupt,
            label: text.interrupt,
            defaultValue: false,
            visibleWhen: visibleLabels,
          },
          {
            kind: 'range',
            id: LINE_SERIES_CONTROL_IDS.distance,
            label: text.distance,
            defaultValue: 6,
            min: 0,
            max: 20,
            step: 1,
            visibleWhen: visibleLabels,
          },
        ],
      },
    ],
  });

  /** 路径系列 playground 的稳定文档契约 */
  return {
    controls: lineSeriesControls,
    canonicalValues: {
      [LINE_SERIES_CONTROL_IDS.coordinate]: 'cartesian2D',
      [LINE_SERIES_CONTROL_IDS.closed]: false,
      [LINE_SERIES_CONTROL_IDS.grouping]: 'series',
      [LINE_SERIES_CONTROL_IDS.showLabels]: true,
      [LINE_SERIES_CONTROL_IDS.position]: 0.85,
      [LINE_SERIES_CONTROL_IDS.side]: 'auto',
      [LINE_SERIES_CONTROL_IDS.sloped]: false,
      [LINE_SERIES_CONTROL_IDS.interrupt]: false,
      [LINE_SERIES_CONTROL_IDS.distance]: 6,
    },
    relatedApis: [
      'Plot.coordinate',
      'PathMark.closed',
      'PathMark.series',
      'PathMark.color',
      'PathMark.label',
      'PathMark.order',
    ],
  } satisfies PreviewControlContract;
};

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract();
