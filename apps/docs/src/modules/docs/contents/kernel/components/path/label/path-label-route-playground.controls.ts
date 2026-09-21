import type { Lang } from '@/i18n';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { pathLabelRoutePlaygroundControlsI18n } from './path-label-route-playground.i18n';

/** Path 标签路线 playground 使用的稳定字段 id */
export const PathLabelRoutePlaygroundControlId = {
  Route: 'route',
  Side: 'side',
  Position: 'position',
} as const;

/** Path 标签路线与位置的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = pathLabelRoutePlaygroundControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.pathLabel,
    sections: [
      {
        label: i18n.connectionRoute,
        controls: [
          {
            kind: 'select',
            id: PathLabelRoutePlaygroundControlId.Route,
            label: i18n.route,
            defaultValue: 'line',
            options: [
              { value: 'line', label: i18n.line },
              { value: 'fold', label: i18n.rightAngleFold },
              { value: 'curve', label: i18n.quadraticBezier },
              { value: 'cubic', label: i18n.cubicBezier },
              { value: 'bend', label: i18n.bendShorthand },
              { value: 'smooth', label: i18n.smoothThroughPoints },
            ],
          },
        ],
      },
      {
        label: i18n.label,
        controls: [
          {
            kind: 'select',
            id: PathLabelRoutePlaygroundControlId.Side,
            label: i18n.side,
            defaultValue: 'center',
            options: [
              { value: 'center', label: i18n.automaticCenterSloped },
              { value: 'top', label: i18n.top },
              { value: 'bottom', label: i18n.bottom },
              { value: 'left', label: i18n.left },
              { value: 'right', label: i18n.right },
            ],
          },
          {
            kind: 'range',
            id: PathLabelRoutePlaygroundControlId.Position,
            label: i18n.position,
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
export const pathLabelRoutePlaygroundControls = createControls('zh');

/** Path 标签路线 playground 的 controls 值 */
export type PathLabelRoutePlaygroundValues = PreviewControlValuesFor<typeof pathLabelRoutePlaygroundControls>;

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { route: 'line', side: 'center', position: 0.5 },
    relatedApis: ['Path.label', 'Step.kind', 'IRGeometryLabel.side', 'IRGeometryLabel.position'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');
