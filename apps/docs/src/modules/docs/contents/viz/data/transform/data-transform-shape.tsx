import type { ExternalRow } from '@retikz/data';
import { Entity, Relation } from '@retikz/graph-react';
import { Layout, Scope } from '@retikz/react';
import type { IRTableCellPayload } from '@retikz/table';
import type { DetailTableProps } from '@retikz/table-react';
import { DetailColumn } from '@retikz/table-react';
import type { FC } from 'react';

import { PreviewDetailTable, PreviewGraph } from '@/modules/docs/components/component-preview/theme';
import {
  LogicFigureEntityKind,
  logicFigureEntityDefinitions,
  logicFigureRelationKinds,
} from '@/modules/docs/components/logic-figure';

const COLUMN_WIDTH = 64;

const ROW_HEIGHT = 26;

const TABLE_LAYOUT = {
  columnSize: { kind: 'fixed', value: COLUMN_WIDTH },
  rowSize: { kind: 'fixed', value: ROW_HEIGHT },
  headerRowSize: { kind: 'fixed', value: ROW_HEIGHT },
} satisfies NonNullable<DetailTableProps['layout']>;

/** 表头只声明字段文字，外观由 Table theme 解析 */
const headerCell = (text: string): IRTableCellPayload => ({ kind: 'value', value: text });

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
    <Layout theme={{ style: 'docs.logic' }}>
      <PreviewGraph entityKinds={logicFigureEntityDefinitions} relationKinds={logicFigureRelationKinds}>
        <Scope id="source" position={[-282, -65]}>
          <PreviewDetailTable id="source-table" dataRef="source-rows" data={sourceRows} layout={TABLE_LAYOUT}>
            <DetailColumn id="region" field="region" header={headerCell('region')} />
            <DetailColumn id="product" field="product" header={headerCell('product')} />
            <DetailColumn id="revenue" field="revenue" header={headerCell('revenue')} />
          </PreviewDetailTable>
        </Scope>
        <Entity id="source-caption" role="participant" kind={LogicFigureEntityKind.Caption} position={[-186, 82]}>
          {sourceTitle}
        </Entity>

        <Entity
          id="operation"
          role="activity"
          kind={LogicFigureEntityKind.Operation}
          position={[0, 0]}
          layout={{ minimumSize: { width: 108, height: 52 }, align: 'middle', lineHeight: 17 }}
        >
          summarize
        </Entity>
        <Entity id="operation-description" role="participant" kind={LogicFigureEntityKind.Caption} position={[0, 42]}>
          groupBy: region
        </Entity>

        <Scope id="result" position={[90, -39]}>
          <PreviewDetailTable id="result-table" dataRef="result-rows" data={resultRows} layout={TABLE_LAYOUT}>
            <DetailColumn id="region" field="region" header={headerCell('region')} />
            <DetailColumn id="total" field="total" header={headerCell('total')} />
            <DetailColumn id="orders" field="orders" header={headerCell('orders')} />
          </PreviewDetailTable>
        </Scope>
        <Entity id="result-caption" role="participant" kind={LogicFigureEntityKind.Caption} position={[186, 56]}>
          {resultTitle}
        </Entity>

        <Relation role="flow" kind="docs.logic.dataFlow" source="source" target="operation" />
        <Relation role="flow" kind="docs.logic.dataFlow" source="operation" target="result" />
      </PreviewGraph>
    </Layout>
  );
};
