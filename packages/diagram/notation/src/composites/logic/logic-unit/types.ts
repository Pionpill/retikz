import type { IRNode } from '@retikz/core';
import type { z } from 'zod';

import type { DecisionSchema, JunctionSchema, StageSchema, TerminalSchema } from './schema';

/** Terminal Node canonical IR */
export type IRTerminal = IRNode;

/** Terminal Node factory input */
export type TerminalInput = Omit<z.input<typeof TerminalSchema>, 'type' | 'shape'>;

/** Stage Node canonical IR */
export type IRStage = IRNode;

/** Stage Node factory input */
export type StageInput = Omit<z.input<typeof StageSchema>, 'type' | 'shape'>;

/** Decision Node canonical IR */
export type IRDecision = IRNode;

/** Decision Node factory input */
export type DecisionInput = Omit<z.input<typeof DecisionSchema>, 'type' | 'shape'>;

/** Junction Node canonical IR */
export type IRJunction = IRNode;

/** Junction Node factory input */
export type JunctionInput = Omit<z.input<typeof JunctionSchema>, 'type' | 'shape'>;

/** Semantic logic unit output is always a Core Node */
export type LogicSemanticNode = IRNode;
