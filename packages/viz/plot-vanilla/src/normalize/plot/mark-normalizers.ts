import type { ExternalRow } from '@retikz/data';

import { RetikzPlotVanillaError } from '../../error';
import type { NormalizationState } from './contracts';

type Collected = NormalizationState;

/** 收集某 mark 的运行时 resolveLabel；仅在配置 mark id 时按 id 注册，且不会进入 IR */
export const recordResolveLabel = (
  into: Collected,
  id: string | undefined,
  resolveLabel: ((row: ExternalRow) => string) | undefined,
): void => {
  if (resolveLabel === undefined) return;
  if (id === undefined) {
    throw new RetikzPlotVanillaError(
      'buildPlotIR: resolveLabel needs a mark id to be injected at runtime; set the mark id prop',
    );
  }

  into.resolveLabels[id] = resolveLabel;
};
