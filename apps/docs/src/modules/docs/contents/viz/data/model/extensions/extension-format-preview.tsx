import type { IRDataModel } from '@retikz/data';

import { defineFieldFormat } from '@retikz/data';
import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { wanRows } from './extension-format.data';

/** 把带“万”后缀的字符串解析为规范化数值 */
const wan = defineFieldFormat({
  name: 'wan',
  impliedType: 'continuous',
  parse: raw => {
    if (typeof raw === 'number') return raw;
    if (typeof raw !== 'string') return undefined;
    const trimmed = raw.trim();
    const numeric = trimmed.endsWith('万') ? Number(trimmed.slice(0, -1)) * 10000 : Number(trimmed);
    return Number.isFinite(numeric) ? numeric : undefined;
  },
});

const model: IRDataModel = [
  { name: 'month', type: 'temporal' },
  { name: 'revenue', format: 'wan' },
];

/** 渲染自定义具名格式的完整注入闭环 */
export const renderExtensionFormatPreview = () => (
  <Plot
    data={wanRows}
    model={model}
    width={410}
    height={250}
    formatDefinitions={[wan]}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PathMark x="month" y="revenue" order="month" />
    <PointMark x="month" y="revenue" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);
