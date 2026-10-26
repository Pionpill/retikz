import type { CompileArtifact } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import { Layout } from '@retikz/react';
import type { TableCompileArtifact } from '@retikz/table';
import { TABLE_NAMESPACE, TableComposite } from '@retikz/table';
import type { InputTable, InputTableVariant } from '@retikz/table-vanilla';
import { TableInputEmbedAdapter } from '@retikz/table-vanilla';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';
import { useCallback, useMemo, useRef } from 'react';

import { RetikzTableReactError } from './error';
import type { ReactTableRuntime } from './table-runtime';
import { useTableThemeDefinitions } from './theme-context';

/** standalone Table 运行时交给 Layout 的内部 InputEmbed 组件属性 */
type TableRuntimeEmbedProps = InputTable<unknown>;

/** React Layout 遍历时识别的 Table Vanilla InputEmbed 宿主 */
type TableRuntimeEmbedComponent = FC<TableRuntimeEmbedProps> & {
  isTier2Embeddable: true;
  inputEmbedAdapter: InputEmbedAdapter<InputTable<unknown>>;
};

const TableRuntimeEmbed = (() => null) as unknown as TableRuntimeEmbedComponent;
TableRuntimeEmbed.displayName = 'TableRuntimeEmbed';
TableRuntimeEmbed.isTier2Embeddable = true;
TableRuntimeEmbed.inputEmbedAdapter = TableInputEmbedAdapter;

const isRootTableArtifact = (artifact: CompileArtifact): artifact is TableCompileArtifact =>
  artifact.kind === 'composite' &&
  artifact.namespace === TABLE_NAMESPACE &&
  artifact.type === TableComposite.Table &&
  artifact.occurrence.sourcePath === 'children[0]' &&
  artifact.occurrence.expansionPath.length === 0;

/** 共享 standalone Table runtime view，不作为公开组件导出 */
export const TableRuntimeView: FC<Readonly<{ runtime: ReactTableRuntime }>> = ({ runtime }) => {
  const { table, lowerOptions, composites, onManifest, display } = runtime;
  const { shapes, boundaries, clips, arrows, patterns, paths, themeDefinitions, ...hostProps } = display;
  const tableKey = JSON.stringify(table);
  const stableTable = useMemo<InputTableVariant>(() => JSON.parse(tableKey) as InputTableVariant, [tableKey]);
  const { datasetReference, datasetSource } = runtime;
  const stableDatasets = useMemo<ExternalDatasets>(
    () =>
      datasetReference === undefined
        ? (datasetSource as ExternalDatasets)
        : { [datasetReference]: datasetSource as ExternalDatasets[string] },
    [datasetReference, datasetSource],
  );

  const {
    formatterDefinitions,
    presentationDefinitions,
    structureDefinitions,
    tableThemeDefinitions,
    visualScaleDefinitions,
    formatDefinitions,
    fieldOrderDefinitions,
    transformDefinitions,
    statisticsReducerDefinitions,
    rowSelectorDefinitions,
    regressionDefinitions,
    transformImplementations,
    statisticsReducerImplementations,
    rowSelectorImplementations,
    regressionImplementations,
  } = lowerOptions;

  const ambientTableThemeDefinitions = useTableThemeDefinitions();
  const effectiveTableThemeDefinitions = useMemo(() => {
    if (ambientTableThemeDefinitions === undefined) return tableThemeDefinitions;
    if (tableThemeDefinitions === undefined) return ambientTableThemeDefinitions;
    return [...ambientTableThemeDefinitions, ...tableThemeDefinitions];
  }, [ambientTableThemeDefinitions, tableThemeDefinitions]);

  const stableLowerOptions = useMemo(
    () => ({
      ...(formatterDefinitions === undefined ? {} : { formatterDefinitions }),
      ...(presentationDefinitions === undefined ? {} : { presentationDefinitions }),
      ...(structureDefinitions === undefined ? {} : { structureDefinitions }),
      ...(visualScaleDefinitions === undefined ? {} : { visualScaleDefinitions }),
      ...(effectiveTableThemeDefinitions === undefined
        ? {}
        : { tableThemeDefinitions: effectiveTableThemeDefinitions }),
      formatDefinitions,
      fieldOrderDefinitions,
      transformDefinitions,
      statisticsReducerDefinitions,
      rowSelectorDefinitions,
      regressionDefinitions,
      transformImplementations,
      statisticsReducerImplementations,
      rowSelectorImplementations,
      regressionImplementations,
    }),
    [
      effectiveTableThemeDefinitions,
      formatterDefinitions,
      presentationDefinitions,
      structureDefinitions,
      visualScaleDefinitions,
      formatDefinitions,
      fieldOrderDefinitions,
      transformDefinitions,
      statisticsReducerDefinitions,
      rowSelectorDefinitions,
      regressionDefinitions,
      transformImplementations,
      statisticsReducerImplementations,
      rowSelectorImplementations,
      regressionImplementations,
    ],
  );

  const input = useMemo<InputTable<unknown>>(
    () => ({
      table: stableTable,
      ...(runtime.dataBindings === undefined ? { data: stableDatasets } : { dataBindings: runtime.dataBindings }),
      dataTransformExecutor: runtime.dataTransformExecutor,
      signal: runtime.signal,
      lowerOptions: stableLowerOptions,
      composites,
    }),
    [
      composites,
      stableDatasets,
      stableLowerOptions,
      stableTable,
      runtime.dataBindings,
      runtime.dataTransformExecutor,
      runtime.signal,
    ],
  );
  const inputChild = useMemo(() => <TableRuntimeEmbed {...input} />, [input]);

  const notifiedManifestKey = useRef<string>();
  const handleArtifacts = useCallback(
    (artifacts: ReadonlyArray<CompileArtifact>): void => {
      const matches = artifacts.filter(isRootTableArtifact);
      if (matches.length !== 1) {
        throw new RetikzTableReactError(
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
      runtime={{ preparation: 'async', signal: runtime.signal }}
      onArtifacts={onManifest === undefined ? undefined : handleArtifacts}
      {...hostProps}
      extensions={{ shapes, boundaries, clips, arrows, patterns, paths, themeDefinitions }}
    >
      {inputChild}
    </Layout>
  );
};
