import { defineControlledPreview } from '@/modules/docs/preview';

import { extensionStatisticsControls, previewControlContract } from './extension-statistics.controls';
import { renderExtensionStatisticsPreview } from './extension-statistics-preview';

/** 注册回退使用的统计扩展输入控件 */
export const previewControls = extensionStatisticsControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderExtensionStatisticsPreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 并列展示 reducer 与 selector 扩展职责的示例 */
export default controlledPreview.Component;
