import type { ReactNode } from 'react';

import type { CollectedPointChartDeclarations } from '../shared';
import type { RangedDotEncodingsProps } from './RangedDotEncodings';
import type { RangedDotChartMark, RangedDotMarkProps } from './RangedDotMark';
import type { RangedDotPropertiesProps } from './RangedDotProperties';

import { collectPointChartDeclarations } from '../shared';
import { RangedDotEncodings } from './RangedDotEncodings';
import { RangedDotMark } from './RangedDotMark';
import { RangedDotProperties } from './RangedDotProperties';

/** RangedDotChart 直接子声明的收集结果 */
export type CollectedRangedDotChartDeclarations = CollectedPointChartDeclarations<
  RangedDotEncodingsProps,
  RangedDotPropertiesProps,
  RangedDotChartMark
>;

/** 收集 RangedDotChart 的 encodings、properties 与 mark 声明 */
export const collectRangedDotChartDeclarations = (children: ReactNode): CollectedRangedDotChartDeclarations =>
  collectPointChartDeclarations(children, {
    encodingsComponent: RangedDotEncodings,
    encodingsName: 'RangedDotEncodings',
    propertiesComponent: RangedDotProperties,
    propertiesName: 'RangedDotProperties',
    markComponent: RangedDotMark,
    createMark: (props: RangedDotMarkProps): RangedDotChartMark => ({ ...props, kind: 'ranged-dot' }),
  });
