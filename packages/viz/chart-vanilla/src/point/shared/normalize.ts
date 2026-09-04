import { CHART_NAMESPACE } from '@retikz/chart';

import type { InputChartCoordinate, InputChartPresentation } from '../../normalize/chart';

import { normalizeChartCoordinate, normalizeChartPresentation } from '../../normalize/chart';

type PointPartitionEncodings = Readonly<{
  row?: unknown;
  column?: unknown;
}>;

/** 展开 Point chartType 共用的 row / column 字段名 shorthand */
export const normalizePointPartitionEncodings = <TEncodings extends PointPartitionEncodings>(
  encodings: TEncodings,
) => ({
  ...encodings,
  ...(typeof encodings.row === 'string' ? { row: { field: encodings.row } } : {}),
  ...(typeof encodings.column === 'string' ? { column: { field: encodings.column } } : {}),
});

/** 组装 concrete chartType 共用的 Chart Source 外壳 */
export const chartSourceOf = (
  input: InputChartPresentation,
  root: Record<string, unknown> & { coordinate?: InputChartCoordinate },
  sourceFields: Record<string, unknown>,
): Record<string, unknown> => {
  const { title, subtitle, note, source } = input;
  const normalizedPresentation = normalizeChartPresentation({ title, subtitle, note, source });
  const coordinate = normalizeChartCoordinate(root.coordinate);
  return {
    namespace: CHART_NAMESPACE,
    ...(normalizedPresentation === undefined ? {} : { presentation: normalizedPresentation }),
    ...root,
    ...(coordinate === undefined ? {} : { coordinate }),
    ...sourceFields,
  };
};
