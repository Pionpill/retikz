import type { FC } from 'react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { usePreviewControls } from '@/modules/docs/preview';

import { plotLineageControls } from './plot-lineage.controls';
import { PlotLineagePreview } from './plot-lineage.preview';

/** 注册回退使用的 Plot 溯源控件 */
export const previewControls = plotLineageControls;

/** hook 与回调示例只展示 React 源码 */
export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** 切换记录范围并观察真实 onLineage 产物的动态示例 */
const Demo: FC = () => {
  const values = usePreviewControls(plotLineageControls);
  return <PlotLineagePreview values={values} />;
};

export default Demo;
