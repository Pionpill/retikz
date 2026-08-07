import type {
  DecisionInput,
  IRDecision,
  IRJunction,
  IRStage,
  IRTerminal,
  JunctionInput,
  StageInput,
  TerminalInput,
} from './types';

import { STANDARD_NAMESPACE } from '../shared';
import { DecisionSchema, JunctionSchema, StageSchema, TerminalSchema } from './schema';

/** 校验并创建 canonical Terminal IR */
export const createTerminal = (input: TerminalInput): IRTerminal =>
  TerminalSchema.parse({ namespace: STANDARD_NAMESPACE, type: 'terminal', ...input });

/** 校验并创建 canonical Stage IR */
export const createStage = (input: StageInput): IRStage =>
  StageSchema.parse({ namespace: STANDARD_NAMESPACE, type: 'stage', ...input });

/** 校验并创建 canonical Decision IR */
export const createDecision = (input: DecisionInput): IRDecision =>
  DecisionSchema.parse({ namespace: STANDARD_NAMESPACE, type: 'decision', ...input });

/** 校验并创建 canonical Junction IR */
export const createJunction = (input: JunctionInput): IRJunction =>
  JunctionSchema.parse({ namespace: STANDARD_NAMESPACE, type: 'junction', ...input });
