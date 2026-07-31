import type {
  SemanticTableCell,
  SemanticTableModel,
  TableCellAppearanceTracePathValue,
  TableCellPlanSource,
} from '../../contract';
import type {
  IRTableCellAppearance,
  IRTableCellRule,
  IRTableFormatterRef,
  IRTablePresentationRef,
} from '../../schemas';
import type { ResolvedTableCellPlan, TableCellAppearanceTrace } from './types';

import { TableCellAppearanceTracePathSchema, TableCellPlanSourceKind } from '../../contract';
import {
  TableCellAppearanceSchema,
  TableCellPayloadKind,
  TableCellRuleSchema,
  TableFormatterRefSchema,
  TablePresentationRefSchema,
} from '../../schemas';
import { deepFreeze } from '../../shared';
import { cascadeTableCellAppearance } from './cascade';
import { matchesTableCellSelector } from './match';

const DEFAULT_SOURCE = { kind: TableCellPlanSourceKind.Default } as const;
const STRUCTURE_SOURCE = { kind: TableCellPlanSourceKind.Structure } as const;
const BORDER_SIDES = ['top', 'right', 'bottom', 'left'] as const;

type MutableValuePlan = {
  kind: 'value';
  cellId: string;
  formatter: IRTableFormatterRef;
  presentation: IRTablePresentationRef;
  appearance: IRTableCellAppearance;
  trace: {
    formatter: TableCellPlanSource;
    presentation: TableCellPlanSource;
    appearance: TableCellAppearanceTrace;
    matchedRuleIndices: Array<number>;
  };
};

type MutableContentPlan = {
  kind: 'content';
  cellId: string;
  appearance: IRTableCellAppearance;
  trace: { appearance: TableCellAppearanceTrace; matchedRuleIndices: Array<number> };
};

type MutablePlan = MutableValuePlan | MutableContentPlan;

/** 从 semantic border seed 构造初始 appearance 与 structure trace */
const initialAppearanceOf = (
  cell: SemanticTableCell,
): Readonly<{ appearance: IRTableCellAppearance; trace: TableCellAppearanceTrace }> => {
  if (cell.layout.borders === undefined) return { appearance: {}, trace: {} };
  const trace: Partial<Record<TableCellAppearanceTracePathValue, TableCellPlanSource>> = {};
  BORDER_SIDES.forEach(side => {
    if (cell.layout.borders?.[side] !== undefined) {
      trace[TableCellAppearanceTracePathSchema.parse(`/borders/${side}`)] = STRUCTURE_SOURCE;
    }
  });
  const appearance = TableCellAppearanceSchema.parse({ borders: cell.layout.borders });
  return deepFreeze({ appearance, trace }) satisfies Readonly<{
    appearance: IRTableCellAppearance;
    trace: TableCellAppearanceTrace;
  }>;
};

/** 为单个 canonical Cell 建立 default / structure plan */
const initialPlanOf = (cell: SemanticTableCell): MutablePlan => {
  const initial = initialAppearanceOf(cell);
  if (cell.payload.kind === TableCellPayloadKind.Content) {
    return {
      kind: TableCellPayloadKind.Content,
      cellId: cell.id,
      appearance: structuredClone(initial.appearance),
      trace: { appearance: structuredClone(initial.trace), matchedRuleIndices: [] },
    };
  }
  return {
    kind: TableCellPayloadKind.Value,
    cellId: cell.id,
    formatter: TableFormatterRefSchema.parse(cell.payload.formatter ?? { name: 'identity' }),
    presentation: TablePresentationRefSchema.parse(cell.payload.presentation ?? { name: 'text' }),
    appearance: structuredClone(initial.appearance),
    trace: {
      formatter: cell.payload.formatter === undefined ? DEFAULT_SOURCE : STRUCTURE_SOURCE,
      presentation: cell.payload.presentation === undefined ? DEFAULT_SOURCE : STRUCTURE_SOURCE,
      appearance: structuredClone(initial.trace),
      matchedRuleIndices: [],
    },
  };
};

/** 把匹配 rule 依声明顺序应用到单个 plan */
const applyRule = (plan: MutablePlan, rule: IRTableCellRule, ruleIndex: number): void => {
  plan.trace.matchedRuleIndices.push(ruleIndex);
  const source = { kind: TableCellPlanSourceKind.RootRule, ruleIndex } as const;
  if (plan.kind === TableCellPayloadKind.Content) {
    if (rule.formatter !== undefined) {
      throw new Error(`table: rule ${ruleIndex} matched content Cell "${plan.cellId}" and cannot override formatter`);
    }
    if (rule.presentation !== undefined) {
      throw new Error(
        `table: rule ${ruleIndex} matched content Cell "${plan.cellId}" and cannot override presentation`,
      );
    }
  } else {
    if (rule.formatter !== undefined) {
      plan.formatter = structuredClone(rule.formatter);
      plan.trace.formatter = source;
    }
    if (rule.presentation !== undefined) {
      plan.presentation = structuredClone(rule.presentation);
      plan.trace.presentation = source;
    }
  }
  if (rule.appearance !== undefined) {
    const cascaded = cascadeTableCellAppearance(plan.appearance, plan.trace.appearance, rule.appearance, source);
    plan.appearance = structuredClone(cascaded.appearance);
    plan.trace.appearance = structuredClone(cascaded.trace);
  }
};

/** 解析所有 canonical Cells 的 formatter、presentation、appearance 与 winner trace */
export const resolveTableCellPlans = (
  model: SemanticTableModel,
  rules: ReadonlyArray<IRTableCellRule> = [],
): ReadonlyArray<ResolvedTableCellPlan> => {
  const parsedRules = rules.map(rule => TableCellRuleSchema.parse(structuredClone(rule)));
  const plans = model.cells.map(initialPlanOf);
  parsedRules.forEach((rule, ruleIndex) => {
    model.cells.forEach((cell, cellIndex) => {
      if (matchesTableCellSelector(cell, rule.selector)) applyRule(plans[cellIndex], rule, ruleIndex);
    });
  });
  return deepFreeze(plans satisfies Array<ResolvedTableCellPlan>);
};
