import type { ReactNode } from 'react';

import type { CollectedTypedChartDeclarations } from '../../authoring';
import { collectTypedChartDeclarations } from '../../authoring';
import type { BubbleEncodingsProps } from './BubbleEncodings';
import { BubbleEncodings } from './BubbleEncodings';
import type { BubbleChartMark, BubbleMarkProps } from './BubbleMark';
import { BubbleMark } from './BubbleMark';
import type { BubblePropertiesProps } from './BubbleProperties';
import { BubbleProperties } from './BubbleProperties';

/** BubbleChart direct-child declarations 的完整收集结果 */
type CollectedBubbleChartDeclarations = CollectedTypedChartDeclarations<
  BubbleEncodingsProps,
  BubblePropertiesProps,
  BubbleChartMark
>;

/** 收集 BubbleChart 的公共与具体类型 direct-child declarations */
export const collectBubbleChartDeclarations = (children: ReactNode): CollectedBubbleChartDeclarations =>
  collectTypedChartDeclarations(children, {
    encodingsComponent: BubbleEncodings,
    encodingsName: 'BubbleEncodings',
    propertiesComponent: BubbleProperties,
    propertiesName: 'BubbleProperties',
    markComponent: BubbleMark,
    createMark: (props: BubbleMarkProps): BubbleChartMark => ({ ...props, kind: 'bubble' }),
  });
