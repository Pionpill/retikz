import { BuiltinRegressionMethod } from '@retikz/data';

import type { Lang } from '@/i18n';

import { regressionControlContractOf } from './regression-contract';

/** 按文档语言装配polynomial的固定方法控件 */
export const createPreviewControlContract = (lang: Lang = 'zh') =>
  regressionControlContractOf(BuiltinRegressionMethod.Polynomial, lang);
/** 注册回退的中文基线 */
export const previewControlContract = createPreviewControlContract();
