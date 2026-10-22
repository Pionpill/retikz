import { PlotScale, PathMark, Plot, PlotAxis, PointMark } from '@retikz/plot-react';
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
      definitions={{ regressions: [throughOrigin] }}
      implementations={{ regressions: [throughOriginImplementation] }}
    >
      <PlotScale dimension="x" type="linear" domain={[-0.5, 6.5]} />
      <PlotScale dimension="y" type="linear" domain={[-3, 19]} />
      <PointMark
        encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }}
        properties={{ fill: '#94a3b8', size: 5 }}
      />
      <PathMark
        transforms={[{ operation: originOperation }]}
        encodings={{ order: 'trendX', position: { x: { field: 'trendX' }, y: { field: 'trendY' } } }}
        properties={{ stroke: '#2563eb', strokeWidth: 2 }}
      />
      <PlotAxis dimension="x" title={i18n.x} />
      <PlotAxis dimension="y" title={i18n.y} grid />
    </Plot>
  );
};
