import type { ReactNode } from 'react';

import type { CollectedPointChartDeclarations } from '../shared';
import type { RegressionEncodingsProps } from './RegressionEncodings';
import type { RegressionChartMark, RegressionMarkProps } from './RegressionMark';
import type { RegressionPropertiesProps } from './RegressionProperties';

import { collectPointChartDeclarations } from '../shared';
import { RegressionEncodings } from './RegressionEncodings';
import { RegressionMark } from './RegressionMark';
import { RegressionProperties } from './RegressionProperties';

/** RegressionChart direct-child declarations 的完整收集结果 */
export type CollectedRegressionChartDeclarations = CollectedPointChartDeclarations<
  RegressionEncodingsProps,
  RegressionPropertiesProps,
  RegressionChartMark
>;

/** 收集 RegressionChart 的公共与具体类型 direct-child declarations */
export const collectRegressionChartDeclarations = (children: ReactNode): CollectedRegressionChartDeclarations =>
  collectPointChartDeclarations(children, {
    encodingsComponent: RegressionEncodings,
    encodingsName: 'RegressionEncodings',
    propertiesComponent: RegressionProperties,
    propertiesName: 'RegressionProperties',
    markComponent: RegressionMark,
    createMark: (props: RegressionMarkProps): RegressionChartMark => ({ ...props, kind: 'regression' }),
  });
