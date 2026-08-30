import type {
  BlockHeaderInputEmbedProps,
  BlockInputEmbedProps,
  BlockRowInputEmbedProps,
  BlockSectionInputEmbedProps,
  InputBlockCell,
} from '@retikz/graph-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC, ReactElement, ReactNode } from 'react';

import {
  BlockHeaderInputEmbedAdapter,
  BlockInputEmbedAdapter,
  BlockRowInputEmbedAdapter,
  BlockSectionInputEmbedAdapter,
} from '@retikz/graph-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';
import { Children, Fragment, isValidElement } from 'react';

import type { GraphEmbeddableComponent } from '../shared';

import { RetikzGraphReactError, RetikzGraphReactErrorCode } from '../errors';
import { collectGraphChildren } from './authoring';

/** Block Source 的 React 编写参数 */
export type BlockProps = Omit<BlockInputEmbedProps, 'type' | 'children'> &
  Readonly<{
    /** 按声明顺序进入 Block 纵向布局的任意 children */
    children?: ReactNode;
  }>;

/** Block Header 的 React 编写参数 */
export type BlockHeaderProps = Omit<BlockHeaderInputEmbedProps, 'type' | 'icon' | 'trailing'> &
  Readonly<{
    /** Header 左侧至多一个任意 child */
    icon?: ReactNode;
    /** Header 右侧至多一个任意 child */
    trailing?: ReactNode;
  }>;

/** Block Section 的 React 编写参数 */
export type BlockSectionProps = Omit<BlockSectionInputEmbedProps, 'type' | 'children'> &
  Readonly<{
    /** 按声明顺序进入 Section 纵向布局的任意 children */
    children?: ReactNode;
  }>;

/** Block Row 的 React 编写参数 */
export type BlockRowProps = Omit<BlockRowInputEmbedProps, 'type' | 'children'> &
  Readonly<{
    /** 由 BlockCell 声明的有序 Flex items */
    children?: ReactNode;
  }>;

/** Block Cell 的 React 编写参数 */
export type BlockCellProps = Omit<InputBlockCell, 'key' | 'child'> &
  Readonly<{
    /** 可选映射到 Source Cell.key，避免与 React key 冲突 */
    itemKey?: string;
    /** Cell 中恰好一个任意 child */
    children?: ReactNode;
  }>;

const structureError = (label: string, message: string, details: Record<string, string | number>) =>
  new RetikzGraphReactError({
    code: RetikzGraphReactErrorCode.BlockStructureInvalid,
    message,
    details: { label, ...details },
  });

type CollectedSlot = Readonly<{
  child: NonNullable<InputBlockCell['child']>;
  adapters: ReadonlyArray<AnyInputEmbedAdapter>;
}>;

const collectRequiredSlot = (children: ReactNode, embedIdPrefix: string, label: string): CollectedSlot => {
  const collected = collectGraphChildren(children, embedIdPrefix);
  if (collected.children.length !== 1) {
    throw structureError(label, `${label} requires exactly one child.`, {
      expectedCount: 1,
      receivedCount: collected.children.length,
    });
  }
  return { child: collected.children[0], adapters: collected.adapters };
};

const collectOptionalSlot = (
  children: ReactNode | undefined,
  embedIdPrefix: string,
  label: string,
): CollectedSlot | undefined => {
  const collected = collectGraphChildren(children, embedIdPrefix);
  if (collected.children.length === 0) return undefined;
  if (collected.children.length !== 1) {
    throw structureError(label, `${label} requires at most one child.`, {
      expectedCount: 1,
      receivedCount: collected.children.length,
    });
  }
  return { child: collected.children[0], adapters: collected.adapters };
};

const renderFunctionElement = (element: ReactElement, label: string): ReactNode => {
  const component = element.type as {
    (props: unknown): ReactNode;
    prototype?: { isReactComponent?: unknown };
    isTier2Embeddable?: boolean;
  };
  if (component.prototype?.isReactComponent !== undefined || component.isTier2Embeddable === true) {
    throw structureError(label, `${label} accepts only BlockCell declarations.`, {
      expectedType: 'BlockCell',
    });
  }
  try {
    return component(element.props);
  } catch (cause) {
    if (cause instanceof RetikzGraphReactError) throw cause;
    throw new RetikzGraphReactError({
      code: RetikzGraphReactErrorCode.BlockStructureInvalid,
      message: `${label} function-component wrapper could not be evaluated.`,
      details: { label, reason: 'structure-wrapper-failed' },
      cause,
    });
  }
};

