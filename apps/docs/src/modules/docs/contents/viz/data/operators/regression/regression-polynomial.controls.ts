import type { Lang } from '@/i18n';

import { regressionControlContractOf } from './regression-demo.controls';

/** 按文档语言装配本组拟合控件 */
export const createPreviewControlContract = (lang: Lang = 'zh') => regressionControlContractOf('polynomial', lang);
/** 注册回退的中文基线 */
export const previewControlContract = createPreviewControlContract();
