import { defineControlledPreview } from '@/modules/docs/preview';

import { renderValidationPolicyPreview } from './validation-policy-preview';
import { previewControlContract, validationPolicyControls } from './validation-policy.controls';

/** 注册回退使用的数据校验控件 */
export const previewControls = validationPolicyControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderValidationPolicyPreview(values, '校验失败'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 比较跳过、抽样与严格校验的动态试验场 */
const Preview = controlledPreview.Component;

export default Preview;
