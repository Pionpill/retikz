import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { quarterlyRows } from './extension-resolver.data';

const parseQuarter = (raw: unknown): number | undefined => {
  const match = /^(\d{4})Q([1-4])$/.exec(String(raw));
  if (!match) return undefined;
  return Date.UTC(Number(match[1]), (Number(match[2]) - 1) * 3, 1);
};

/** 渲染运行时字段 resolver 的完整逃生舱示例 */
export const renderExtensionResolverPreview = () => (
  <Plot
    data={quarterlyRows}
    model={[
      { name: 'quarter', type: 'temporal' },
      { name: 'revenue', type: 'continuous' },
    ]}
    resolveField={field => (field === 'quarter' ? { parse: parseQuarter } : undefined)}
    width={410}
    height={250}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PathMark x="quarter" y="revenue" order="quarter" />
    <PointMark x="quarter" y="revenue" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);
