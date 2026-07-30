import type { ExternalRow } from '@retikz/data';
import type { IRTableCellPayload } from '@retikz/table';
import type { DetailTableProps } from '@retikz/table-react';
import type { FC } from 'react';

import { Draw, Layout, Node, Scope, Text } from '@retikz/react';
import { DetailColumn, DetailTable } from '@retikz/table-react';

const COLUMN_WIDTH = 64;
const ROW_HEIGHT = 26;

const TABLE_LAYOUT = {
  columnSize: { kind: 'fixed', value: COLUMN_WIDTH },
  rowSize: { kind: 'fixed', value: ROW_HEIGHT },
  headerRowSize: { kind: 'fixed', value: ROW_HEIGHT },
  borders: {
    outer: { kind: 'line', stroke: 'gray' },
    horizontal: { kind: 'line', stroke: 'lightgray' },
    vertical: { kind: 'line', stroke: 'lightgray' },
  },
} satisfies NonNullable<DetailTableProps['layout']>;

const CELL_LAYOUT = { padding: 4 } satisfies NonNullable<
  NonNullable<DetailTableProps['columns']>[number]['bodyLayout']
>;

/** 创建由 Table header Cell 承载的加粗浅灰表头 */
const headerCell = (text: string): IRTableCellPayload => ({
  kind: 'content',
  content: {
    type: 'node',
    position: [0, 0],
    text,
    minimumSize: { width: COLUMN_WIDTH, height: ROW_HEIGHT },
    padding: 0,
    stroke: 'none',
    fill: 'lightgray',
    fillOpacity: 0.3,
    font: { size: 12, weight: 'bold' },
  },
});

export type DataTransformShapeFigureProps = {
  /** 输入明细表的本地化标题 */
  sourceTitle: string;
  /** 输出汇总表的本地化标题 */
  resultTitle: string;
  /** 东部地区的本地化值 */
  east: string;
  /** 西部地区的本地化值 */
  west: string;
};

/** 展示 summarize 如何同时改变数据行粒度与字段集合 */
export const DataTransformShapeFigure: FC<DataTransformShapeFigureProps> = props => {
  const { sourceTitle, resultTitle, east, west } = props;
  const sourceRows: Array<ExternalRow> = [
    { region: east, product: 'A', revenue: 40 },
    { region: east, product: 'B', revenue: 60 },
    { region: west, product: 'A', revenue: 30 },
    { region: west, product: 'B', revenue: 70 },
  ];
  const resultRows: Array<ExternalRow> = [
    { region: east, total: 100, orders: 2 },
    { region: west, total: 100, orders: 2 },
  ];

  return (
    <Layout width={590} height={190} style={{ maxWidth: '100%', height: 'auto' }}>
      <Scope id="source" transforms={[{ kind: 'translate', x: -282, y: -65 }]}>
        <DetailTable id="source-table" dataRef="source-rows" data={sourceRows} layout={TABLE_LAYOUT}>
          <DetailColumn
            id="region"
            field="region"
            header={headerCell('region')}
            headerLayout={CELL_LAYOUT}
            bodyLayout={CELL_LAYOUT}
          />
          <DetailColumn
            id="product"
            field="product"
            header={headerCell('product')}
            headerLayout={CELL_LAYOUT}
            bodyLayout={CELL_LAYOUT}
          />
          <DetailColumn
            id="revenue"
            field="revenue"
            header={headerCell('revenue')}
            headerLayout={CELL_LAYOUT}
            bodyLayout={CELL_LAYOUT}
          />
        </DetailTable>
      </Scope>
      <Node
        id="source-caption"
        position={[-186, 82]}
        stroke="none"
        fill="none"
        padding={0}
        textColor="gray"
        font={{ size: 12 }}
      >
        {sourceTitle}
      </Node>

      <Node
        id="operation"
        position={[0, 0]}
        minimumSize={{ width: 108, height: 52 }}
        stroke="gray"
        fill="lightgray"
        fillOpacity={0.16}
        cornerRadius={4}
        align="middle"
        lineHeight={17}
      >
        <Text font={{ size: 14, weight: 'bold' }}>summarize</Text>
        <Text fill="gray" font={{ size: 12 }}>
          groupBy: region
        </Text>
      </Node>

      <Scope id="result" transforms={[{ kind: 'translate', x: 90, y: -39 }]}>
        <DetailTable id="result-table" dataRef="result-rows" data={resultRows} layout={TABLE_LAYOUT}>
          <DetailColumn
            id="region"
            field="region"
            header={headerCell('region')}
            headerLayout={CELL_LAYOUT}
            bodyLayout={CELL_LAYOUT}
          />
          <DetailColumn
            id="total"
            field="total"
            header={headerCell('total')}
            headerLayout={CELL_LAYOUT}
            bodyLayout={CELL_LAYOUT}
          />
          <DetailColumn
            id="orders"
            field="orders"
            header={headerCell('orders')}
            headerLayout={CELL_LAYOUT}
            bodyLayout={CELL_LAYOUT}
          />
        </DetailTable>
      </Scope>
      <Node
        id="result-caption"
        position={[186, 56]}
        stroke="none"
        fill="none"
        padding={0}
        textColor="gray"
        font={{ size: 12 }}
      >
        {resultTitle}
      </Node>

      <Draw way={['source', 'operation']} arrow="->" stroke="gray" />
      <Draw way={['operation', 'result']} arrow="->" stroke="gray" />
    </Layout>
  );
};
