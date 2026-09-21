import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { arrowEndpointOverlapControlsI18n } from './arrow-endpoint-overlap.i18n';

/** 端点重叠示例使用的稳定字段 id */
export const ArrowEndpointOverlapControlId = { Shape: 'shape', Overlap: 'overlap' } as const;

/** 端点重叠示例的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = arrowEndpointOverlapControlsI18n[lang];
  const shapeOptions = [
    { label: i18n.solidTriangle, value: 'normal' },
    { label: i18n.hollowTriangle, value: 'open' },
    { label: i18n.solidStealth, value: 'stealth' },
    { label: i18n.hollowStealth, value: 'openStealth' },
    { label: i18n.solidCircle, value: 'circle' },
    { label: i18n.hollowCircle, value: 'openCircle' },
  ] as const;
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.endpointOverlap,
    sections: [
      {
        label: i18n.arrowPlacement,
        controls: [
          {
            kind: 'select',
            id: ArrowEndpointOverlapControlId.Shape,
            label: i18n.arrowShape,
            defaultValue: 'openCircle',
            options: shapeOptions,
          },
          {
            kind: 'range',
            id: ArrowEndpointOverlapControlId.Overlap,
            label: i18n.insideRatio,
            defaultValue: 0.5,
            min: 0,
            max: 1,
            step: 0.05,
          },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const arrowEndpointOverlapControls = createControls('zh');

/** 端点重叠示例的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { shape: 'openCircle', overlap: 0.5 },
    relatedApis: ['Draw.arrowDetail', 'Draw.arrowPlacement'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');
