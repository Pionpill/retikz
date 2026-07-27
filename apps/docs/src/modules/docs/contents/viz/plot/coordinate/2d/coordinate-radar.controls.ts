import { createCoordinateDataControls } from '../coordinate-data-controls';
import { skills } from './coordinate-radar.data';

const dataControls = createCoordinateDataControls({
  copy: { title: '雷达图', sectionLabel: '数据', tableLabel: '技能评分' },
  rows: skills,
  columns: [
    { key: 'dim', label: '维度' },
    { key: 'value', label: '评分' },
  ],
  defaultCollapsed: true,
  relatedApis: ['Plot.coordinate', 'PathMark'],
});

/** 雷达图示例的中文数据面板 */
export const coordinateRadarControls = dataControls.controls;

/** 雷达图示例的稳定文档契约 */
export const previewControlContract = dataControls.contract;
