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
      scales={{ roles: { y: 'independent' } }}
      layout={{ panelGap: 22 }}
    />
    <Axis facetId="accounts" dimension="x" title="month" />
    <Axis facetId="accounts" dimension="y" grid title="accounts" />
    <PathMark facetId="accounts" x="month" y="accounts" order="month" stroke="steelblue" strokeWidth={2} />
    <PointMark facetId="accounts" x="month" y="accounts" fill="lightblue" stroke="steelblue" strokeWidth={1} />
  </Plot>
);

export default Demo;
