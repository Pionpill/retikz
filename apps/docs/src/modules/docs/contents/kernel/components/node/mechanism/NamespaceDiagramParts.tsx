import { Node, Scope } from '@retikz/react';
import { Map } from '@retikz/standard-react';
import type { FC } from 'react';

/** 数据结构图的短标签 */
export type NamespaceCaptionProps = {
  position: [number, number];
  text: string;
  secondary?: boolean;
};

/** 不增加伪流程边框的结构说明 */
export const NamespaceCaption: FC<NamespaceCaptionProps> = props => {
  const { position, text, secondary = false } = props;
  return (
    <Node
      position={position}
      text={text}
      style={{
        fill: 'none',
        stroke: 'none',
        textColor: secondary ? 'gray' : 'currentColor',
        font: { size: secondary ? 12 : 14 },
      }}
    />
  );
};

/** Map 或记录的一行；id 同时作为数据操作箭头的锚点 */
export type NamespaceTableRow = {
  id: string;
  key: string;
  value: string;
  active?: boolean;
};

/** 图中表格结构的几何和数据 */
export type NamespaceTableProps = {
  position: [number, number];
  title: string;
  rows: ReadonlyArray<NamespaceTableRow>;
  keyWidth?: number;
  valueWidth?: number;
};

/** 把键值对画为对齐的行；行序仅服务阅读，不表示 Map 排序 */
export const NamespaceTable: FC<NamespaceTableProps> = props => {
  const { position, title, rows, keyWidth = 62, valueWidth = 154 } = props;
  return (
    <Scope transforms={[{ kind: 'translate', x: position[0], y: position[1] }]}>
      <NamespaceCaption position={[(keyWidth + valueWidth) / 2, -30]} text={title} />
      <Map
        transforms={[{ kind: 'translate', x: 0, y: -16 }]}
        layout={{ columnWidths: { key: keyWidth - 2, value: valueWidth - 2 }, rowHeight: 32, gap: 2, padding: 0 }}
        style={{ font: { size: 13 }, textColor: 'currentColor' }}
        entries={rows.map(row => ({
          key: { id: `${row.id}-key`, style: { fill: row.active ? 'dodgerblue' : 'gray' }, content: <Node position={[0, 0]} text={row.key} style={{ fill: 'none', stroke: 'none' }} layout={{ padding: 0, margin: 0 }} /> },
          value: { id: row.id, style: { fill: row.active ? 'dodgerblue' : 'gray' }, content: <Node position={[0, 0]} text={row.value} style={{ fill: 'none', stroke: 'none' }} layout={{ padding: 0, margin: 0 }} /> },
        }))}
      />
    </Scope>
  );
};
