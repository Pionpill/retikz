import type { ReactInputEmbedContext } from '@retikz/react';
import { createInputScene } from '@retikz/react';
import type { InputCell } from '@retikz/standard-vanilla/collection';
import type { IRCell, IRArrayCell } from '@retikz/standard/collection';
import { RetikzStandardError, RetikzStandardErrorCode } from '@retikz/standard/collection';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC, ReactElement, ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';

type CellLayoutSource = IRArrayCell['layout'];

type CellWithLayout<TLayout extends CellLayoutSource> = Omit<IRCell, 'layout'> & { layout?: TLayout };

/**
 * React 数据入口的文本单元格；复杂内容使用组合组件
 * @template TLayout 单元格允许的布局覆盖类型，默认使用 IRCell 的布局字段类型
 */
export type CellProps<TLayout extends CellLayoutSource = IRCell['layout']> = Omit<
  CellWithLayout<TLayout>,
  'content'
> & {
  /** 单元格文本；复杂绘制内容通过组合 marker 的 children 提供 */
  content?: string;
};

/**
 * 组合单元格的文本与 drawable 内容互斥
 * @template TLayout 单元格允许的布局覆盖类型，默认使用 IRCell 的布局字段类型
 */
export type CellMarkerProps<TLayout extends CellLayoutSource = IRCell['layout']> = Omit<
  CellWithLayout<TLayout>,
  'content'
> &
  (
    | {
        /** 单元格文本，与绘制子内容互斥 */
        text?: string;
        children?: never;
      }
    | {
        text?: never;
        /** 恰好一个可编译的绘制子内容，与 text 互斥 */
        children: ReactNode;
      }
  );

/**
 * 收集后的内部单元格，字符串由 Vanilla 统一归一
 * @template TLayout 收集前后保持一致的单元格布局覆盖类型
 */
export type DrawableCell<TLayout extends CellLayoutSource = IRCell['layout']> = Omit<
  CellWithLayout<TLayout>,
  'content'
> & {
  /** 待收集的文本或单个绘制子内容，省略时保留空单元格 */
  content?: ReactNode;
};

/** 拒绝脱离直属容器的 marker 与非法 JSX 组合 */
export const invalidCellAuthoring = (message: string): never => {
  throw new RetikzStandardError({
    code: RetikzStandardErrorCode.AuthoringInvalid,
    message,
    details: { operation: 'collectCells' },
  });
};

/**
 * 展开数组和 Fragment，忽略 React empty node，并校验直属 marker
 * @template T marker 接受的属性类型，决定返回数组中每个属性对象的类型
 */
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

/**
 * 将组合单元格的外观及内容交给统一收集入口
 * @template TLayout 输入与输出共享的单元格布局覆盖类型
 */
export const markerCell = <TLayout extends CellLayoutSource>(
  props: CellMarkerProps<TLayout>,
): DrawableCell<TLayout> => {
  const { text, children, ...cell } = props;
  return { ...cell, content: text ?? children };
};

/**
 * 每格收集恰好一个 drawable；文本直接透传给 Vanilla
 * @template TLayout 内容转换前后保留的单元格布局覆盖类型
 */
export const createCellsInput = <TLayout extends CellLayoutSource>(
  cells: Array<DrawableCell<TLayout>>,
  context: ReactInputEmbedContext,
) => {
  const adapters: Array<AnyInputEmbedAdapter> = [];
  const inputs: Array<InputCell<CellWithLayout<TLayout>>> = cells.map((cell, index) => {
    if (cell.content === undefined) {
      const { content, ...empty } = cell;
      void content;
      return empty;
    }

    if (typeof cell.content === 'string') return { ...cell, content: cell.content };

    const collected = createInputScene(cell.content, { embedIdPrefix: `${context.id}:cell:${index}` });
    const children = collected.scene.children;
    if (children === undefined || children.length !== 1) {
      return invalidCellAuthoring('Each collection cell requires exactly one authoring child.');
    }

    adapters.push(...collected.adapters);

    return { ...cell, content: children[0] };
  });

  return { cells: inputs, adapters };
};
