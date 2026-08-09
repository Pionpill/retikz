import type { IRNode } from '@retikz/core';
import type { z } from 'zod';

import type { DecisionSchema, JunctionSchema, StageSchema, TerminalSchema } from './schema';

/** Terminal 节点的规范 IR */
export type IRTerminal = IRNode;

/** Terminal 节点工厂输入 */
export type TerminalInput = Omit<z.input<typeof TerminalSchema>, 'type' | 'shape'>;

/** Stage 节点的规范 IR */
export type IRStage = IRNode;

/** Stage 节点工厂输入 */
export type StageInput = Omit<z.input<typeof StageSchema>, 'type' | 'shape'>;

/** Decision 节点的规范 IR */
export type IRDecision = IRNode;

/** Decision 节点工厂输入 */
export type DecisionInput = Omit<z.input<typeof DecisionSchema>, 'type' | 'shape'>;

/** Junction 节点的规范 IR */
export type IRJunction = IRNode;

/** Junction 节点工厂输入 */
export type JunctionInput = Omit<z.input<typeof JunctionSchema>, 'type' | 'shape'>;

/** 语义逻辑单元始终输出 Core 节点 */
export type LogicSemanticNode = IRNode;
