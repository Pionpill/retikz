import type { IRDataModel } from '@retikz/data';
import { defineFieldFormat } from '@retikz/data';
import { PathMark, Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { thousandsRows } from './extension-format.data';

/** 把带“K”后缀的字符串解析为规范化数值 */
export const thousands = defineFieldFormat({
  name: 'thousands',
  impliedType: 'continuous',
  parse: raw => {
    if (typeof raw === 'number') return raw;
    if (typeof raw !== 'string') return undefined;

    const trimmed = raw.trim();
    const numeric = trimmed.endsWith('K') ? Number(trimmed.slice(0, -1)) * 1000 : Number(trimmed);

    return Number.isFinite(numeric) ? numeric : undefined;
  },
});

/** 自定义格式示例的共享字段模型 */
export const model: IRDataModel = [
  { name: 'month', type: 'temporal' },
  { name: 'revenue', format: 'thousands' },
];

/** 渲染自定义具名格式的完整注入闭环 */
export const renderExtensionFormatPreview = () => (
  <Plot
    data={thousandsRows}
    model={model}
    width={410}
    height={250}
    formatDefinitions={[thousands]}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PathMark x="month" y="revenue" order="month" />
    <PointMark x="month" y="revenue" />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
