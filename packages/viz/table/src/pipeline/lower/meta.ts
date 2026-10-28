import type { TableBorderPathMeta } from '../../contract';
import type { TableBorderEdge } from '../layout';

/** 构造 Border Path 的稳定 JSON provenance */
export const tableBorderPathMetaOf = (edge: TableBorderEdge, tableId?: string): TableBorderPathMeta => ({
  kind: 'tableBorder',
  ...(tableId === undefined ? {} : { tableId }),
  edgeKey: edge.key,
  atomicKeys: edge.atoms.map(atom => atom.key),
});
