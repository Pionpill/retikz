import type { Lang } from '@/i18n';

import { renderPathLabelRoutePlayground } from './path-label-route-playground';
import { pathLabelRoutePlaygroundI18n } from './path-label-route-playground.i18n';

/** 图形参数 */
export type PathLabelRoutePlaygroundPreviewValues = {
  route: 'line' | 'fold' | 'curve' | 'cubic' | 'bend' | 'smooth';
  side: 'center' | 'top' | 'bottom' | 'left' | 'right';
  position: number;
};

/** 绘制示例图形 */
export const PathLabelRoutePlaygroundPreview = (values: PathLabelRoutePlaygroundPreviewValues, lang: Lang) => {
  const i18n = pathLabelRoutePlaygroundI18n[lang];
  return renderPathLabelRoutePlayground(values, { source: i18n.source, target: i18n.target, label: i18n.label });
};
