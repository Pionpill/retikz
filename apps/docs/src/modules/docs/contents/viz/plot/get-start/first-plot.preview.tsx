import { Plot, PlotAxis, PathMark } from '@retikz/plot-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { measurements } from './first-plot.data';
import { firstPlotI18n } from './first-plot.i18n';

/** 首张 Plot 的语言与绘图区宽度 */
export type FirstPlotPreviewProps = {
  /** 文档语言 */
  lang?: Lang;
  /** 绘图区宽度，窄容器中为坐标轴留出空间 */
  width?: number;
};

/** 用相同字段绑定呈现四次测量 */
export const FirstPlotPreview: FC<FirstPlotPreviewProps> = props => {
  const { lang = 'zh', width = 400 } = props;
  const i18n = firstPlotI18n[lang];

  return (
    <Plot data={measurements} width={width} height={220}>
      <PathMark x="time" y="value" order="time" />
      <PlotAxis dimension="x" title={i18n.time} />
      <PlotAxis dimension="y" title={i18n.value} />
    </Plot>
  );
};
