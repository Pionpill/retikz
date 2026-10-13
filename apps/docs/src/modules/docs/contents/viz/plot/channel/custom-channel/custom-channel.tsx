import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { CUSTOM_CHANNEL_CONTROL_IDS, createPreviewControlContract } from './custom-channel.controls';
import { CustomChannelPreview } from './custom-channel.preview';

/** controls registry 缺失时使用的显式回退 */
export const previewControls = createPreviewControlContract('zh').controls;
export { createPreviewControlContract } from './custom-channel.controls';

/** 按语言复用渲染实现与稳定源码，窄屏仅收窄绘图区 */
const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), (values, dimensions) =>
    CustomChannelPreview({
      width: Math.min(440, (dimensions?.width ?? 488) - 48),
      bindingMode: values[CUSTOM_CHANNEL_CONTROL_IDS.bindingMode],
      constantIntensity: values[CUSTOM_CHANNEL_CONTROL_IDS.constantIntensity],
    }),
  );
const previews = { zh: createPreview('zh'), en: createPreview('en') };

/** canonical 状态派生的稳定源码配置 */
export const previewSource = previews.zh.source;

/** 示例展示语言 */
export type CustomChannelProps = { lang?: Lang };
/** 通过实时绑定观察同一个自定义通道 */
const CustomChannel: FC<CustomChannelProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};

export default CustomChannel;
