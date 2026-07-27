import { Axis, PathMark, Plot, Scale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinatePolarLineControls, previewControlContract } from './coordinate-polar-line.controls';
import { wind } from './coordinate-polar-line.data';

/** 注册回退使用的极坐标折线数据面板 */
export const previewControls = coordinatePolarLineControls;

const controlledPreview = defineControlledPreview(previewControlContract, () => (
  <Plot data={wind} width={270} height={270} coordinate="polar2D" style={{ maxWidth: '100%', height: 'auto' }}>
    <Scale dimension="x" type="linear" domain={[0, 360]} />
    <PathMark x="angle" y="speed" order="angle" closed={false} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 风向映射到角度、风速映射到半径的极坐标折线 */
export default controlledPreview.Component;
