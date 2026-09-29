import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleOrdinalControls } from './scale-ordinal.controls';
import { ScaleOrdinalPreview } from './scale-ordinal.preview';

/** 注册回退使用的 ordinal 颜色比例尺 controls */
export const previewControls = scaleOrdinalControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ScaleOrdinalPreview({
    palette: values.palette,
    showLegend: values.showLegend,
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在类别 domain 不变时切换 ordinal range 与图例 */
const Preview = controlledPreview.Component;

export default Preview;
