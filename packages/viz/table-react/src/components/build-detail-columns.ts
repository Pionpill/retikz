import type { TableDetailColumnInput } from '@retikz/table';
import type { ReactElement, ReactNode } from 'react';

import { isValidElement } from 'react';

import type { DetailColumnProps } from './detail-column';

import { RetikzTableReactError } from '../error';
import { visitTableChildren } from './child-traversal';
import { DetailColumn } from './detail-column';

/** 判断节点是否为 DetailColumn marker */
const isDetailColumnElement = (child: ReactNode): child is ReactElement<DetailColumnProps, typeof DetailColumn> =>
  isValidElement(child) && child.type === DetailColumn;

/** 从 DetailColumn marker children 构造有序 plain columns */
export const buildDetailColumns = (children: ReactNode): Array<TableDetailColumnInput> => {
  const columns: Array<TableDetailColumnInput> = [];
  visitTableChildren(children, child => {
    if (!isDetailColumnElement(child) || Object.hasOwn(child.props, 'children')) {
      throw new RetikzTableReactError('table react: DetailTable children only accept DetailColumn');
    }
    columns.push({ ...child.props });
  });
  if (columns.length === 0) {
    throw new RetikzTableReactError('table react: DetailTable children require at least one DetailColumn');
  }
  return columns;
};
