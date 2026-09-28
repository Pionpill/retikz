const extraText = extraControlI18n.zh;
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { connectedScatterData } from './connected-scatter-basic.data';
import { extraControlI18n } from './connected-scatter-basic.i18n';

export const CONNECTED_SCATTER_CONTROL_IDS = {
  curve: 'connected-scatter-curve',
  coordinateSystem: 'connected-scatter-coordinate-system',
  colorMode: 'connected-scatter-color-mode',
  lineOpacity: 'connected-scatter-basic-lineOpacity',

  pointOpacity: 'connected-scatter-basic-pointOpacity',
  connectNulls: 'connected-scatter-connect-nulls',
  lineStyle: 'connected-scatter-line-style',
  strokeWidth: 'connected-scatter-stroke-width',
  pointSize: 'connected-scatter-point-size',
} as const;

export const connectedScatterBasicControls = definePreviewControls({
  presentation: 'panel',
  title: '轨迹与观测点',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'World Bank 国家轨迹',
          rows: connectedScatterData,
          columns: [{ key: 'country' }, { key: 'year' }, { key: 'urbanization' }, { key: 'lifeExpectancy' }],
        },
      ],
    },

    createPointCoordinateSection(CONNECTED_SCATTER_CONTROL_IDS.coordinateSystem, 'zh'),
    {
      label: '轨迹',
      controls: [
        {
          kind: 'select',
          id: CONNECTED_SCATTER_CONTROL_IDS.curve,
          label: extraText.curve,
          defaultValue: 'linear',
          options: [
            { value: 'linear', label: extraText.linear },
            { value: 'step', label: extraText.step },
            { value: 'stepBefore', label: extraText.stepBefore },
            { value: 'stepAfter', label: extraText.stepAfter },
            { value: 'basis', label: extraText.basis },
            { value: 'cardinal', label: extraText.cardinal },
            { value: 'catmullRom', label: extraText.catmullRom },
            { value: 'monotoneX', label: extraText.monotoneX },
            { value: 'monotoneY', label: extraText.monotoneY },
            { value: 'natural', label: extraText.natural },
          ],
        },
        {
          kind: 'select',
          id: CONNECTED_SCATTER_CONTROL_IDS.colorMode,
          label: extraText.colorMode,
          defaultValue: 'series',
          options: [
            { value: 'series', label: extraText.series },
            { value: 'mark', label: extraText.mark },
            { value: 'muted', label: extraText.muted },
          ],
        },
        { kind: 'switch', id: CONNECTED_SCATTER_CONTROL_IDS.connectNulls, label: '跨过缺值连接', defaultValue: false },
        {
          kind: 'select',
          id: CONNECTED_SCATTER_CONTROL_IDS.lineStyle,
          label: '线型',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: '实线' },
            { value: 'dashed', label: '虚线' },
          ],
        },
        {
          kind: 'range',
          id: CONNECTED_SCATTER_CONTROL_IDS.strokeWidth,
          label: '线宽',
          defaultValue: 2,
          min: 1,
          max: 6,
          step: 0.5,
        },
      ],
    },
    {
      label: '观测点',
      controls: [
        {
          kind: 'range',
          id: CONNECTED_SCATTER_CONTROL_IDS.pointOpacity,
          label: '点不透明度',
          defaultValue: 1,
          min: 0.1,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'range',
          id: CONNECTED_SCATTER_CONTROL_IDS.pointSize,
          label: '半径',
          defaultValue: 4,
          min: 2,
          max: 10,
          step: 1,
        },
      ],
    },

    {
      label: extraText.appearance,
      controls: [
        {
          kind: 'range',
          id: CONNECTED_SCATTER_CONTROL_IDS.lineOpacity,
          visibleWhen: { controlId: CONNECTED_SCATTER_CONTROL_IDS.colorMode, oneOf: ['series', 'mark'] },
          label: extraText.lineOpacity,
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: connectedScatterBasicControls,
  canonicalValues: {
    [CONNECTED_SCATTER_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
    [CONNECTED_SCATTER_CONTROL_IDS.curve]: 'linear',
    [CONNECTED_SCATTER_CONTROL_IDS.colorMode]: 'series',
    [CONNECTED_SCATTER_CONTROL_IDS.lineOpacity]: 1,

    [CONNECTED_SCATTER_CONTROL_IDS.pointOpacity]: 1,
    [CONNECTED_SCATTER_CONTROL_IDS.connectNulls]: false,
    [CONNECTED_SCATTER_CONTROL_IDS.lineStyle]: 'solid',
    [CONNECTED_SCATTER_CONTROL_IDS.strokeWidth]: 2,
    [CONNECTED_SCATTER_CONTROL_IDS.pointSize]: 4,
  },
  relatedApis: [
    'ConnectedScatterChart.coordinate',
    'ConnectedScatterProperties.path.curve',
    'ConnectedScatterProperties.colorMode',
    'ConnectedScatterProperties.point.opacity',
    'ConnectedScatterProperties.path.connectNulls',
    'ConnectedScatterProperties.path.dashPattern',
    'ConnectedScatterProperties.path.strokeWidth',
    'ConnectedScatterProperties.point.size',
  ],
} satisfies PreviewControlContract;
