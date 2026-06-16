import type { FC } from 'react';
import { Axis, LineMark, Plot, PointMark } from '@retikz/plot-react';

import { quarterlyRows } from './processing-resolve.data';

const parseQuarter = (raw: unknown): number | undefined => {
  const match = /^(\d{4})Q([1-4])$/.exec(String(raw));
  if (!match) return undefined;
  const year = Number(match[1]);
  const quarter = Number(match[2]);
  return Date.UTC(year, (quarter - 1) * 3, 1);
};

/** resolveField handles custom quarter strings that are outside the declarative format table. */
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
    <LineMark x="quarter" y="revenue" order="quarter" />
    <PointMark x="quarter" y="revenue" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
