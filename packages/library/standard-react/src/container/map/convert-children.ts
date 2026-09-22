import type { ReactElement, ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';

import type { CellMarkerProps, DrawableCell } from '../cell';
import { collectCellMarkers, invalidCellAuthoring, markerCell } from '../cell';
import { MapEntry, MapKey, MapValue } from './MapMarkers';

/** 验证每条记录恰好拥有一个键和一个值，槽位按角色归一 */
export const collectMapEntries = (children: ReactNode): Array<{ key: DrawableCell; value: DrawableCell }> =>
  collectCellMarkers(children, MapEntry, 'Map').map(entry => {
    let key: DrawableCell | undefined;
    let value: DrawableCell | undefined;
    const visit = (nodes: ReactNode): void =>
      Children.forEach(nodes, child => {
        if (child === null || child === undefined || typeof child === 'boolean') return;
        if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
          visit(child.props.children);
          return;
        }
        if (!isValidElement(child) || (child.type !== MapKey && child.type !== MapValue)) {
          return invalidCellAuthoring('MapEntry accepts only MapKey and MapValue.');
        }
        const cell = markerCell((child as ReactElement<CellMarkerProps>).props);
        if (child.type === MapKey) {
          if (key !== undefined) return invalidCellAuthoring('MapEntry requires exactly one MapKey.');
          key = cell;
        } else {
          if (value !== undefined) return invalidCellAuthoring('MapEntry requires exactly one MapValue.');
          value = cell;
        }
      });
    visit(entry.children);
    if (key === undefined || value === undefined)
      return invalidCellAuthoring('MapEntry requires one MapKey and one MapValue.');
    return { key, value };
  });
