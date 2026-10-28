import { TableCellPayloadKind } from '../../schemas';
import { deepFreeze } from '../../shared';
import type { InputTableCellPresentation } from '../presentation';
import type { TableCellPlanResolution } from './types';

/** 把 resolved Cell plans 按 canonical 顺序投影为 Presentation 阶段 carrier */
export const presentationInputsOfTableCellPlans = (
  plans: ReadonlyArray<TableCellPlanResolution>,
): ReadonlyArray<InputTableCellPresentation> =>
  deepFreeze(
    plans.map(plan =>
      plan.kind === TableCellPayloadKind.Value
        ? {
            kind: plan.kind,
            ...(plan.cellId === undefined ? {} : { cellId: plan.cellId }),
            presentation: structuredClone(plan.presentation),
            appearance: plan.appearance,
          }
        : {
            kind: plan.kind,
            ...(plan.cellId === undefined ? {} : { cellId: plan.cellId }),
            appearance: plan.appearance,
          },
    ),
  );