const collectCellElements = (children: ReactNode): Array<ReactElement<BlockCellProps>> => {
  const output: Array<ReactElement<BlockCellProps>> = [];
  const visit = (value: ReactNode): void => {
    Children.forEach(value, child => {
      if (child === null || child === undefined || typeof child === 'boolean') return;
      if (!isValidElement(child)) {
        throw structureError('BlockRow', 'BlockRow accepts only BlockCell declarations.', {
          expectedType: 'BlockCell',
        });
      }
      if (child.type === Fragment) {
        visit((child.props as { children?: ReactNode }).children);
        return;
      }
      if (child.type === BlockCell) {
        output.push(child as ReactElement<BlockCellProps>);
        return;
      }
      if (typeof child.type === 'function') {
        visit(renderFunctionElement(child, 'BlockRow'));
        return;
      }
      throw structureError('BlockRow', 'BlockRow accepts only BlockCell declarations.', {
        expectedType: 'BlockCell',
      });
    });
  };
  visit(children);
  return output;
};

const createBlockInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, ...input } = props as BlockProps;
  const collected = collectGraphChildren(children, context.id);
  return withInputEmbedAdapters(
    {
      ...input,
      ...(collected.children.length === 0 ? {} : { children: collected.children }),
    },
    collected.adapters,
  );
};

const BlockComponent: FC<BlockProps> = () => null;

/** 将开放内容 Block Source 接入 React 编写流程 */
export const Block = BlockComponent as GraphEmbeddableComponent<BlockProps>;

Block.displayName = 'Block';
Block.isTier2Embeddable = true;
Block.inputEmbedAdapter = BlockInputEmbedAdapter;
Block.createInputEmbedProps = createBlockInput;

const createBlockHeaderInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { icon: iconNode, trailing: trailingNode, ...input } = props as BlockHeaderProps;
  const icon = collectOptionalSlot(iconNode, `${context.id}:icon`, 'BlockHeader.icon');
  const trailing = collectOptionalSlot(trailingNode, `${context.id}:trailing`, 'BlockHeader.trailing');
  return withInputEmbedAdapters(
    {
      ...input,
      ...(icon === undefined ? {} : { icon: icon.child }),
      ...(trailing === undefined ? {} : { trailing: trailing.child }),
    },
    [...(icon?.adapters ?? []), ...(trailing?.adapters ?? [])],
  );
};

const BlockHeaderComponent: FC<BlockHeaderProps> = () => null;

/** 将独立 Block Header Source 接入 React 编写流程 */
export const BlockHeader = BlockHeaderComponent as GraphEmbeddableComponent<BlockHeaderProps>;

BlockHeader.displayName = 'BlockHeader';
BlockHeader.isTier2Embeddable = true;
BlockHeader.inputEmbedAdapter = BlockHeaderInputEmbedAdapter;
BlockHeader.createInputEmbedProps = createBlockHeaderInput;

const createBlockSectionInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, ...input } = props as BlockSectionProps;
  const collected = collectGraphChildren(children, context.id);
  return withInputEmbedAdapters(
    {
      ...input,
      ...(collected.children.length === 0 ? {} : { children: collected.children }),
    },
    collected.adapters,
  );
};

const BlockSectionComponent: FC<BlockSectionProps> = () => null;

/** 将独立 Block Section Source 接入 React 编写流程 */
export const BlockSection = BlockSectionComponent as GraphEmbeddableComponent<BlockSectionProps>;

BlockSection.displayName = 'BlockSection';
BlockSection.isTier2Embeddable = true;
BlockSection.inputEmbedAdapter = BlockSectionInputEmbedAdapter;
BlockSection.createInputEmbedProps = createBlockSectionInput;

const createBlockRowInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, ...input } = props as BlockRowProps;
  const adapters: Array<AnyInputEmbedAdapter> = [];
  const cells = collectCellElements(children).map((element, index): InputBlockCell => {
    const { children: cellChild, itemKey, ...cell } = element.props;
    const collected = collectRequiredSlot(cellChild, `${context.id}:cell:${index}`, 'BlockCell');
    adapters.push(...collected.adapters);
    return { ...cell, ...(itemKey === undefined ? {} : { key: itemKey }), child: collected.child };
  });
  return withInputEmbedAdapters(
    {
      ...input,
      ...(cells.length === 0 ? {} : { children: cells }),
    },
    adapters,
  );
};

const BlockRowComponent: FC<BlockRowProps> = () => null;

/** 将独立 Block Row Source 接入 React 编写流程 */
export const BlockRow = BlockRowComponent as GraphEmbeddableComponent<BlockRowProps>;

BlockRow.displayName = 'BlockRow';
BlockRow.isTier2Embeddable = true;
BlockRow.inputEmbedAdapter = BlockRowInputEmbedAdapter;
BlockRow.createInputEmbedProps = createBlockRowInput;

/** 声明一个 Row-local Flex item；脱离 BlockRow 使用时 fail-loud */
export const BlockCell: FC<BlockCellProps> = () => {
  throw structureError('BlockCell', 'BlockCell can only be used as a child of BlockRow.', {
    reason: 'cell-outside-row',
  });
};

BlockCell.displayName = 'BlockCell';
