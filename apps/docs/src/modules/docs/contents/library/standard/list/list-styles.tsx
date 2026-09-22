import { Draw, Layout } from '@retikz/react';
import { List } from '@retikz/standard-react/container';
import type { FC } from 'react';

const ListStyles: FC = () => (
  <Layout>
    <List
      showIndex
      layout={{ gap: 6, width: 64, height: 40, padding: 4 }}
      style={{ fill: 'gray', font: { size: 14 } }}
      items={['A', 'B', 'C'].map(text => ({
        ...(text === 'B'
          ? { id: 'selected', style: { fill: 'dodgerblue', fillOpacity: 0.3 }, layout: { width: 96, height: 52 } }
          : {}),
        content: text === 'C' ? 'Clipped long text' : text,
      }))}
    />
    <Draw way={['selected.bottom', [100, 95]]} arrow="->" />
  </Layout>
);
export default ListStyles;
