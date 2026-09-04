import type { ReactNode } from 'react';

import type { CollectedPointChartDeclarations } from '../shared';
import type { BubbleEncodingsProps } from './BubbleEncodings';
import type { BubbleChartMark, BubbleMarkProps } from './BubbleMark';
import type { BubblePropertiesProps } from './BubbleProperties';

import { collectPointChartDeclarations } from '../shared';
import { BubbleEncodings } from './BubbleEncodings';
import { BubbleMark } from './BubbleMark';
import { BubbleProperties } from './BubbleProperties';

/** BubbleChart direct-child declarations 的完整收集结果 */
export type CollectedBubbleChartDeclarations = CollectedPointChartDeclarations<
  BubbleEncodingsProps,
  BubblePropertiesProps,
  BubbleChartMark
>;

/** 收集 BubbleChart 的公共与具体类型 direct-child declarations */
export const collectBubbleChartDeclarations = (children: ReactNode): CollectedBubbleChartDeclarations =>
  collectPointChartDeclarations(children, {
    encodingsComponent: BubbleEncodings,
    encodingsName: 'BubbleEncodings',
    propertiesComponent: BubbleProperties,
    propertiesName: 'BubbleProperties',
    markComponent: BubbleMark,
    createMark: (props: BubbleMarkProps): BubbleChartMark => ({ ...props, kind: 'bubble' }),
  });
