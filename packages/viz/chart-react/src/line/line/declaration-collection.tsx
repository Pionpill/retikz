import type { ReactNode } from 'react';

import type { CollectedTypedChartDeclarations } from '../../authoring';
import { collectTypedChartDeclarations } from '../../authoring';
import type { LineEncodingsProps } from './LineEncodings';
import { LineEncodings } from './LineEncodings';
import type { LineChartMark, LineMarkProps } from './LineMark';
import { LineMark } from './LineMark';
import type { LinePropertiesProps } from './LineProperties';
import { LineProperties } from './LineProperties';

/** LineChart 直接子声明的收集结果 */
type CollectedLineChartDeclarations = CollectedTypedChartDeclarations<
  LineEncodingsProps,
  LinePropertiesProps,
  LineChartMark
>;

/** 收集 LineChart 的 encodings、properties 与 mark 声明 */
export const collectLineChartDeclarations = (children: ReactNode): CollectedLineChartDeclarations =>
  collectTypedChartDeclarations(children, {
    encodingsComponent: LineEncodings,
    encodingsName: 'LineEncodings',
    propertiesComponent: LineProperties,
    propertiesName: 'LineProperties',
    markComponent: LineMark,
    createMark: (props: LineMarkProps): LineChartMark => ({
      ...props,
      kind: 'line',
    }),
  });
