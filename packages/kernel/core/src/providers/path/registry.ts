import type { PathGeneratorDefinition } from '../../contract/path';

export const BUILTIN_PATH_GENERATORS: Record<string, PathGeneratorDefinition> = {};

export const resolvePathGeneratorRegistry = (
  pathGenerators?: Record<string, PathGeneratorDefinition>,
): Record<string, PathGeneratorDefinition> => pathGenerators ?? BUILTIN_PATH_GENERATORS;
