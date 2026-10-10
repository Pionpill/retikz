import { BuiltinPlotScale, PathMark, Plot, PlotAxis, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';

import { regressionDemoI18n } from './regression-demo.i18n';
import type { RegressionValues } from './regression-samples.data';
import { regressionDataOf } from './regression-samples.data';

/** 拟合 demo 的固定方法、控件与语言输入 */
export type RegressionPreviewProps = Omit<RegressionValues, 'display'> & {
  /** 当前小节固定的拟合方式 */
  method: string;
  /** 展示视图，默认 graph */
  display?: string;
  /** 文档语言，默认 zh */
  lang?: Lang;
};

/** 灰点与蓝线展示模型；表格在原始 x 上比较观测与预测 */
export const RegressionPreview: FC<RegressionPreviewProps> = props => {
  const { lang = 'zh', method, display = 'graph', ...values } = props;
  const i18n = regressionDemoI18n[lang];
  const { rows, fittedRows, curveRows } = regressionDataOf(method, { ...values, display });
  if (display === 'table') {
    return (
      <DataTransformComparison
        operation={method}
        host="regression"
        context={i18n.originalX}
        source={{
          dataRef: 'observations',
          rows,
          columns: ['x', 'y'].map(field => ({ id: field, field, header: field })),
          caption: i18n.source,
          highlight: { columnIds: ['x', 'y'], rowIndices: rows.map((_, index) => index + 1) },
        }}
        result={{
          dataRef: 'fitted',
          rows: fittedRows,
          columns: ['x', 'y', 'fittedY'].map(field => ({
            id: field,
            field,
            header: field,
            formatter: { name: 'number', options: { specifier: '.3~f' } },
          })),
          columnWidth: 76,
          caption: i18n.result,
          highlight: { columnIds: ['fittedY'] },
        }}
      />
    );
  }
  // 两组行共用坐标系，各图层只消费自身的坐标字段
  const plotRows = [
    ...rows.map(row => ({ ...row, trendX: null, trendY: null })),
    ...curveRows.map(row => ({ ...row, x: null, y: null })),
  ];
  return (
    <Plot data={plotRows} width={420} height={260}>
      <BuiltinPlotScale dimension="x" type="linear" domain={[0, 10]} />
      <BuiltinPlotScale dimension="y" type="linear" domain={[-8, 45]} />
      <PointMark x="x" y="y" fill="gray" size={5} />
      <PathMark x="trendX" y="trendY" order="trendX" connectNulls stroke="dodgerblue" strokeWidth={2} />
      <PointMark x="trendX" y="trendY" fill="white" stroke="dodgerblue" size={2.5} />
      <PlotAxis dimension="x" title={i18n.x} />
      <PlotAxis dimension="y" title={i18n.y} grid />
    </Plot>
  );
};
