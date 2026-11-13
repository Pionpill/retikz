import type { ReactNode } from 'react';

import type { CollectedTypedChartDeclarations } from '../../authoring';
import { collectTypedChartDeclarations } from '../../authoring';
import type { SlopeEncodingsProps } from './SlopeEncodings';
import { SlopeEncodings } from './SlopeEncodings';
import type { SlopeChartMark, SlopeMarkProps } from './SlopeMark';
import { SlopeMark } from './SlopeMark';
import type { SlopePropertiesProps } from './SlopeProperties';
import { SlopeProperties } from './SlopeProperties';

/** SlopeChart 直接子声明的收集结果 */
type CollectedSlopeChartDeclarations = CollectedTypedChartDeclarations<
  SlopeEncodingsProps,
  SlopePropertiesProps,
  SlopeChartMark
>;

/** 收集 SlopeChart 的 encodings、properties 与 mark 声明 */
export const collectSlopeChartDeclarations = (children: ReactNode): CollectedSlopeChartDeclarations =>
  collectTypedChartDeclarations(children, {
    encodingsComponent: SlopeEncodings,
    encodingsName: 'SlopeEncodings',
    propertiesComponent: SlopeProperties,
    propertiesName: 'SlopeProperties',
    markComponent: SlopeMark,
    createMark: (props: SlopeMarkProps): SlopeChartMark => ({
      ...props,
      kind: 'slope',
    }),
  });
