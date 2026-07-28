import type { PlotLineageRun } from '@retikz/plot';
import type { FC } from 'react';

import { Axis, IntervalMark, Plot, Scale } from '@retikz/plot-react';
import { useCallback, useState } from 'react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { usePreviewControls } from '@/modules/docs/preview';

import { plotLineageControls } from './plot-lineage.controls';
import { sales } from './plot-lineage.data';
import {
  buildPlotLineageOptions,
  buildPlotLineageTransforms,
  summarizePlotLineageTransformSteps,
} from './plot-lineage-options';

/** 注册回退使用的 Plot 溯源控件 */
export const previewControls = plotLineageControls;

/** hook 与回调示例只展示 React 源码 */
export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** 提取适合并排检查的 Plot 链路摘要 */
const summarizePlotLineage = (lineage: PlotLineageRun): Record<string, unknown> => ({
  ...(lineage.plotId === undefined ? {} : { plotId: lineage.plotId }),
  dataReference: lineage.dataReference,
  transformSteps: summarizePlotLineageTransformSteps(lineage),
  marks: lineage.marks,
  ...(lineage.scales === undefined ? {} : { scales: lineage.scales }),
  ...(lineage.layout === undefined ? {} : { layout: lineage.layout }),
});

/** 切换记录范围并观察真实 onLineage 产物的动态示例 */
const Demo: FC = () => {
  const values = usePreviewControls(plotLineageControls);
  const [lineage, setLineage] = useState<PlotLineageRun | null>(null);
  const handleLineage = useCallback((nextLineage: PlotLineageRun) => setLineage(nextLineage), []);
  const lineageOptions = buildPlotLineageOptions(values);
  const transforms = buildPlotLineageTransforms(values);
  const summary = lineage === null ? {} : summarizePlotLineage(lineage);

  return (
    <div className="grid h-[232px] w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:h-[304px] sm:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex min-h-0 min-w-0 items-center justify-center">
        <Plot
          id="salesPlot"
          dataRef="sales"
          data={sales}
          dataTransforms={transforms.root}
          width={300}
          height={220}
          lineage={lineageOptions}
          onLineage={handleLineage}
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          <IntervalMark id="revenueBars" x="region" y="revenue" color="month" transform={transforms.mark} />
          <Scale dimension="y" type="linear" domainPadding={0} />
          <Axis dimension="x" />
          <Axis dimension="y" grid />
        </Plot>
      </div>
      <pre className="m-0 h-full min-h-0 min-w-0 overflow-auto rounded-md border bg-muted/40 p-2 text-left text-[10px] leading-[1.4]">
        <code>{JSON.stringify(summary, null, 2)}</code>
      </pre>
    </div>
  );
};

export default Demo;
