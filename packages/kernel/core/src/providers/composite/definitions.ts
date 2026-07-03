import type { CompositeDefinition } from '../../contract';

/** core 暂不内置 composite；外部包通过 `CompileOptions.composites` 注入。 */
export const BUILTIN_COMPOSITES: ReadonlyArray<CompositeDefinition> = [];
