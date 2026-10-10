import { BuiltinRegressionMethod } from '@retikz/data';

import type { Lang } from '@/i18n';

import { regressionControlContractOf } from './regression-demo.controls';

/** 按文档语言装配exponential的固定方法控件 */
export const createPreviewControlContract = (lang: Lang = 'zh') =>
  regressionControlContractOf(BuiltinRegressionMethod.Exponential, lang);
/** 注册回退的中文基线 */
export const previewControlContract = createPreviewControlContract();
