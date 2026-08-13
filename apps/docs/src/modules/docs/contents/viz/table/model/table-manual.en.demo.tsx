import type { FC } from 'react';

import { Layout } from '@retikz/react';

import { PreviewManualTable as ManualTable } from '@/modules/docs/components/component-preview/theme';

import { manualRows } from './table-manual.en.data';

const Demo: FC = () => (
  <Layout width={288} height={158} style={{ maxWidth: '100%', height: 'auto' }}>
    <ManualTable
      id="status-manual"
      rows={manualRows}
      rowKinds={['columnHeader', 'body', 'body', 'body']}
      layout={{
        columnSize: { kind: 'auto' },
        rowSize: { kind: 'auto' },
        columns: [{ index: 1, size: { kind: 'fixed', value: 72 } }],
        columnGap: 8,
        rowGap: 4,
        borders: { outer: { kind: 'line', stroke: 'gray' } },
      }}
    />
  </Layout>
);

export default Demo;
