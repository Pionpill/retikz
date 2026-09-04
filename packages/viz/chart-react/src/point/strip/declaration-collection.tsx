import type { ReactNode } from 'react';

import type { CollectedPointChartDeclarations } from '../shared';
import type { StripEncodingsProps } from './StripEncodings';
import type { StripChartMark, StripMarkProps } from './StripMark';
import type { StripPropertiesProps } from './StripProperties';

import { collectPointChartDeclarations } from '../shared';
import { StripEncodings } from './StripEncodings';
import { StripMark } from './StripMark';
import { StripProperties } from './StripProperties';

/** StripChart direct-child declarations 的完整收集结果 */
export type CollectedStripChartDeclarations = CollectedPointChartDeclarations<
  StripEncodingsProps,
  StripPropertiesProps,
  StripChartMark
>;

/** 收集 StripChart 的公共与具体类型 direct-child declarations */
export const collectStripChartDeclarations = (children: ReactNode): CollectedStripChartDeclarations => {
  return collectPointChartDeclarations(children, {
    encodingsComponent: StripEncodings,
    encodingsName: 'StripEncodings',
    propertiesComponent: StripProperties,
    propertiesName: 'StripProperties',
    markComponent: StripMark,
    createMark: (props: StripMarkProps): StripChartMark => ({ ...props, kind: 'strip' }),
  });
};
