import type { IRNode } from '@retikz/core';

import type { DecisionInput, JunctionInput, StageInput, TerminalInput } from './types';

import { DecisionSchema, JunctionSchema, StageSchema, TerminalSchema } from './schema';

/** 创建带 Terminal 默认形状和逻辑 Schema 语义的 Core Node */
export const createTerminal = (input: TerminalInput): IRNode =>
  TerminalSchema.parse({
    type: 'node',
    ...input,
    shape: { type: 'rectangle', params: { cornerRadius: 1_000_000 } },
  }) as IRNode;

/** 创建带 Stage 默认形状和逻辑 Schema 语义的 Core Node */
export const createStage = (input: StageInput): IRNode =>
  StageSchema.parse({ type: 'node', ...input, shape: { type: 'rectangle', params: { cornerRadius: 8 } } }) as IRNode;

/** 创建带 Decision 默认形状和逻辑 Schema 语义的 Core Node */
export const createDecision = (input: DecisionInput): IRNode =>
  DecisionSchema.parse({ type: 'node', ...input, shape: { type: 'diamond', params: { aspectRatio: 1.8 } } }) as IRNode;

/** 创建带 Junction 默认形状和逻辑 Schema 语义的 Core Node */
export const createJunction = (input: JunctionInput): IRNode =>
  JunctionSchema.parse({ type: 'node', ...input, shape: 'circle' }) as IRNode;
