import type { FC, ReactNode } from 'react';

import type { CellMarkerProps } from '../cell';
import { invalidCellAuthoring } from '../cell';

/** Map 的一条键值记录，包含一个 MapKey 和一个 MapValue */
export type MapEntryProps = { children: ReactNode };
/** Map 键单元格的文本或 drawable 输入 */
export type MapKeyProps = CellMarkerProps;
/** Map 值单元格的文本或 drawable 输入 */
export type MapValueProps = CellMarkerProps;

/** Map 的直属记录声明 */
export const MapEntry: FC<MapEntryProps> = () => invalidCellAuthoring('MapEntry must be a direct child of Map.');
/** MapEntry 的键槽位 */
export const MapKey: FC<MapKeyProps> = () => invalidCellAuthoring('MapKey must be a direct child of MapEntry.');
/** MapEntry 的值槽位 */
export const MapValue: FC<MapValueProps> = () => invalidCellAuthoring('MapValue must be a direct child of MapEntry.');
MapEntry.displayName = 'MapEntry';
MapKey.displayName = 'MapKey';
MapValue.displayName = 'MapValue';
