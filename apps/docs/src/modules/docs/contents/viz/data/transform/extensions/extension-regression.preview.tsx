import { BuiltinPlotScale, PathMark, Plot, PlotAxis, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import type { ExtensionRegressionValues } from './extension-regression.data';
import { originOperation, originSamplesOf } from './extension-regression.data';
import { throughOrigin, throughOriginImplementation } from './extension-regression.definition';
import { extensionRegressionI18n } from './extension-regression.i18n';

/** 控件与语言输入 */
export type ExtensionRegressionPreviewProps = ExtensionRegressionValues & { lang?: Lang };
/** 注册自定义模型，smooth 负责采样，PathMark 连接预测行 */
export const ExtensionRegressionPreview: FC<ExtensionRegressionPreviewProps> = props => {
  const { lang = 'zh', offset } = props;
  const i18n = extensionRegressionI18n[lang];
  return (
    <Plot
      data={originSamplesOf(offset)}
      width={420}
      height={260}
      regressionDefinitions={[throughOrigin]}
      regressionImplementations={[throughOriginImplementation]}
    >
      <BuiltinPlotScale dimension="x" type="linear" domain={[-0.5, 6.5]} />
      <BuiltinPlotScale dimension="y" type="linear" domain={[-3, 19]} />
      <PointMark x="x" y="y" fill="#94a3b8" size={5} />
      <PathMark
        transform={[{ operation: originOperation }]}
        x="trendX"
        y="trendY"
        order="trendX"
        stroke="#2563eb"
        strokeWidth={2}
      />
      <PlotAxis dimension="x" title={i18n.x} />
      <PlotAxis dimension="y" title={i18n.y} grid />
    </Plot>
  );
};
