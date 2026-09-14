import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { coordinateSpacesI18n } from './coordinate-spaces.i18n';

/** 坐标空间 playground 的稳定字段 id */
export const CoordinateSpacesControlId = {
  CenterX: 'centerX',
  CenterY: 'centerY',
  Rotation: 'rotation',
  LocalX: 'localX',
  LocalY: 'localY',
} as const;

/** 坐标空间 playground 的中文属性面板 */
export const createCoordinateSpacesControls = (i18n: typeof coordinateSpacesI18n.zh) =>
  definePreviewControls({
    presentation: 'panel',
    title: i18n.label1,
    sections: [
      {
        label: i18n.label2,
        controls: [
          {
            kind: 'range',
            id: CoordinateSpacesControlId.CenterX,
            label: i18n.label3,
            defaultValue: 50,
            min: -50,
            max: 50,
            step: 5,
          },
          {
            kind: 'range',
            id: CoordinateSpacesControlId.CenterY,
            label: i18n.label4,
            defaultValue: 35,
            min: -20,
            max: 50,
            step: 5,
          },
          {
            kind: 'range',
            id: CoordinateSpacesControlId.Rotation,
            label: i18n.label5,
            defaultValue: 30,
            min: -180,
            max: 180,
            step: 5,
          },
        ],
      },
      {
        label: i18n.label6,
        controls: [
          {
            kind: 'range',
            id: CoordinateSpacesControlId.LocalX,
            label: i18n.label7,
            defaultValue: 40,
            min: -50,
            max: 50,
            step: 5,
          },
          {
            kind: 'range',
            id: CoordinateSpacesControlId.LocalY,
            label: i18n.label8,
            defaultValue: 0,
            min: -30,
            max: 30,
            step: 5,
          },
        ],
      },
    ],
  });

export const coordinateSpacesControls = createCoordinateSpacesControls(coordinateSpacesI18n.zh);

/** 坐标空间 playground 的稳定状态与 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = coordinateSpacesI18n[lang];

  return {
    controls: createCoordinateSpacesControls(i18n),
    canonicalValues: { centerX: 50, centerY: 35, rotation: 30, localX: 40, localY: 0 },
    presets: [
      {
        id: 'axis-aligned',
        label: i18n.label9,
        values: { centerX: 50, centerY: 35, rotation: 0, localX: 40, localY: 0 },
      },
      {
        id: 'rotated',
        label: i18n.label10,
        values: { centerX: 50, centerY: 35, rotation: 30, localX: 40, localY: 0 },
      },
      {
        id: 'offset-point',
        label: i18n.label11,
        values: { centerX: 50, centerY: 35, rotation: 30, localX: 25, localY: -25 },
      },
    ],
    relatedApis: ['CenteredShape', 'localToWorld'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
