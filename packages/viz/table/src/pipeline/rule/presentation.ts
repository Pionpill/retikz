import type { ResolvedTableCellPresentationInput } from '../presentation';
import type { ResolvedTableCellPlan } from './types';

import { TableCellPayloadKind, TablePresentationRefSchema } from '../../schemas';
import { deepFreeze } from '../../shared';

/** 把 resolved Cell plans 按 canonical 顺序投影为 Presentation 阶段 carrier */
export const presentationInputsOfTableCellPlans = (
  plans: ReadonlyArray<ResolvedTableCellPlan>,
): ReadonlyArray<ResolvedTableCellPresentationInput> =>
  deepFreeze(
    plans.map(plan =>
      plan.kind === TableCellPayloadKind.Value
        ? {
            kind: plan.kind,
            ...(plan.cellId === undefined ? {} : { cellId: plan.cellId }),
            presentation: TablePresentationRefSchema.parse(plan.presentation),
            appearance: plan.appearance,
          }
        : {
            kind: plan.kind,
            ...(plan.cellId === undefined ? {} : { cellId: plan.cellId }),
            appearance: plan.appearance,
          },
    ),
  );
