import type { ReactNode } from 'react';

import type { CollectedPointChartDeclarations } from '../shared';
import type { ScatterEncodingsProps } from './ScatterEncodings';
import type { ScatterChartMark, ScatterMarkProps } from './ScatterMark';
import type { ScatterPropertiesProps } from './ScatterProperties';

import { collectPointChartDeclarations } from '../shared';
import { ScatterEncodings } from './ScatterEncodings';
import { ScatterMark } from './ScatterMark';
import { ScatterProperties } from './ScatterProperties';

/** ScatterChart direct-child declarations 的完整收集结果 */
export type CollectedScatterChartDeclarations = CollectedPointChartDeclarations<
  ScatterEncodingsProps,
  ScatterPropertiesProps,
  ScatterChartMark
>;

/** 收集 ScatterChart 的公共与具体类型 direct-child declarations */
export const collectScatterChartDeclarations = (children: ReactNode): CollectedScatterChartDeclarations => {
  return collectPointChartDeclarations(children, {
    encodingsComponent: ScatterEncodings,
    encodingsName: 'ScatterEncodings',
    propertiesComponent: ScatterProperties,
    propertiesName: 'ScatterProperties',
    markComponent: ScatterMark,
    createMark: (props: ScatterMarkProps): ScatterChartMark => ({ ...props, kind: 'scatter' }),
  });
};
