import { BuiltinPlotScale, PathMark, Plot, PlotAxis, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { regressionDemoI18n } from './regression-demo.i18n';
import type { RegressionValues } from './regression-samples.data';
import { regressionOperationOf, regressionSamplesOf } from './regression-samples.data';

/** 拟合试验的控件与语言输入 */
export type RegressionPreviewProps = RegressionValues & { lang?: Lang };

/** 灰点保留观测；蓝线和空心点来自 mark 局部执行的 smooth */
export const RegressionPreview: FC<RegressionPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  const i18n = regressionDemoI18n[lang];
  const transform = [{ operation: regressionOperationOf(values) }];
  return (
    <Plot data={regressionSamplesOf(values.tail)} width={420} height={260}>
      <BuiltinPlotScale dimension="x" type="linear" domain={[0, 10]} />
      <BuiltinPlotScale dimension="y" type="linear" domain={[-8, 45]} />
      <PointMark x="x" y="y" fill="#94a3b8" size={5} />
      <PathMark transform={transform} x="trendX" y="trendY" order="trendX" stroke="#2563eb" strokeWidth={2} />
      <PointMark transform={transform} x="trendX" y="trendY" fill="white" stroke="#2563eb" size={2.5} />
      <PlotAxis dimension="x" title={i18n.x} />
      <PlotAxis dimension="y" title={i18n.y} grid />
    </Plot>
  );
};
