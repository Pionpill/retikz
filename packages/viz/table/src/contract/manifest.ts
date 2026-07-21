import type { BoundsRect } from '@retikz/math';

import type { TableCellLocationValue, TableCellRoleValue } from '../schemas';
import type { TableCellSource } from './structure';

/** Table row 或 column 的固定轨道 manifest 条目 */
export type TableTrackManifestEntry = Readonly<{
  /** semantic track id */
  id: string;
  /** canonical 声明顺序 */
  index: number;
  /** Table 局部轴向偏移 */
  offset: number;
  /** 轨道尺寸 */
  size: number;
}>;

/** Table lowering 的最小语义几何 manifest */
export type TableLayoutManifest = Readonly<{
  /** 可选 Table 外部身份 */
  tableId?: string;
  /** Table 左上角 bounds 的 detached 副本 */
  bounds: Readonly<BoundsRect>;
  /** 与 semantic rows 同序的轨道 */
  rows: ReadonlyArray<TableTrackManifestEntry>;
  /** 与 semantic columns 同序的轨道 */
  columns: ReadonlyArray<TableTrackManifestEntry>;
  /** 与 semantic Cells 同序的几何与来源 */
  cells: ReadonlyArray<
    Readonly<{
      /** semantic Cell id */
      cellId: string;
      /** Cell 左上角 bounds 的 detached 副本 */
      box: Readonly<BoundsRect>;
      /** Cell 语义位置 */
      location: TableCellLocationValue;
      /** Cell 语义角色的 detached 副本 */
      roles: ReadonlyArray<TableCellRoleValue>;
      /** 可选 Cell 来源的 detached 副本 */
      source?: TableCellSource;
    }>
  >;
}>;
