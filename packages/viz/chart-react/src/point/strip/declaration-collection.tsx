import type { ReactNode } from 'react';

import type { CollectedTypedChartDeclarations } from '../../authoring';
import { collectTypedChartDeclarations } from '../../authoring';
import type { StripEncodingsProps } from './StripEncodings';
import { StripEncodings } from './StripEncodings';
import type { StripChartMark, StripMarkProps } from './StripMark';
import { StripMark } from './StripMark';
import type { StripPropertiesProps } from './StripProperties';
import { StripProperties } from './StripProperties';

/** StripChart direct-child declarations 的完整收集结果 */
type CollectedStripChartDeclarations = CollectedTypedChartDeclarations<
  StripEncodingsProps,
  StripPropertiesProps,
  StripChartMark
>;

/** 收集 StripChart 的公共与具体类型 direct-child declarations */
export const collectStripChartDeclarations = (children: ReactNode): CollectedStripChartDeclarations => {
  return collectTypedChartDeclarations(children, {
    encodingsComponent: StripEncodings,
    encodingsName: 'StripEncodings',
    propertiesComponent: StripProperties,
    propertiesName: 'StripProperties',
    markComponent: StripMark,
    createMark: (props: StripMarkProps): StripChartMark => ({ ...props, kind: 'strip' }),
  });
};
