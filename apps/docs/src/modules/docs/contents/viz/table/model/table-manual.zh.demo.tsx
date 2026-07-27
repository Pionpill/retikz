import type { FC } from 'react';

import { ManualTable } from '@retikz/table-react';

import { manualCells } from './table-manual.zh.data';

const Demo: FC = () => (
  <ManualTable
    id="status-manual"
    rows={3}
    columns={2}
    rowKinds={['columnHeader', 'body', 'body']}
    cells={manualCells}
    layout={{
      columnSize: { kind: 'auto' },
      rowSize: { kind: 'auto' },
      columns: [{ index: 1, size: { kind: 'fixed', value: 72 } }],
      columnGap: 8,
      rowGap: 4,
      borders: { outer: { kind: 'line', stroke: 'gray' } },
    }}
    width={288}
    height={126}
    style={{ maxWidth: '100%', height: 'auto' }}
  />
);

export default Demo;
