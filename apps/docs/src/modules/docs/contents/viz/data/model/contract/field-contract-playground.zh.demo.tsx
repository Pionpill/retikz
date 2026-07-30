import { defineControlledPreview } from '@/modules/docs/preview';

import { fieldContractControls, previewControlContract } from './field-contract-playground.controls';
import { renderFieldContractPreview } from './field-contract-playground-preview';

/** 注册回退使用的字段契约控件 */
export const previewControls = fieldContractControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderFieldContractPreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 比较字段类型如何改变位置比例尺的动态试验场 */
export default controlledPreview.Component;
