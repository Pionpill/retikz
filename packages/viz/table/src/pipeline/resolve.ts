import type { ExpandCompositeDefinition, IRChild, IRJsonObject, IRScope } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';

import { defineComposite } from '@retikz/core';

import type { IRTableSpec } from '../schemas';
import type { LowerTablesOptions, TableLoweringResult } from './types';

import { TABLE_NAMESPACE, TableComposite, TableSpecSchema } from '../schemas';
import { layoutTable } from './layout';
import { emitTable } from './lower';
import { buildTableLayoutManifest } from './manifest';
import { normalizeTableStructure } from './normalize';
import { presentTable } from './presentation';

const errorMessageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** 把 Table 外部身份与 opaque meta 放到逻辑根 Scope */
const withTableRoot = (node: IRChild, id: string | undefined, meta: IRJsonObject | undefined): IRChild => {
  if (id !== undefined) {
    const root: IRScope = {
      type: 'scope',
      id,
      ...(meta === undefined ? {} : { meta }),
      children: [node],
    };
    return root;
  }
  if (meta === undefined) return node;
  if ('namespace' in node || node.type !== 'scope') {
    throw new Error('table: internal root alignment: emitted Table root must be a Scope');
  }
  return { ...node, meta };
};

/** 执行 Table 根校验、结构、呈现、布局与 emit 的单一编排 */
const resolveTable = (
  spec: IRTableSpec,
  datasets: ExternalDatasets,
  options: LowerTablesOptions,
): TableLoweringResult => {
  try {
    const parsed = TableSpecSchema.parse(spec);
    const semantic = normalizeTableStructure(parsed.structure, {
      data: parsed.data,
      datasets,
      structureDefinitions: options.structureDefinitions,
    });
    const presented = presentTable(semantic, options.presentationDefinitions);
    const layout = layoutTable(semantic, parsed.layout);
    const emitted = emitTable(presented, layout);
    const node = withTableRoot(emitted, parsed.id, parsed.meta);
    const manifest = buildTableLayoutManifest(parsed.id, semantic, layout);
    return Object.freeze({ node, manifest });
  } catch (error) {
    throw new Error(`table: lower: ${errorMessageOf(error)}`, { cause: error });
  }
};

/** 把单个 Table spec 下沉为 Core IR 与显式 layout manifest */
export const lowerTableWithArtifacts = (
  spec: IRTableSpec,
  datasets: ExternalDatasets,
  options: LowerTablesOptions = {},
): TableLoweringResult => resolveTable(spec, datasets, options);

/** 构造 Table 的 Tier 2 composite definitions，供 Core compile options 注入 */
export const lowerTables = (
  datasets: ExternalDatasets,
  options: LowerTablesOptions = {},
): Array<
  ExpandCompositeDefinition<
    IRTableSpec,
    typeof TABLE_NAMESPACE,
    typeof TableComposite.Table
  >
> => [
  defineComposite({
    namespace: TABLE_NAMESPACE,
    type: TableComposite.Table,
    schema: TableSpecSchema,
    expand: (spec: IRTableSpec) => resolveTable(spec, datasets, options).node,
  }),
];
