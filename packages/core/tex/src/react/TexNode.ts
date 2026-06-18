import { type FC, createElement } from 'react';
import type { IRNode, IRTexContent } from '@retikz/core';

const TIKZ_NODE_DISPLAY_NAME = '@retikz/Node';

type TexNodeHydrationHandler = (event: unknown, context: unknown) => void;

type TexNodeHydrationEventProps = {
  onClick?: TexNodeHydrationHandler;
  onDoubleClick?: TexNodeHydrationHandler;
  onRightClick?: TexNodeHydrationHandler;
  onPointerDown?: TexNodeHydrationHandler;
  onPointerUp?: TexNodeHydrationHandler;
  onPointerMove?: TexNodeHydrationHandler;
  onPointerEnter?: TexNodeHydrationHandler;
  onPointerLeave?: TexNodeHydrationHandler;
  onWheel?: TexNodeHydrationHandler;
};

type TexNodeContentProps =
  | {
      /** LaTeX source string; mutually exclusive with children. */
      tex: string;
      children?: never;
    }
  | {
      tex?: never;
      /** LaTeX source string written in the component body. */
      children: string;
    };

/** Props for the React formula sugar component. */
export type TexNodeProps = Omit<IRNode, 'type' | 'tex' | 'text'> &
  TexNodeHydrationEventProps &
  TexNodeContentProps & {
    /** Display TeX metrics; omitted means inline metrics. */
    displayMode?: IRTexContent['displayMode'];
  };

const RetikzNode: FC<Omit<IRNode, 'type' | 'text'> & TexNodeHydrationEventProps> = () => null;
RetikzNode.displayName = TIKZ_NODE_DISPLAY_NAME;

const stripHydrationProps = (
  props: Omit<TexNodeProps, 'tex' | 'children' | 'displayMode'>,
): Omit<IRNode, 'type' | 'tex' | 'text'> => {
  const nodeProps = { ...props };
  delete nodeProps.onClick;
  delete nodeProps.onDoubleClick;
  delete nodeProps.onRightClick;
  delete nodeProps.onPointerDown;
  delete nodeProps.onPointerUp;
  delete nodeProps.onPointerMove;
  delete nodeProps.onPointerEnter;
  delete nodeProps.onPointerLeave;
  delete nodeProps.onWheel;
  return nodeProps;
};

/**
 * React sugar for a retikz node whose content is fixed to `node.tex`.
 * The Node-compatible marker keeps `@retikz/tex` from statically importing the React adapter.
 */
export const TexNode: FC<TexNodeProps> = props => {
  const { tex, children, displayMode, ...rest } = props;
  const content: IRTexContent =
    displayMode === undefined
      ? { tex: tex ?? children }
      : { tex: tex ?? children, displayMode };
  return createElement(RetikzNode, { ...stripHydrationProps(rest), tex: content });
};

TexNode.displayName = 'TexNode';
