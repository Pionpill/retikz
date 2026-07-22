import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { quarterlyRows } from './extension-resolver.data';

const parseQuarter = (raw: unknown): number | undefined => {
  const match = /^(\d{4})Q([1-4])$/.exec(String(raw));
  if (!match) return undefined;
  const year = Number(match[1]);
  const quarter = Number(match[2]);
  return Date.UTC(year, (quarter - 1) * 3, 1);
};

/** 用 resolveField 解析声明式格式表之外的季度字符串 */
const Demo: FC = () => (
  <Plot
    data={quarterlyRows}
    model={[
      { name: 'quarter', type: 'temporal' },
      { name: 'revenue', type: 'continuous' },
    ]}
    resolveField={field => (field === 'quarter' ? { parse: parseQuarter } : undefined)}
    width={620}
    height={260}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PathMark x="quarter" y="revenue" order="quarter" />
    <PointMark x="quarter" y="revenue" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
