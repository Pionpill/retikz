import type { ResolvedTableCellPresentationInput } from '../presentation';
import type { ResolvedTableCellPlan } from './types';

import { TableCellPayloadKind, TablePresentationRefSchema } from '../../schemas';
import { deepFreeze } from '../../shared';

/** 把 resolved Cell plans 投影为 Presentation 阶段的严格 carrier */
export const presentationInputsOfTableCellPlans = (
  plans: ReadonlyArray<ResolvedTableCellPlan>,
): ReadonlyArray<ResolvedTableCellPresentationInput> =>
  deepFreeze(
    plans.map(plan =>
      plan.kind === TableCellPayloadKind.Value
        ? {
            kind: plan.kind,
            cellId: plan.cellId,
            presentation: TablePresentationRefSchema.parse(plan.presentation),
            appearance: plan.appearance,
          }
        : { kind: plan.kind, cellId: plan.cellId, appearance: plan.appearance },
    ),
  );
