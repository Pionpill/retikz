import type { ReactNode } from 'react';

import type { CollectedPointChartDeclarations } from '../shared';
import type { ConnectedScatterEncodingsProps } from './ConnectedScatterEncodings';
import type { ConnectedScatterChartMark, ConnectedScatterMarkProps } from './ConnectedScatterMark';
import type { ConnectedScatterPropertiesProps } from './ConnectedScatterProperties';

import { collectPointChartDeclarations } from '../shared';
import { ConnectedScatterEncodings } from './ConnectedScatterEncodings';
import { ConnectedScatterMark } from './ConnectedScatterMark';
import { ConnectedScatterProperties } from './ConnectedScatterProperties';

export type CollectedConnectedScatterChartDeclarations = CollectedPointChartDeclarations<
  ConnectedScatterEncodingsProps,
  ConnectedScatterPropertiesProps,
  ConnectedScatterChartMark
>;
export const collectConnectedScatterChartDeclarations = (
  children: ReactNode,
): CollectedConnectedScatterChartDeclarations =>
  collectPointChartDeclarations(children, {
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
