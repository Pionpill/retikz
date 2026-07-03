import type { PathGeneratorDefinition } from '../../contract';

/** core 暂不内置 path generator；外部包通过 `CompileOptions.pathGenerators` 注入。 */
export const BUILTIN_PATH_GENERATORS: ReadonlyArray<PathGeneratorDefinition> = [];
