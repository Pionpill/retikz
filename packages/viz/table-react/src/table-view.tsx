import type { CompileArtifact } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { TableCompileArtifact } from '@retikz/table';
import type { InputTable, InputTableVariant } from '@retikz/table-vanilla';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { TABLE_NAMESPACE, TableComposite } from '@retikz/table';
import { TableInputEmbedAdapter } from '@retikz/table-vanilla';
import { useCallback, useMemo, useRef } from 'react';

import type { ReactTableRuntime } from './table-runtime';

import { RetikzTableReactError } from './error';
import { useTableThemeStyles } from './theme-context';

/** standalone Table 运行时交给 Layout 的内部 InputEmbed 组件属性 */
type TableRuntimeEmbedProps = InputTable;

/** React Layout 遍历时识别的 Table Vanilla InputEmbed 宿主 */
type TableRuntimeEmbedComponent = FC<TableRuntimeEmbedProps> & {
  isTier2Embeddable: true;
  inputEmbedAdapter: InputEmbedAdapter<InputTable>;
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
    tableThemeStyles,
    visualScaleDefinitions,
  } = lowerOptions;
  const ambientTableThemeStyles = useTableThemeStyles();
  const effectiveTableThemeStyles = useMemo(() => {
    if (ambientTableThemeStyles === undefined) return tableThemeStyles;
    if (tableThemeStyles === undefined) return ambientTableThemeStyles;
    return [...ambientTableThemeStyles, ...tableThemeStyles];
  }, [ambientTableThemeStyles, tableThemeStyles]);
  const stableLowerOptions = useMemo(
    () => ({
      ...(formatterDefinitions === undefined ? {} : { formatterDefinitions }),
      ...(presentationDefinitions === undefined ? {} : { presentationDefinitions }),
      ...(structureDefinitions === undefined ? {} : { structureDefinitions }),
      ...(visualScaleDefinitions === undefined ? {} : { visualScaleDefinitions }),
      ...(effectiveTableThemeStyles === undefined ? {} : { tableThemeStyles: effectiveTableThemeStyles }),
    }),
    [
      effectiveTableThemeStyles,
      formatterDefinitions,
      presentationDefinitions,
      structureDefinitions,
      visualScaleDefinitions,
    ],
  );
  const input = useMemo<InputTable>(
    () => ({
      table: stableTable,
      data: stableDatasets,
      lowerOptions: stableLowerOptions,
      composites,
      preserveRootIdentity: true,
    }),
    [composites, stableDatasets, stableLowerOptions, stableTable],
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
    <Layout onArtifacts={onManifest === undefined ? undefined : handleArtifacts} {...display}>
      {inputChild}
    </Layout>
  );
};
