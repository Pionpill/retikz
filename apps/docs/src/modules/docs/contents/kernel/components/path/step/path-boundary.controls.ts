import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { pathBoundaryControlsI18n } from './path-boundary.i18n';

/** Path 端点连接面 playground 使用的稳定字段 id */
export const PathBoundaryControlId = {
  Boundary: 'boundary',
  Fit: 'fit',
  Gap: 'gap',
} as const;

/** 当前 playground 仅在圆形连接面下展示 fit / gap 参数 */
export const PathBoundaryVisibleWhen = {
  RegularBoundary: { controlId: PathBoundaryControlId.Boundary, oneOf: ['circle'] },
} as const;

/** Path 端点连接面的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = pathBoundaryControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.endpointSurface,
    sections: [
      {
        label: i18n.endpoint,
        controls: [
          {
            kind: 'select',
            id: PathBoundaryControlId.Boundary,
            label: i18n.surface,
            defaultValue: 'circle',
            options: [
              { value: 'shape', label: i18n.starOutline },
              { value: 'circle', label: i18n.circleBoundary },
            ],
          },
          {
            kind: 'select',
            id: PathBoundaryControlId.Fit,
            label: i18n.fit,
            defaultValue: 'tight',
            options: [
              { value: 'tight', label: i18n.fitShape },
              { value: 'bounds', label: i18n.encloseBounds },
            ],
            visibleWhen: PathBoundaryVisibleWhen.RegularBoundary,
          },
          {
            kind: 'range',
            id: PathBoundaryControlId.Gap,
            label: i18n.gap,
            defaultValue: 0,
            min: -12,
            max: 28,
            step: 2,
            visibleWhen: PathBoundaryVisibleWhen.RegularBoundary,
          },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const pathBoundaryControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { boundary: 'circle', fit: 'tight', gap: 0 },
    relatedApis: ['Draw.way', 'IRNodeTarget.boundary', 'IRBoundary.params.fit', 'IRBoundary.params.gap'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');
