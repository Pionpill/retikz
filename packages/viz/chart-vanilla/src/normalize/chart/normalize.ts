import { createChart } from '@retikz/chart';
import { normalizePlot } from '@retikz/plot-vanilla';

import type { InputChart, NormalizedChart } from './types';

/** 将无框架 Chart authoring 输入归一化为 Chart 与 Plot Source IR */
export const normalizeChart = (input: InputChart): NormalizedChart => {
  const {
    plot,
    datasets: _datasets,
    lowerOptions: _lowerOptions,
    chartThemeStyles: _chartThemeStyles,
    panel: _panel,
    ...chart
  } = input;
  void _datasets;
  void _lowerOptions;
  void _chartThemeStyles;
  void _panel;
  const spec = normalizePlot(plot);
  return {
    chart: createChart({
      ...chart,
      plot: spec,
    }),
    spec,
    input,
  };
};
