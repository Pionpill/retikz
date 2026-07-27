import { Axis, PathMark, Plot } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinateRadarControls, previewControlContract } from './coordinate-radar.controls';
import { skills } from './coordinate-radar.data';

/** 注册回退使用的雷达图数据面板 */
export const previewControls = coordinateRadarControls;

const controlledPreview = defineControlledPreview(previewControlContract, () => (
  <Plot data={skills} width={270} height={270} coordinate="polar2D" style={{ maxWidth: '100%', height: 'auto' }}>
    <PathMark x="dim" y="value" closed />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 雷达图：维度沿角向展开，评分映射到半径 */
export default controlledPreview.Component;
