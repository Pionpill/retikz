import { createManualTableSpec } from '@retikz/table';

import { Cell, DetailTable, ManualTable, Table } from '../../src';

const spec = createManualTableSpec({ rows: [[1]], style: 'neutral' });

const acceptedAuthoring = (
  <>
    <Table spec={spec} containerStyle={{ color: 'rebeccapurple' }} />
    <DetailTable
      dataRef="people"
      data={[{ score: 98 }]}
      columns={[{ id: 'score', field: 'score' }]}
      style="neutral"
      themeMode="dark"
      styleTokens={{ 'cell.content.color': '#fafafa' }}
      encodings={[
        {
          id: 'score-color',
          selector: { fields: ['score'] },
          channel: 'backgroundFill',
          scale: { name: 'ordinal-color' },
          legend: false,
        },
      ]}
      containerStyle={{ color: 'rebeccapurple' }}
    />
    <ManualTable rows={[[1]]} style="neutral" containerStyle={{ color: 'rebeccapurple' }} />
    <Cell value={1} formatter={{ name: 'number' }} />
    <Cell formatter={{ name: 'number' }}>{1}</Cell>
  </>
);

const rejectedAuthoring = (
  <>
    {/* @ts-expect-error 通用 Table 的 preset 必须写入 spec.style */}
    <Table spec={spec} style={{ color: 'rebeccapurple' }} />
    {/* @ts-expect-error DetailTable 的 style 只接受 Table preset */}
    <DetailTable dataRef="people" data={[]} columns={[{ id: 'score', field: 'score' }]} style={{ color: 'red' }} />
    {/* @ts-expect-error ManualTable 的 style 只接受 Table preset */}
    <ManualTable rows={[[1]]} style={{ color: 'rebeccapurple' }} />
    {/* @ts-expect-error 不提供旧 tableStyle alias */}
    <ManualTable rows={[[1]]} tableStyle={{ color: 'rebeccapurple' }} />
    {/* @ts-expect-error content Cell 绕过 formatter */}
    <Cell content={{ type: 'node', position: [0, 0] }} formatter={{ name: 'number' }} />
    {/* @ts-expect-error content Cell 绕过 presentation */}
    <Cell content={{ type: 'node', position: [0, 0] }} presentation={{ name: 'text' }} />
  </>
);

void acceptedAuthoring;
void rejectedAuthoring;
