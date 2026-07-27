import { createCoordinateDataControls } from '../coordinate-data-controls';
import { wind } from './coordinate-polar-line.data';

const dataControls = createCoordinateDataControls({
  copy: { title: '极坐标折线', sectionLabel: '数据', tableLabel: '风向与风速' },
  rows: wind,
  columns: [
    { key: 'angle', label: '角度' },
    { key: 'speed', label: '风速' },
  ],
  defaultCollapsed: true,
  relatedApis: ['Plot.coordinate', 'PathMark'],
});

/** 极坐标折线示例的中文数据面板 */
export const coordinatePolarLineControls = dataControls.controls;

/** 极坐标折线示例的稳定文档契约 */
export const previewControlContract = dataControls.contract;
