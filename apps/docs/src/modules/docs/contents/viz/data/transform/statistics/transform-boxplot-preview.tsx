import type { IRDataSelectTransform, IRDataSummarizeTransform } from '@retikz/data';

import { Axis, IntervalMark, Plot, PointMark, ReferenceMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { boxplotSamples } from './transform-boxplot.data';

type TransformBoxplotValues = {
  lowerP: number;
  upperP: number;
  factor: number;
};

/** 按受控分位概率与须线倍数构造箱体统计 operation */
export const boxSummaryOperationOf = (values: TransformBoxplotValues): IRDataSummarizeTransform => ({
  kind: 'summarize',
  groupBy: ['group', 'boxX', 'boxX0', 'boxX1'],
  metrics: [
    {
      kind: 'quantile-band',
      field: 'value',
      lowerP: values.lowerP,
      upperP: values.upperP,
      outputs: {
        lower: 'boxLow',
        upper: 'boxHigh',
        points: [{ p: 0.5, as: 'median' }],
        whiskerMin: 'whiskerMin',
        whiskerMax: 'whiskerMax',
      },
      whisker: { kind: 'spread', factor: values.factor },
    },
  ],
});

/** 按同一分位区间构造异常点 selector operation */
export const boxOutlierOperationOf = (values: TransformBoxplotValues): IRDataSelectTransform => ({
  kind: 'select',
  groupBy: ['group'],
  selector: {
    kind: 'outside-quantile-band',
    field: 'value',
    lowerP: values.lowerP,
    upperP: values.upperP,
    boundary: { kind: 'spread', factor: values.factor },
  },
});

/** 渲染共用同一分位区间与须线倍数的箱线图 */
export const renderTransformBoxplotPreview = (values: TransformBoxplotValues) => {
  const boxSummary = boxSummaryOperationOf(values);
  const outsideBoxRows = boxOutlierOperationOf(values);

  return (
    <Layout
      width={440}
      height={280}
      viewBox={{ x: 0, y: 0, width: 440, height: 280 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Plot data={boxplotSamples} width={440} height={260} x={0} y={10}>
        <Axis dimension="x" />
        <Axis dimension="y" grid />
        <IntervalMark
          bounds={{
            x: { kind: 'extent', from: 'boxX0', to: 'boxX1' },
            y: { kind: 'extent', from: 'boxLow', to: 'boxHigh' },
          }}
          fill="#93c5fd"
          fillOpacity={0.32}
          stroke="#2563eb"
          strokeWidth={1.4}
          transform={[boxSummary]}
          x="boxX"
          y="boxHigh"
        />
        <ReferenceMark
          color="#1d4ed8"
          extentField="boxX0"
          extentToField="boxX1"
          strokeWidth={2}
          transform={[boxSummary]}
          y="median"
        />
        <ReferenceMark
          color="#475569"
          extentField="whiskerMin"
          extentToField="whiskerMax"
          strokeWidth={1.2}
          transform={[boxSummary]}
          x="boxX"
        />
        <PointMark fill="#0f172a" opacity={0.82} size={18} transform={[outsideBoxRows]} x="boxX" y="value" />
      </Plot>
    </Layout>
  );
};
