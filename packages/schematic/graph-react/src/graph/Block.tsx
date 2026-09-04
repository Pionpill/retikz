import type {
  BlockHeaderInputEmbedProps,
  BlockInputEmbedProps,
  BlockRowInputEmbedProps,
  BlockSectionInputEmbedProps,
} from '@retikz/graph-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import {
  BlockHeaderInputEmbedAdapter,
  BlockInputEmbedAdapter,
  BlockRowInputEmbedAdapter,
  BlockSectionInputEmbedAdapter,
} from '@retikz/graph-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

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
export type BlockHeaderProps = Omit<BlockHeaderInputEmbedProps, 'type' | 'icon' | 'trail'> &
  Readonly<{
    /** Header 左侧至多一个任意 child */
    icon?: ReactNode;
    /** Header 右侧至多一个任意 child */
    trail?: ReactNode;
  }>;

/** Block Section 的 React 编写参数 */
export type BlockSectionProps = Omit<BlockSectionInputEmbedProps, 'type' | 'children'> &
  Readonly<{
    /** 按声明顺序进入 Section 纵向布局的任意 children */
    children?: ReactNode;
  }>;

/** Block Row 的 React 编写参数 */
type BlockRowPropsVariant<T> =
  T extends Readonly<{ content: unknown }>
    ? Omit<T, 'type'> & Readonly<{ children?: never }>
    : Omit<T, 'type' | 'children'> &
        Readonly<{
          /** 按声明顺序进入 Row 横向布局的任意 children */
          children?: ReactNode;
        }>;

/** Block Row 的 React 编写参数 */
export type BlockRowProps = BlockRowPropsVariant<BlockRowInputEmbedProps>;

const structureError = (label: string, message: string, details: Record<string, string | number>) =>
  new RetikzGraphReactError({
    code: RetikzGraphReactErrorCode.BlockStructureInvalid,
    message,
    details: { label, ...details },
  });

type CollectedSlot = Readonly<{
  child: NonNullable<BlockHeaderInputEmbedProps['icon']>;
  adapters: ReadonlyArray<AnyInputEmbedAdapter>;
}>;

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
  const { icon: iconNode, trail: trailNode, ...input } = props as BlockHeaderProps;
  const icon = collectOptionalSlot(iconNode, `${context.id}:icon`, 'BlockHeader.icon');
  const trail = collectOptionalSlot(trailNode, `${context.id}:trail`, 'BlockHeader.trail');
  return withInputEmbedAdapters(
    {
      ...input,
      ...(icon === undefined ? {} : { icon: icon.child }),
      ...(trail === undefined ? {} : { trail: trail.child }),
    },
    [...(icon?.adapters ?? []), ...(trail?.adapters ?? [])],
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
  if ('content' in input && input.content !== undefined) {
    if (children !== undefined) {
      throw structureError('BlockRow', 'BlockRow content and children are mutually exclusive.', {
        expectedContentSources: 1,
        receivedContentSources: 2,
      });
    }
    return withInputEmbedAdapters(input, []);
  }
  const collected = collectGraphChildren(children, context.id);
  return withInputEmbedAdapters(
    {
      ...input,
      ...(collected.children.length === 0 ? {} : { children: collected.children }),
    },
    collected.adapters,
  );
};

const BlockRowComponent: FC<BlockRowProps> = () => null;

/** 将独立 Block Row Source 接入 React 编写流程 */
export const BlockRow = BlockRowComponent as GraphEmbeddableComponent<BlockRowProps>;

BlockRow.displayName = 'BlockRow';
BlockRow.isTier2Embeddable = true;
BlockRow.inputEmbedAdapter = BlockRowInputEmbedAdapter;
BlockRow.createInputEmbedProps = createBlockRowInput;
