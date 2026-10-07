import type { Lang } from '@/i18n';

import { createPreviewControlContract as createVersionOrderContract } from './version-order.controls';

/** 自定义排序示例默认启用标签长度比较器 */
export const createPreviewControlContract = (lang: Lang = 'zh') => createVersionOrderContract(lang, 'labelLength');
/** 默认语言的控件契约 */
export const previewControlContract = createPreviewControlContract();
