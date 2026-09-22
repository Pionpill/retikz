import type { ReactInputEmbedContext } from '@retikz/react';
import { createInputScene } from '@retikz/react';
import type { InputCell } from '@retikz/standard-vanilla/container';
import type { IRCell } from '@retikz/standard/container';
import { RetikzStandardError, RetikzStandardErrorCode } from '@retikz/standard/container';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC, ReactElement, ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';

/** React 数据入口的文本单元格；复杂内容使用组合组件 */
export type CellProps = Omit<IRCell, 'content'> & { content: string };

/** 组合单元格的文本与 drawable 内容互斥 */
export type CellMarkerProps = Omit<IRCell, 'content'> &
  ({ text: string; children?: never } | { text?: never; children: ReactNode });

/** 收集后的内部单元格，字符串由 Vanilla 统一归一 */
export type DrawableCell = Omit<IRCell, 'content'> & { content: ReactNode };

/** 拒绝脱离直属容器的 marker 与非法 JSX 组合 */
export const invalidCellAuthoring = (message: string): never => {
  throw new RetikzStandardError({
    code: RetikzStandardErrorCode.AuthoringInvalid,
    message,
    details: { operation: 'collectCells' },
  });
};

/** 展开数组和 Fragment，忽略 React empty node，并校验直属 marker */
export const collectCellMarkers = <T extends object>(children: ReactNode, marker: FC<T>, label: string): Array<T> => {
  const result: Array<T> = [];
  Children.forEach(children, child => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
      result.push(...collectCellMarkers(child.props.children, marker, label));
    } else if (isValidElement(child) && child.type === marker) {
      result.push((child as ReactElement<T>).props);
    } else {
      invalidCellAuthoring(`${label} accepts only its direct marker children.`);
    }
  });
  return result;
};

/** 将组合单元格的外观及内容交给统一收集入口 */
export const markerCell = (props: CellMarkerProps): DrawableCell => {
  const { text, children, ...cell } = props;
  return { ...cell, content: text ?? children };
};

/** 每格收集恰好一个 drawable；文本直接透传给 Vanilla */
export const createCellsInput = (cells: Array<DrawableCell>, context: ReactInputEmbedContext) => {
  const adapters: Array<AnyInputEmbedAdapter> = [];
  const inputs: Array<InputCell> = cells.map((cell, index) => {
    if (typeof cell.content === 'string') return { ...cell, content: cell.content };
    const collected = createInputScene(cell.content, { embedIdPrefix: `${context.id}:cell:${index}` });
    const children = collected.scene.children;
    if (children === undefined || children.length !== 1) {
      return invalidCellAuthoring('Each List / Map cell requires exactly one authoring child.');
    }
    adapters.push(...collected.adapters);
    return { ...cell, content: children[0] };
  });
  return { cells: inputs, adapters };
};
