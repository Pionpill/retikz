import type { IRRangedDotChart } from '@retikz/chart/point/ranged-dot';
import type { FC } from 'react';
type MarkOf<T extends { recipe: { marks?: ReadonlyArray<unknown> } }> = NonNullable<T['recipe']['marks']>[number];
export type RangedDotChartMark = Extract<MarkOf<IRRangedDotChart>, { kind: 'ranged-dot' }>;
export type RangedDotMarkProps = Omit<RangedDotChartMark, 'kind'>;
export const RangedDotMark: FC<RangedDotMarkProps> = () => null;
RangedDotMark.displayName = 'RangedDotMark';
