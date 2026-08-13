import type { CompositeExpandResult, ExpandCompositeDefinition, IRNode } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRDecision, IRJunction, IRStage, IRTerminal, LogicSemanticNode } from './types';

import { NOTATION_NAMESPACE, NotationElementType } from '../../shared';
import { DecisionSchema, JunctionSchema, StageSchema, TerminalSchema } from './schema';

/** 把一个Notation基础单元展开为固定形状的同标识Core Node */
const expandSemanticNode = (node: LogicSemanticNode, shape: NonNullable<IRNode['shape']>): CompositeExpandResult => {
  const { namespace: _namespace, type: _type, ...input } = node;
  void _namespace;
  void _type;
  return { children: [{ type: 'node', ...input, shape }] };
};

/** Notation Terminal的轻量展开定义 */
export const TerminalDefinition: ExpandCompositeDefinition<
  IRTerminal,
  typeof NOTATION_NAMESPACE,
  typeof NotationElementType.Terminal
> = defineComposite({
  namespace: NOTATION_NAMESPACE,
  type: NotationElementType.Terminal,
  schema: TerminalSchema,
  expand: node => expandSemanticNode(node, { type: 'rectangle', params: { cornerRadius: 1_000_000 } }),
});

/** Notation Stage的轻量展开定义 */
export const StageDefinition: ExpandCompositeDefinition<
  IRStage,
  typeof NOTATION_NAMESPACE,
  typeof NotationElementType.Stage
> = defineComposite({
  namespace: NOTATION_NAMESPACE,
  type: NotationElementType.Stage,
  schema: StageSchema,
  expand: node => expandSemanticNode(node, { type: 'rectangle', params: { cornerRadius: 8 } }),
});

/** Notation Decision的轻量展开定义 */
export const DecisionDefinition: ExpandCompositeDefinition<
  IRDecision,
  typeof NOTATION_NAMESPACE,
  typeof NotationElementType.Decision
> = defineComposite({
  namespace: NOTATION_NAMESPACE,
  type: NotationElementType.Decision,
  schema: DecisionSchema,
  expand: node => expandSemanticNode(node, { type: 'diamond', params: { aspectRatio: 1.8 } }),
});

/** Notation Junction的轻量展开定义 */
export const JunctionDefinition: ExpandCompositeDefinition<
  IRJunction,
  typeof NOTATION_NAMESPACE,
  typeof NotationElementType.Junction
> = defineComposite({
  namespace: NOTATION_NAMESPACE,
  type: NotationElementType.Junction,
  schema: JunctionSchema,
  expand: node => expandSemanticNode(node, 'circle'),
});
