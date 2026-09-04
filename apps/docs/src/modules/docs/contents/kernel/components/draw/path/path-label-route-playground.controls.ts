import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Path 标签路线 playground 使用的稳定字段 id */
export const PathLabelRoutePlaygroundControlId = {
  Route: 'route',
  Side: 'side',
  Position: 'position',
} as const;

/** Path 标签路线与位置的中文属性面板 */
export const pathLabelRoutePlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '路径标签',
  sections: [
    {
      label: '连接路线',
      controls: [
        {
          kind: 'select',
          id: PathLabelRoutePlaygroundControlId.Route,
          label: '路线',
          defaultValue: 'line',
          options: [
            { value: 'line', label: '直线' },
            { value: 'fold', label: '直角折线' },
            { value: 'curve', label: '二次贝塞尔' },
            { value: 'cubic', label: '三次贝塞尔' },
            { value: 'bend', label: '弯曲简写' },
            { value: 'smooth', label: '过点平滑曲线' },
          ],
        },
      ],
    },
    {
      label: '标签',
      controls: [
        {
          kind: 'select',
          id: PathLabelRoutePlaygroundControlId.Side,
          label: '方位（side）',
          defaultValue: 'center',
          options: [
            { value: 'center', label: '自动居中（sloped）' },
            { value: 'top', label: '上方' },
            { value: 'bottom', label: '下方' },
            { value: 'left', label: '左侧' },
            { value: 'right', label: '右侧' },
          ],
        },
        {
          kind: 'range',
          id: PathLabelRoutePlaygroundControlId.Position,
          label: '位置',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** Path 标签路线 playground 的 controls 值 */
export type PathLabelRoutePlaygroundValues = PreviewControlValuesFor<typeof pathLabelRoutePlaygroundControls>;

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: pathLabelRoutePlaygroundControls,
  canonicalValues: { route: 'line', side: 'center', position: 0.5 },
  relatedApis: ['Path.label', 'Step.kind', 'IRGeometryLabel.side', 'IRGeometryLabel.position'],
} satisfies PreviewControlContract;
