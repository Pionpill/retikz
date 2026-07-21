import type { FC } from 'react';

import { DetailTable } from '@retikz/table-react';

import { scoreRows } from './table-detail.data';

const Demo: FC = () => (
  <DetailTable
    id="score-detail"
    dataRef="scores"
    data={scoreRows}
    columns={[
      { id: 'name', field: 'name', header: '姓名' },
      { id: 'group', field: 'group', header: '分组' },
      { id: 'score', field: 'score', header: '分数' },
    ]}
    layout={{ columnWidth: 104, rowHeight: 32, headerHeight: 36, columnGap: 4, rowGap: 4 }}
    width={360}
    height={168}
    style={{ maxWidth: '100%', height: 'auto' }}
  />
);

export default Demo;
