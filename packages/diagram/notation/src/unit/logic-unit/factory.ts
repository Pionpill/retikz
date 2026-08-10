import type { IRDecision, IRJunction, IRStage, IRTerminal } from './types';
import type { DecisionInput, JunctionInput, StageInput, TerminalInput } from './types';

import { NOTATION_NAMESPACE, NotationElementType } from '../../shared';
import { DecisionSchema, JunctionSchema, StageSchema, TerminalSchema } from './schema';

/** 创建规范Terminal IR */
export const createTerminal = (input: TerminalInput): IRTerminal =>
  TerminalSchema.parse({ namespace: NOTATION_NAMESPACE, type: NotationElementType.Terminal, ...input });

/** 创建规范Stage IR */
export const createStage = (input: StageInput): IRStage =>
  StageSchema.parse({ namespace: NOTATION_NAMESPACE, type: NotationElementType.Stage, ...input });

/** 创建规范Decision IR */
export const createDecision = (input: DecisionInput): IRDecision =>
  DecisionSchema.parse({ namespace: NOTATION_NAMESPACE, type: NotationElementType.Decision, ...input });

/** 创建规范Junction IR */
export const createJunction = (input: JunctionInput): IRJunction =>
  JunctionSchema.parse({ namespace: NOTATION_NAMESPACE, type: NotationElementType.Junction, ...input });
