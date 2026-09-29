import { defineControlledPreview } from '@/modules/docs/preview';

import { legendColorFormsControls, previewControlContract } from './legend-color-forms.en.controls';
import { LegendColorFormsPreview } from './legend-color-forms.preview';

/** 注册回退使用的颜色图例形态控件 */
export const previewControls = legendColorFormsControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  LegendColorFormsPreview(values, 'en'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在固定散点图中比较分类、连续与分箱颜色图例 */
const Preview = controlledPreview.Component;

export default Preview;
