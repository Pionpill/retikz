import type { CompileArtifact } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { TableCompileArtifact } from '@retikz/table';
import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { lowerTables, TABLE_NAMESPACE, TableComposite, TableSpecSchema } from '@retikz/table';
import { useCallback, useMemo, useRef } from 'react';

import type { ReactTableRuntime } from './table-runtime';

const isRootTableArtifact = (artifact: CompileArtifact): artifact is TableCompileArtifact =>
  artifact.kind === 'composite' &&
  artifact.namespace === TABLE_NAMESPACE &&
  artifact.type === TableComposite.Table &&
  artifact.occurrence.sourcePath === 'children[0]' &&
  artifact.occurrence.expansionPath.length === 0;

/** 共享 standalone Table runtime view，不作为公开组件导出 */
export const TableRuntimeView: FC<Readonly<{ runtime: ReactTableRuntime }>> = ({ runtime }) => {
  const { spec, lowerOptions, composites, onManifest, display } = runtime;
  const specKey = JSON.stringify(spec);
  const stableSpec = useMemo(() => TableSpecSchema.parse(JSON.parse(specKey)), [specKey]);
  const { datasetReference, datasetSource } = runtime;
  const stableDatasets = useMemo<ExternalDatasets>(
    () =>
      datasetReference === undefined
        ? (datasetSource as ExternalDatasets)
        : { [datasetReference]: datasetSource as ExternalDatasets[string] },
    [datasetReference, datasetSource],
  );
  const scene = useMemo(() => ({ version: 1 as const, type: 'scene' as const, children: [stableSpec] }), [stableSpec]);
  const { formatterDefinitions, presentationDefinitions, structureDefinitions } = lowerOptions;
  const tableDefinitions = useMemo(
    () => lowerTables(stableDatasets, { formatterDefinitions, presentationDefinitions, structureDefinitions }),
    [formatterDefinitions, presentationDefinitions, stableDatasets, structureDefinitions],
  );
  const mergedComposites = useMemo(() => [...tableDefinitions, ...composites], [composites, tableDefinitions]);
  const notifiedManifestKey = useRef<string>();
  const handleArtifacts = useCallback(
    (artifacts: ReadonlyArray<CompileArtifact>): void => {
      const matches = artifacts.filter(isRootTableArtifact);
      if (matches.length !== 1) {
        throw new Error(
          `table react: standalone Table expected exactly one root table.table artifact, received ${matches.length}`,
        );
      }
      const manifest = matches[0].value;
      const manifestKey = JSON.stringify(manifest);
      if (notifiedManifestKey.current === manifestKey) return;
      notifiedManifestKey.current = manifestKey;
      onManifest?.(manifest);
    },
    [onManifest],
  );

  return (
    <Layout
      ir={scene}
      composites={mergedComposites}
      onArtifacts={onManifest === undefined ? undefined : handleArtifacts}
      {...display}
    />
  );
};
