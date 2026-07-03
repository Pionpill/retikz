import type { FC } from 'react';

import { Axis, Facet, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { accountRows } from './coordinate-composition-facet-independent.data';

const Demo: FC = () => (
  <Plot data={accountRows} width={660} height={330}>
    <Facet
      id="accounts"
      row={{ field: 'tier', order: ['free', 'pro'] }}
      column={{ field: 'product', order: ['core', 'growth', 'platform'] }}
      empty="show"
      resolve={{ scale: { y: 'independent' } }}
      spacing={{ panelGap: 22 }}
    >
      <Axis dimension="x" title="month" />
      <Axis dimension="y" grid title="accounts" />
      <PathMark x="month" y="accounts" order="month" stroke="steelblue" strokeWidth={2} />
      <PointMark x="month" y="accounts" fill="lightblue" stroke="steelblue" strokeWidth={1} />
    </Facet>
  </Plot>
);

export default Demo;
