import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { usePreviewControls } from '@/modules/docs/preview';

import { createAnimationTriggerControls } from './animation-trigger.controls';
import { AnimationTriggerPreview } from './animation-trigger.preview';

/** 触发器示例的语言参数 */
export type AnimationTriggerProps = { lang?: Lang };

export const previewControls = createAnimationTriggerControls('zh');

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

/** 从预览 controls 读取触发方式 */
const AnimationTrigger: FC<AnimationTriggerProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createAnimationTriggerControls(lang));
  return <AnimationTriggerPreview trigger={values.trigger} lang={lang} />;
};

export default AnimationTrigger;
