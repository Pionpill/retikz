import { Layout } from '@retikz/react';
import { Chain } from '@retikz/standard-react/collection';

/** 本节交互参数 */
export type ChainPreviewValues = {
  route: 'auto' | 'straight' | '|-' | '-|' | '-|-' | '|-|';
  fraction: number;
  arrow: 'none' | '->' | '<->';
  label: string;
};

/** 由公开参数绘制链 */
export const renderChainPreview = (values: ChainPreviewValues) => (
  <Layout>
    <Chain
      id="chain"
      skeleton={{ items: ['A', { branches: [['B', 'C'], ['D']] }, 'E'] }}
      label={{ text: values.label, position: 'top' }}
      connection={{
        ...(values.route === '-|-' || values.route === '|-|'
          ? { route: values.route, fraction: values.fraction }
          : { route: values.route }),
        path: { arrow: values.arrow, style: { stroke: 'dodgerblue' } },
      }}
    />
  </Layout>
);
