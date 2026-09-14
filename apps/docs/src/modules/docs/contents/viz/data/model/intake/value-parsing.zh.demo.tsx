import { defineControlledPreview } from '@/modules/docs/preview';

import { renderValueParsingPreview } from './value-parsing-preview';
import { previewControlContract, valueParsingControls } from './value-parsing.controls';

/** 注册回退使用的值解析控件 */
export const previewControls = valueParsingControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderValueParsingPreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 比较内置转换与声明式格式的动态试验场 */
const Preview = controlledPreview.Component;

export default Preview;
