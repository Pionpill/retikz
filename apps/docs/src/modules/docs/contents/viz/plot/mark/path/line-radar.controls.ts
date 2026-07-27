import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { team } from './line-radar.data';

/** 雷达路径闭合 playground 的稳定控件 id */
export const LINE_RADAR_CLOSED_ID = 'line-radar-closed';

/** 雷达路径闭合的中文属性面板 */
export const lineRadarControls = definePreviewControls({
  presentation: 'panel',
  title: '雷达闭合',
  sections: [
    {
      label: '数据',
      controls: [{ kind: 'table', id: 'team', label: '团队指标', rows: team }],
    },
    {
      label: '路径',
      controls: [{ kind: 'switch', id: LINE_RADAR_CLOSED_ID, label: '闭合右侧路径', defaultValue: false }],
    },
  ],
});

/** 雷达路径闭合 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: lineRadarControls,
  canonicalValues: { [LINE_RADAR_CLOSED_ID]: false },
  relatedApis: ['PathMark.closed', 'PathMark.order'],
} satisfies PreviewControlContract;
