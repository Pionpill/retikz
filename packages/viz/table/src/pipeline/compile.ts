import type { AnyCompositeDefinition, CompileArtifact } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';

import { compileToScene } from '@retikz/core';

import type { IRTableSpec } from '../schemas';
import type { CompileTableOptions, CompileTableResult, TableCompileArtifact } from './types';

import { TABLE_NAMESPACE, TableComposite, TableSpecSchema } from '../schemas';
import { lowerTables } from './resolve';

const isRootTableArtifact = (artifact: CompileArtifact): artifact is TableCompileArtifact =>
  artifact.kind === 'composite' &&
  artifact.namespace === TABLE_NAMESPACE &&
  artifact.type === TableComposite.Table &&
  artifact.occurrence.sourcePath === 'children[0]' &&
  artifact.occurrence.expansionPath.length === 0;

/** 编译 canonical 单根 Table Scene，并返回同次 compile 的精确根 manifest */
export const compileTable = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  spec: IRTableSpec,
  datasets: ExternalDatasets,
  options: CompileTableOptions<TComposites> = {},
): CompileTableResult<TComposites> => {
  const parsed = TableSpecSchema.parse(spec);
  const compileOptions = options.compile ?? {};
  const tableDefinitions = lowerTables(datasets, options.lower);
  const composites = [...tableDefinitions, ...(compileOptions.composites ?? [])];
  const result = compileToScene({ type: 'scene', version: 1, children: [parsed] }, { ...compileOptions, composites });
  const matches = result.artifacts.filter(isRootTableArtifact);
  if (matches.length !== 1) {
    throw new Error(`table: compileTable expected exactly one root table.table artifact, received ${matches.length}`);
  }
  return Object.freeze({ ...result, manifest: matches[0].value });
};
