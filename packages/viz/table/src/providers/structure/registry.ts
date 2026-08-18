import { z } from 'zod';

import type { AnyTableStructureDefinition } from '../../contract';

import { RetikzTableError } from '../../error';
import { RESERVED_TABLE_STRUCTURE_KINDS } from '../../schemas';
import { BUILTIN_TABLE_STRUCTURES } from './definitions';

/** 从 definition schema 的 kind literal 提取唯一 registry key */
export const extractTableStructureKind = (definition: AnyTableStructureDefinition): string => {
  if (!(definition.schema instanceof z.ZodObject)) {
    throw new RetikzTableError('table: structure definition schema must be a ZodObject with a literal kind');
  }
  const kindSchema = definition.schema.shape.kind;
  if (!(kindSchema instanceof z.ZodLiteral) || typeof kindSchema.value !== 'string' || kindSchema.value.length === 0) {
    throw new RetikzTableError('table: structure definition schema.kind must be a non-empty string literal');
  }
  return kindSchema.value;
};

const BUILTIN_STRUCTURE_KINDS = new Set(BUILTIN_TABLE_STRUCTURES.map(extractTableStructureKind));

/** 合并内置与用户 Table structure definitions */
export const resolveTableStructureRegistry = (
  custom?: ReadonlyArray<AnyTableStructureDefinition>,
): ReadonlyMap<string, AnyTableStructureDefinition> => {
  const registry = new Map<string, AnyTableStructureDefinition>();
  for (const definition of BUILTIN_TABLE_STRUCTURES) {
    const kind = extractTableStructureKind(definition);
    if (registry.has(kind)) throw new RetikzTableError(`table: duplicate built-in structure registration: "${kind}"`);
    registry.set(kind, definition);
  }

  for (const definition of custom ?? []) {
    const kind = extractTableStructureKind(definition);
    if (BUILTIN_STRUCTURE_KINDS.has(kind)) {
      throw new RetikzTableError(`table: structure kind "${kind}" conflicts with a built-in definition`);
    }
    if ((RESERVED_TABLE_STRUCTURE_KINDS as ReadonlyArray<string>).includes(kind)) {
      throw new RetikzTableError(`table: structure kind "${kind}" is reserved for v0.1`);
    }
    if (registry.has(kind)) throw new RetikzTableError(`table: duplicate structure registration: "${kind}"`);
    registry.set(kind, definition);
  }
  return registry;
};

/** 从 registry 读取具名 Table structure definition */
export const tableStructureDefinitionOf = (
  kind: string,
  registry: ReadonlyMap<string, AnyTableStructureDefinition>,
): AnyTableStructureDefinition => {
  const definition = registry.get(kind);
  if (definition !== undefined) return definition;
  throw new RetikzTableError(`table: structure "${kind}" is not registered; pass it via options.structureDefinitions`);
};
