import type { ReactNode } from 'react';

import type { CollectedTypedChartDeclarations } from '../../authoring';
import { collectTypedChartDeclarations } from '../../authoring';
import type { ConnectedScatterEncodingsProps } from './ConnectedScatterEncodings';
import { ConnectedScatterEncodings } from './ConnectedScatterEncodings';
import type { ConnectedScatterChartMark, ConnectedScatterMarkProps } from './ConnectedScatterMark';
import { ConnectedScatterMark } from './ConnectedScatterMark';
import type { ConnectedScatterPropertiesProps } from './ConnectedScatterProperties';
import { ConnectedScatterProperties } from './ConnectedScatterProperties';

/** ConnectedScatterChart 直接子声明的收集结果 */
type CollectedConnectedScatterChartDeclarations = CollectedTypedChartDeclarations<
  ConnectedScatterEncodingsProps,
  ConnectedScatterPropertiesProps,
  ConnectedScatterChartMark
>;

/** 收集 ConnectedScatterChart 的 encodings、properties 与 mark 声明 */
export const collectConnectedScatterChartDeclarations = (
  children: ReactNode,
): CollectedConnectedScatterChartDeclarations =>
  collectTypedChartDeclarations(children, {
    encodingsComponent: ConnectedScatterEncodings,
    encodingsName: 'ConnectedScatterEncodings',
    propertiesComponent: ConnectedScatterProperties,
    propertiesName: 'ConnectedScatterProperties',
    markComponent: ConnectedScatterMark,
    createMark: (props: ConnectedScatterMarkProps): ConnectedScatterChartMark => ({
      ...props,
      kind: 'connected-scatter',
    }),
  });
