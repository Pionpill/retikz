import type { IRDataModel } from '@retikz/data';
import type { FC } from 'react';

import { defineFieldFormat } from '@retikz/data';
import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { wanRows } from './extension-format.data';

/**
 * 自定义具名格式：把 '1.2万' 解析成 12000。
 * @description name 即写进 data.model 的格式名；impliedType 让省略 type 的字段当 continuous；
 *   parse 把原始值转成 canonical 数值，经 <Plot formatDefinitions> 注入。
 */
const wan = defineFieldFormat({
  name: 'wan',
  impliedType: 'continuous',
  parse: raw => {
    if (typeof raw === 'number') return raw;
    if (typeof raw !== 'string') return NaN;
    const trimmed = raw.trim();
    const numeric = trimmed.endsWith('万') ? Number(trimmed.slice(0, -1)) * 10000 : Number(trimmed);
    return Number.isFinite(numeric) ? numeric : NaN;
  },
});

// revenue 省略 type：format 'wan' 的 impliedType 让它当 continuous；'1.2万' 经 parse 规范化成 12000
const model: IRDataModel = [
  { name: 'month', type: 'temporal' },
  { name: 'revenue', format: 'wan' },
];

const Demo: FC = () => (
  <Plot
    data={wanRows}
    model={model}
    width={460}
    height={280}
    formatDefinitions={[wan]}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PathMark x="month" y="revenue" order="month" />
    <PointMark x="month" y="revenue" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
