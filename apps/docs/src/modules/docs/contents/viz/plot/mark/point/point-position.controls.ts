import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { points } from './point-api.data';
import { pointPositionI18n } from './point-position.i18n';

/** 点定位 playground 的稳定控件 id */
export const POINT_POSITION_CONTROL_IDS = {
  coordinate: 'point-position-coordinate',
  xField: 'point-position-x-field',
  yField: 'point-position-y-field',
} as const;

/** 点定位 playground 的中文属性面板 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = pointPositionI18n[lang];
  const pointPositionControls = definePreviewControls({
    presentation: 'panel',
    title: i18n.scatterEncodings,
    sections: [
      {
        label: i18n.data,
        defaultCollapsed: true,
        controls: [{ kind: 'table', id: 'points', label: i18n.pointRows, rows: points }],
      },
      {
        label: i18n.coordinate,
        controls: [
          {
            kind: 'select',
            id: POINT_POSITION_CONTROL_IDS.coordinate,
            label: i18n.projection,
            defaultValue: 'cartesian2D',
            options: [
              { value: 'cartesian2D', label: i18n.cartesian },
              { value: 'polar2D', label: i18n.polar },
            ],
          },
        ],
      },
      {
        label: i18n.positionChannels,
        controls: [
          {
            kind: 'select',
            id: POINT_POSITION_CONTROL_IDS.xField,
            label: i18n.xField,
            defaultValue: 'x',
            options: [
              { value: 'x', label: i18n.x },
              { value: 'y', label: i18n.y },
              { value: 'pop', label: i18n.pop },
            ],
          },
          {
            kind: 'select',
            id: POINT_POSITION_CONTROL_IDS.yField,
            label: i18n.yField,
            defaultValue: 'y',
            options: [
              { value: 'y', label: i18n.y },
              { value: 'x', label: i18n.x },
              { value: 'pop', label: i18n.pop },
            ],
          },
        ],
      },
    ],
  });

  /** 点定位 playground 的稳定文档契约 */
  return {
    controls: pointPositionControls,
    canonicalValues: {
      [POINT_POSITION_CONTROL_IDS.coordinate]: 'cartesian2D',

      [POINT_POSITION_CONTROL_IDS.xField]: 'x',
      [POINT_POSITION_CONTROL_IDS.yField]: 'y',
    },
    relatedApis: ['Plot.coordinate', 'PointMark.x', 'PointMark.y'],
  } satisfies PreviewControlContract;
};

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract();
