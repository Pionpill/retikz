import type { z } from 'zod';

import type { DecisionSchema, JunctionSchema, StageSchema, TerminalSchema } from './schema';

/** Terminal 基础单元的规范IR */
export type IRTerminal = z.infer<typeof TerminalSchema>;

/** Terminal 基础单元工厂输入 */
export type TerminalInput = Omit<z.input<typeof TerminalSchema>, 'namespace' | 'type'>;

/** Stage 基础单元的规范IR */
export type IRStage = z.infer<typeof StageSchema>;

/** Stage 基础单元工厂输入 */
export type StageInput = Omit<z.input<typeof StageSchema>, 'namespace' | 'type'>;

/** Decision 基础单元的规范IR */
export type IRDecision = z.infer<typeof DecisionSchema>;

/** Decision 基础单元工厂输入 */
export type DecisionInput = Omit<z.input<typeof DecisionSchema>, 'namespace' | 'type'>;

/** Junction 基础单元的规范IR */
export type IRJunction = z.infer<typeof JunctionSchema>;

/** Junction 基础单元工厂输入 */
export type JunctionInput = Omit<z.input<typeof JunctionSchema>, 'namespace' | 'type'>;

/** 四类基础单元的规范IR联合 */
export type LogicSemanticNode = IRTerminal | IRStage | IRDecision | IRJunction;
