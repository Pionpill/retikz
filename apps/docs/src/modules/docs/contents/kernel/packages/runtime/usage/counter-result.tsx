import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './counter-result.controls';
import { CounterResultPreview } from './counter-result.preview';

/** 默认控件注册 */
export const previewControls = previewControlContract.controls;

const localizedPreviews = {
  zh: defineControlledPreview(createPreviewControlContract('zh'), values =>
    CounterResultPreview({ ...values, lang: 'zh' }),
  ),
  en: defineControlledPreview(createPreviewControlContract('en'), values =>
    CounterResultPreview({ ...values, lang: 'en' }),
  ),
};

/** 源码视图使用相同执行路径的稳定基线 */
export const previewSource = localizedPreviews.zh.source;

/** 计数器结果示意的语言配置 */
export type CounterResultProps = { lang?: Lang };

/** 用控件运行一次完整 Runtime 更新并对照真实结果 */
const CounterResult: FC<CounterResultProps> = props => {
  const { lang } = props;
  const Preview = localizedPreviews[lang ?? 'zh'].Component;
  return <Preview />;
};

export default CounterResult;
