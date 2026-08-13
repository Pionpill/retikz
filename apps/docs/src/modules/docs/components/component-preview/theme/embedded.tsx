import type { PlotProps } from '@retikz/plot-react';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { DetailTableProps, EmbeddableTableComponent, ManualTableProps } from '@retikz/table-react';
import type { FC } from 'react';

import { Plot as RuntimePlot } from '@retikz/plot-react';
import { DetailTable as RuntimeDetailTable, ManualTable as RuntimeManualTable } from '@retikz/table-react';

import { PreviewPlotThemeStyles } from './presets/plot';
import { PreviewTableThemeStyles } from './presets/table';

/** 只为绕过 React context 的 Layout-embedded adapter 补齐 docs Plot definitions */
const withPlotThemeStyles = (props: PlotProps): PlotProps => ({
  ...props,
  plotThemeStyles:
    props.plotThemeStyles === undefined
      ? PreviewPlotThemeStyles
      : [...PreviewPlotThemeStyles, ...props.plotThemeStyles],
});

const runtimePlotAdapter = RuntimePlot.embeddableAdapter;
if (runtimePlotAdapter === undefined) throw new Error('docs: Runtime Plot must expose an embeddable adapter');

/** docs preview 的 Plot 边界，同时覆盖 standalone 与 Layout-embedded runtime definitions */
export const PreviewPlot = Object.assign(((props: PlotProps) => <RuntimePlot {...props} />) as FC<PlotProps>, {
  displayName: 'PreviewPlot',
  isTier2Embeddable: true as const,
  embeddableAdapter: {
    ...runtimePlotAdapter,
    displayName: 'PreviewPlot',
    contribute: (props: PlotProps) => runtimePlotAdapter.contribute(withPlotThemeStyles(props)),
  } satisfies EmbeddableTier2Adapter<PlotProps>,
});

/** 只为绕过 React context 的 Layout-embedded adapter 补齐 docs Table definitions */
const withTableThemeStyles = <TProps extends { tableThemeStyles?: DetailTableProps['tableThemeStyles'] }>(
  props: TProps,
): TProps => ({
  ...props,
  tableThemeStyles:
    props.tableThemeStyles === undefined
      ? PreviewTableThemeStyles
      : [...PreviewTableThemeStyles, ...props.tableThemeStyles],
});

const previewDetailAdapter: EmbeddableTier2Adapter<DetailTableProps> = {
  ...RuntimeDetailTable.embeddableAdapter,
  displayName: 'PreviewDetailTable',
  contribute: props => RuntimeDetailTable.embeddableAdapter.contribute(withTableThemeStyles(props)),
};

/** docs preview 的 DetailTable 边界 */
export const PreviewDetailTable: EmbeddableTableComponent<DetailTableProps> = Object.assign(
  ((props: DetailTableProps) => <RuntimeDetailTable {...props} />) as FC<DetailTableProps>,
  { displayName: 'PreviewDetailTable', isTier2Embeddable: true as const, embeddableAdapter: previewDetailAdapter },
);

const previewManualAdapter: EmbeddableTier2Adapter<ManualTableProps> = {
  ...RuntimeManualTable.embeddableAdapter,
  displayName: 'PreviewManualTable',
  contribute: props => RuntimeManualTable.embeddableAdapter.contribute(withTableThemeStyles(props)),
};

/** docs preview 的 ManualTable 边界 */
export const PreviewManualTable: EmbeddableTableComponent<ManualTableProps> = Object.assign(
  ((props: ManualTableProps) => <RuntimeManualTable {...props} />) as FC<ManualTableProps>,
  { displayName: 'PreviewManualTable', isTier2Embeddable: true as const, embeddableAdapter: previewManualAdapter },
);
