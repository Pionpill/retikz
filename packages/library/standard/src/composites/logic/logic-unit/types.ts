import type { z } from 'zod';

import type {
  DecisionAppearanceSchema,
  DecisionArtifactSchema,
  DecisionSchema,
  JunctionAppearanceSchema,
  JunctionArtifactSchema,
  JunctionSchema,
  StageAppearanceSchema,
  StageArtifactSchema,
  StageSchema,
  TerminalAppearanceSchema,
  TerminalArtifactSchema,
  TerminalSchema,
} from './schema';

/** Terminal 规范 IR */
export type IRTerminal = z.infer<typeof TerminalSchema>;

/** Terminal 工厂输入 */
export type TerminalInput = Omit<z.input<typeof TerminalSchema>, 'namespace' | 'type'>;

/** Terminal 外观规范类型 */
export type TerminalAppearance = z.infer<typeof TerminalAppearanceSchema>;

/** Terminal 外观作者输入 */
export type TerminalAppearanceInput = z.input<typeof TerminalAppearanceSchema>;

/** Stage 规范 IR */
export type IRStage = z.infer<typeof StageSchema>;

/** Stage 工厂输入 */
export type StageInput = Omit<z.input<typeof StageSchema>, 'namespace' | 'type'>;

/** Stage 外观规范类型 */
export type StageAppearance = z.infer<typeof StageAppearanceSchema>;

/** Stage 外观作者输入 */
export type StageAppearanceInput = z.input<typeof StageAppearanceSchema>;

/** Decision 规范 IR */
export type IRDecision = z.infer<typeof DecisionSchema>;

/** Decision 工厂输入 */
export type DecisionInput = Omit<z.input<typeof DecisionSchema>, 'namespace' | 'type'>;

/** Decision 外观规范类型 */
export type DecisionAppearance = z.infer<typeof DecisionAppearanceSchema>;

/** Decision 外观作者输入 */
export type DecisionAppearanceInput = z.input<typeof DecisionAppearanceSchema>;

/** Junction 规范 IR */
export type IRJunction = z.infer<typeof JunctionSchema>;

type WithoutCompositeIdentity<T> = T extends object ? Omit<T, 'namespace' | 'type'> : never;

/** Junction 工厂输入 */
export type JunctionInput = WithoutCompositeIdentity<z.input<typeof JunctionSchema>>;

/** Junction 外观规范类型 */
export type JunctionAppearance = z.infer<typeof JunctionAppearanceSchema>;

/** Junction 外观作者输入 */
export type JunctionAppearanceInput = z.input<typeof JunctionAppearanceSchema>;

/** Terminal 已解析编译 artifact 载荷 */
export type TerminalArtifact = z.infer<typeof TerminalArtifactSchema>;

/** Stage 已解析编译 artifact 载荷 */
export type StageArtifact = z.infer<typeof StageArtifactSchema>;

/** Decision 已解析编译 artifact 载荷 */
export type DecisionArtifact = z.infer<typeof DecisionArtifactSchema>;

/** Junction 已解析编译 artifact 载荷 */
export type JunctionArtifact = z.infer<typeof JunctionArtifactSchema>;
