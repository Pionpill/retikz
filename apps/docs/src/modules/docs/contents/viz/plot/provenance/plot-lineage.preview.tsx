import type { PlotLineageRun } from '@retikz/plot';
import { IntervalMark, Plot, PlotAxis, BuiltinPlotScale } from '@retikz/plot-react';
import type { FC } from 'react';
import { useCallback, useState } from 'react';

import {
  buildPlotLineageOptions,
  buildPlotLineageTransforms,
  summarizePlotLineageTransformSteps,
} from './plot-lineage-options';
import { sales } from './plot-lineage.data';

/** Plot 溯源预览需要的图形与记录选项 */
export type PlotLineagePreviewProps = {
  values: Parameters<typeof buildPlotLineageOptions>[0] & Parameters<typeof buildPlotLineageTransforms>[0];
};

/** 提取适合并排检查的 Plot 链路摘要 */
const summarizePlotLineage = (lineage: PlotLineageRun): Record<string, unknown> => ({
  ...(lineage.plotId === undefined ? {} : { plotId: lineage.plotId }),
  dataReference: lineage.dataReference,
  transformSteps: summarizePlotLineageTransformSteps(lineage),
  marks: lineage.marks,
  ...(lineage.scales === undefined ? {} : { scales: lineage.scales }),
  ...(lineage.layout === undefined ? {} : { layout: lineage.layout }),
});

/** 绘制销售额并展示真实 onLineage 回调的结果 */
export const PlotLineagePreview: FC<PlotLineagePreviewProps> = props => {
  const { values } = props;
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
          dataTransforms={transforms.root.map(operation => ({ operation }))}
          width={300}
          height={220}
          lineage={lineageOptions}
          onLineage={handleLineage}
        >
          <IntervalMark
            id="revenueBars"
            x="region"
            y="revenue"
            color="month"
            transform={transforms.mark.map(operation => ({ operation }))}
          />
          <BuiltinPlotScale dimension="y" type="linear" domainPadding={0} />
          <PlotAxis dimension="x" />
          <PlotAxis dimension="y" grid />
        </Plot>
      </div>
      <pre className="m-0 h-full min-h-0 min-w-0 overflow-auto rounded-md border bg-muted/40 p-2 text-left text-[10px] leading-[1.4]">
        <code>{JSON.stringify(summary, null, 2)}</code>
      </pre>
    </div>
  );
};
