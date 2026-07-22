import type { FC } from 'react';

import { ManualTable } from '@retikz/table-react';

import { manualCells } from './table-manual.en.data';

const Demo: FC = () => (
  <ManualTable
    id="status-manual"
    rows={3}
    columns={2}
    rowKinds={['columnHeader', 'body', 'body']}
    cells={manualCells}
    layout={{ columnWidth: 120, rowHeight: 34, headerHeight: 38, columnGap: 8, rowGap: 4 }}
    width={288}
    height={126}
    style={{ maxWidth: '100%', height: 'auto' }}
  />
);

export default Demo;
