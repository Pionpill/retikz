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
export const chartSourceOf = <TRoot extends { coordinate?: InputChartCoordinate }, const TFields extends object>(
  input: InputChartPresentation,
  root: TRoot,
  sourceFields: TFields,
) => {
  const { title, subtitle, note, source } = input;
  const { coordinate: coordinateInput, ...sourceRoot } = root;
  const normalizedPresentation = normalizeChartPresentation({ title, subtitle, note, source });
  const coordinate = normalizeChartCoordinate(coordinateInput);
  return {
    namespace: CHART_NAMESPACE,
    ...(normalizedPresentation === undefined ? {} : { presentation: normalizedPresentation }),
    ...sourceRoot,
    ...(coordinate === undefined ? {} : { coordinate }),
    ...sourceFields,
  };
};
