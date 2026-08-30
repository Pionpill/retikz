import type { IRConnectedScatterChart } from '@retikz/chart/point/connected-scatter';
import type { FC } from 'react';
type MarkOf<T extends { recipe: { marks?: ReadonlyArray<unknown> } }> = NonNullable<T['recipe']['marks']>[number];
export type ConnectedScatterChartMark = Extract<MarkOf<IRConnectedScatterChart>, { kind: 'connected-scatter' }>;
export type ConnectedScatterMarkProps = Omit<ConnectedScatterChartMark, 'kind'>;
export const ConnectedScatterMark: FC<ConnectedScatterMarkProps> = () => null;
ConnectedScatterMark.displayName = 'ConnectedScatterMark';
