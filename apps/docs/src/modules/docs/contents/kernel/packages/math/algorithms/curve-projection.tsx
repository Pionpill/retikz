import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './curve-projection.controls';
import { renderCurveProjection } from './curve-projection.preview';

export { previewControls } from './curve-projection.controls';
const controlledPreview = defineControlledPreview(previewControlContract, values => renderCurveProjection(values));

const englishPreview = defineControlledPreview(previewControlContract, values => renderCurveProjection(values, 'en'));

export const previewSource = controlledPreview.source;

/** 曲线投影示例的文档语言 */
export type CurveProjectionDemoProps = { lang?: Lang };

/** 用相同图形和控件契约展示双语投影示例 */
const Demo: FC<CurveProjectionDemoProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = lang === 'en' ? englishPreview.Component : controlledPreview.Component;
  return <Preview />;
};
export default Demo;
