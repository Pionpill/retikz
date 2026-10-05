import { Layout } from '@retikz/react';
import { Chain } from '@retikz/standard-react/collection';
/** 本节交互参数 */
export type ChainPreviewValues = {
  direction: 'right' | 'down';
  align: 'start' | 'center' | 'end' | 'main';
  spacing: 'compact' | 'steps';
  justify: 'start' | 'center' | 'end';
};
/** 由公开参数绘制链 */
export const renderChainPreview = (values: ChainPreviewValues) => (
  <Layout>
    <Chain
      skeleton={{ items: ['A', { branches: [['B', 'C'], ['D']] }, 'E'] }}
      layout={{
        direction: values.direction,
        branchAlign: values.align === 'main' ? { branch: 0 } : values.align,
        spacing: values.spacing,
        justify: values.justify,
      }}
    />
  </Layout>
);
