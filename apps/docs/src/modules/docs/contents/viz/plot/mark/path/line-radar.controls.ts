import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { team } from './line-radar.data';

/** 雷达路径闭合 playground 的稳定控件 id */
export const LINE_RADAR_CLOSED_ID = 'line-radar-closed';
/** 雷达路径的坐标插值控件 id */
export const LINE_RADAR_COORDINATE_INTERPOLATION_ID = 'line-radar-coordinate-interpolation';
/** 右侧雷达路径的局部插值控件 id */
export const LINE_RADAR_MARK_INTERPOLATION_ID = 'line-radar-mark-interpolation';

/** 雷达路径闭合的中文属性面板 */
export const lineRadarControls = definePreviewControls({
  presentation: 'panel',
  title: '雷达闭合',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'team', label: '团队指标', rows: team }],
    },
    {
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: LINE_RADAR_COORDINATE_INTERPOLATION_ID,
          label: '坐标插值',
          defaultValue: 'chord',
          options: [
            { value: 'polar', label: '极坐标曲线' },
            { value: 'chord', label: '直线弦' },
          ],
        },
      ],
    },
    {
      label: '右侧路径',
      controls: [
        {
          kind: 'select',
          id: LINE_RADAR_MARK_INTERPOLATION_ID,
          label: '局部插值',
          defaultValue: 'polar',
          options: [
            { value: 'inherit', label: '继承坐标系' },
            { value: 'polar', label: '极坐标曲线' },
            { value: 'chord', label: '直线弦' },
          ],
        },
        { kind: 'switch', id: LINE_RADAR_CLOSED_ID, label: '闭合路径', defaultValue: true },
      ],
    },
  ],
});

/** 雷达路径闭合 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: lineRadarControls,
  canonicalValues: {
    [LINE_RADAR_CLOSED_ID]: true,
    [LINE_RADAR_COORDINATE_INTERPOLATION_ID]: 'chord',
    [LINE_RADAR_MARK_INTERPOLATION_ID]: 'polar',
  },
  relatedApis: ['Plot.coordinate.interpolation', 'PathMark.interpolation', 'PathMark.closed'],
} satisfies PreviewControlContract;
