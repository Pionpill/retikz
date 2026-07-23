import type { ReactNode } from 'react';

import { Children, Fragment, isValidElement } from 'react';

/** Table marker children 的有效节点访问回调 */
export type TableChildVisitor = (child: ReactNode) => void;

/** 按 JSX 声明顺序递归访问 Table marker children */
export const visitTableChildren = (children: ReactNode, visit: TableChildVisitor): void => {
  Children.forEach(children, child => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (isValidElement(child) && child.type === Fragment) {
      visitTableChildren(child.props.children, visit);
      return;
    }
    visit(child);
  });
};
