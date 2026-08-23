import { ThemeTokenSource } from '@retikz/core';

import type {
  SemanticTableCell,
  SemanticTableModel,
  TableCellAppearanceTracePathValue,
  TableCellPlanSource,
  TableLegendDescriptor,
} from '../../contract';
import type {
  IRTableBorder,
  IRTableCellAppearance,
  IRTableCellRule,
  IRTableCellVisualEncoding,
  IRTableFormatterRef,
  IRTablePresentationRef,
  IRTableThemeTokenBorder,
} from '../../schemas';
import type { DeepReadonly } from '../../shared';
import type {
  ResolvedTableCellPlan,
  ResolvedTablePlan,
  ResolveTableCellPlansOptions,
  TableCellAppearanceTrace,
} from './types';

import { TableCellPlanSourceKind, TableCellPlanSourceSchema, TableLegendDescriptorSchema } from '../../contract';
import { RetikzTableError } from '../../error';
import { resolveCellVisualScaleRegistry } from '../../providers';
import { resolveCellVisualScale } from '../../providers/encoding';
import {
  TableBorderSchema,
  TableCellAppearanceSchema,
  TableCellLocation,
  TableCellPayloadKind,
  TableCellRuleSchema,
  TableCellVisualEncodingSchema,
  TableFormatterRefSchema,
  TablePresentationRefSchema,
  TableVisualChannel,
} from '../../schemas';
import { deepFreeze } from '../../shared';
import { cascadeTableCellAppearance } from './cascade';
import { matchesTableCellSelector } from './match';

const DEFAULT_SOURCE = { kind: TableCellPlanSourceKind.Default } as const;
const STRUCTURE_SOURCE = { kind: TableCellPlanSourceKind.Structure } as const;

type MutableValuePlan = {
  kind: 'value';
  cellId?: string;
  formatter: IRTableFormatterRef;
  presentation: IRTablePresentationRef;
  appearance: IRTableCellAppearance;
  trace: {
    formatter: TableCellPlanSource;
    presentation: TableCellPlanSource;
    appearance: TableCellAppearanceTrace;
    matchedRuleIndices: Array<number>;
    encodingIds?: Array<string>;
  };
};

type MutableContentPlan = {
  kind: 'content';
  cellId?: string;
  appearance: IRTableCellAppearance;
  trace: { appearance: TableCellAppearanceTrace; matchedRuleIndices: Array<number> };
};

type MutablePlan = MutableValuePlan | MutableContentPlan;

type AppearanceStyleTokenKey =
  | 'cell.background.fill'
  | 'cell.background.fillOpacity'
  | 'cell.content.color'
  | 'cell.content.font.family'
  | 'cell.content.font.weight'
  | 'columnHeader.background.fill'
  | 'columnHeader.background.fillOpacity'
  | 'columnHeader.content.color'
  | 'columnHeader.content.font.family'
  | 'columnHeader.content.font.weight'
  | 'columnHeader.border.bottom';

/** 构造单个 appearance style token winner source */
const themeTokenSourceOf = (key: AppearanceStyleTokenKey, options: ResolveTableCellPlansOptions): TableCellPlanSource =>
  TableCellPlanSourceSchema.parse({
    kind: TableCellPlanSourceKind.StyleToken,
    tokenKey: key,
    tokenSource: options.tableThemeTokens?.sources[key].kind ?? ThemeTokenSource.Local,
    tokenPath: options.tableThemeTokens?.sources[key].path ?? `$default/light/${key}`,
  });

/** 把 style border token 物化为固定低优先级 Cell candidate */
const themeBorderOf = (border: DeepReadonly<IRTableThemeTokenBorder>): IRTableBorder =>
  TableBorderSchema.parse({ ...structuredClone(border), priority: -100 });

/** 从 resolved style tokens 构造 Cell appearance 与逐叶 winner */
const styleAppearanceOf = (
  cell: SemanticTableCell,
  options: ResolveTableCellPlansOptions,
): Readonly<{ appearance: IRTableCellAppearance; trace: TableCellAppearanceTrace }> => {
  const resolved = options.tableThemeTokens;
  if (resolved === undefined) return { appearance: {}, trace: {} };
  const tokens = resolved.tokens;
  const header = cell.location === TableCellLocation.ColumnHeader;
  const fillKey = header ? 'columnHeader.background.fill' : 'cell.background.fill';
  const opacityKey = header ? 'columnHeader.background.fillOpacity' : 'cell.background.fillOpacity';
  const colorKey = header ? 'columnHeader.content.color' : 'cell.content.color';
  const familyKey = header ? 'columnHeader.content.font.family' : 'cell.content.font.family';
  const weightKey = header ? 'columnHeader.content.font.weight' : 'cell.content.font.weight';
  const fill = tokens[fillKey];
  const opacity = tokens[opacityKey];
  const color = tokens[colorKey];
  const family = tokens[familyKey];
  const weight = tokens[weightKey];
  const trace: Partial<Record<TableCellAppearanceTracePathValue, TableCellPlanSource>> = {};
  const appearance: IRTableCellAppearance = {};

  if (fill !== null) {
    appearance.background = TableCellAppearanceSchema.shape.background.unwrap().parse({
      fill: structuredClone(fill),
      ...(opacity === null ? {} : { fillOpacity: opacity }),
    });
    trace['/background/fill'] = themeTokenSourceOf(fillKey, options);
    if (opacity !== null) trace['/background/fillOpacity'] = themeTokenSourceOf(opacityKey, options);
  }
  if (color !== null || family !== null || weight !== null) {
    appearance.content = {
      ...(color === null ? {} : { color }),
      ...(family === null && weight === null
        ? {}
        : {
            nodeDefault: { font: { ...(family === null ? {} : { family }), ...(weight === null ? {} : { weight }) } },
            labelDefault: {
              font: { ...(family === null ? {} : { family }), ...(weight === null ? {} : { weight }) },
            },
          }),
    };
    if (color !== null) trace['/content/color'] = themeTokenSourceOf(colorKey, options);
    if (family !== null) {
      trace['/content/nodeDefault/font/family'] = themeTokenSourceOf(familyKey, options);
      trace['/content/labelDefault/font/family'] = themeTokenSourceOf(familyKey, options);
    }
    if (weight !== null) {
      trace['/content/nodeDefault/font/weight'] = themeTokenSourceOf(weightKey, options);
      trace['/content/labelDefault/font/weight'] = themeTokenSourceOf(weightKey, options);
    }
  }
  const headerBorder = header ? tokens['columnHeader.border.bottom'] : null;
  if (headerBorder !== null) {
    appearance.borders = { bottom: themeBorderOf(headerBorder) };
    trace['/borders/bottom'] = themeTokenSourceOf('columnHeader.border.bottom', options);
  }
  return { appearance: TableCellAppearanceSchema.parse(appearance), trace };
};

/** 从 style seed 与 semantic border 构造初始 appearance */
const initialAppearanceOf = (
  cell: SemanticTableCell,
  options: ResolveTableCellPlansOptions,
): Readonly<{ appearance: IRTableCellAppearance; trace: TableCellAppearanceTrace }> => {
  const style = styleAppearanceOf(cell, options);
  if (cell.layout.borders === undefined) return deepFreeze(style);
  return cascadeTableCellAppearance(
    style.appearance,
    style.trace,
    TableCellAppearanceSchema.parse({ borders: cell.layout.borders }),
    STRUCTURE_SOURCE,
  );
};

/** 为单个 canonical Cell 建立 default / structure / style plan */
const initialPlanOf = (cell: SemanticTableCell, options: ResolveTableCellPlansOptions): MutablePlan => {
  const initial = initialAppearanceOf(cell, options);
  if (cell.payload.kind === TableCellPayloadKind.Content) {
    return {
      kind: TableCellPayloadKind.Content,
      ...(cell.id === undefined ? {} : { cellId: cell.id }),
      appearance: structuredClone(initial.appearance),
      trace: { appearance: structuredClone(initial.trace), matchedRuleIndices: [] },
    };
  }
  return {
    kind: TableCellPayloadKind.Value,
    ...(cell.id === undefined ? {} : { cellId: cell.id }),
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

/** 把一个 encoding-owned color 写入单个 value plan */
const applyEncodingColor = (plan: MutableValuePlan, encoding: IRTableCellVisualEncoding, color: string): void => {
  const source = { kind: TableCellPlanSourceKind.Encoding, encodingId: encoding.id } as const;
  if (encoding.channel === TableVisualChannel.BackgroundFill) {
    plan.appearance = TableCellAppearanceSchema.parse({
      ...structuredClone(plan.appearance),
      background: {
        fill: color,
        ...(plan.appearance.background?.fillOpacity === undefined
          ? {}
          : { fillOpacity: plan.appearance.background.fillOpacity }),
      },
    });
    plan.trace.appearance = { ...structuredClone(plan.trace.appearance), '/background/fill': source };
  } else {
    plan.appearance = TableCellAppearanceSchema.parse({
      ...structuredClone(plan.appearance),
      content: { ...structuredClone(plan.appearance.content ?? {}), color },
    });
    plan.trace.appearance = { ...structuredClone(plan.trace.appearance), '/content/color': source };
  }
  plan.trace.encodingIds ??= [];
  plan.trace.encodingIds.push(encoding.id);
};

/** 把匹配 rule 依声明顺序应用到单个 plan */
const applyRule = (plan: MutablePlan, rule: IRTableCellRule, ruleIndex: number, cellLabel: string): void => {
  plan.trace.matchedRuleIndices.push(ruleIndex);
  const source = { kind: TableCellPlanSourceKind.RootRule, ruleIndex } as const;
  if (plan.kind === TableCellPayloadKind.Content) {
    if (rule.formatter !== undefined) {
      throw new RetikzTableError(
        `table: rule ${ruleIndex} matched content Cell ${cellLabel} and cannot override formatter`,
      );
    }
    if (rule.presentation !== undefined) {
      throw new RetikzTableError(
        `table: rule ${ruleIndex} matched content Cell ${cellLabel} and cannot override presentation`,
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

/** 解析所有 canonical Cells 的 style、encoding、rule 与 descriptor */
export const resolveTableCellPlans = (
  model: SemanticTableModel,
  options: ResolveTableCellPlansOptions,
): ResolvedTablePlan => {
  const parsedRules = (options.rules ?? []).map(rule => TableCellRuleSchema.parse(structuredClone(rule)));
  const parsedEncodings = (options.encodings ?? []).map(encoding =>
    TableCellVisualEncodingSchema.parse(structuredClone(encoding)),
  );
  const registry = resolveCellVisualScaleRegistry(options.visualScaleDefinitions);
  const plans = model.cells.map(cell => initialPlanOf(cell, options));
  const legendDescriptors: Array<TableLegendDescriptor> = [];
  const encodingSummaries = parsedEncodings.map(encoding => {
    const selected = model.cells.flatMap((cell, index) =>
      cell.payload.kind === TableCellPayloadKind.Value &&
      cell.payload.value !== null &&
      matchesTableCellSelector(cell, encoding.selector)
        ? [{ cell, index, value: cell.payload.value }]
        : [],
    );
    const resolution = resolveCellVisualScale({
      ref: encoding.scale,
      values: selected.map(candidate => candidate.value),
      context: options.scaleContext,
      registry,
    });
    const cellIndices: Array<number> = [];
    if (resolution !== undefined) {
      selected.forEach(candidate => {
        const color = resolution.of(candidate.value);
        if (color === undefined) return;
        const plan = plans[candidate.index];
        if (plan.kind !== TableCellPayloadKind.Value)
          throw new RetikzTableError('table: internal encoding candidate kind differs');
        applyEncodingColor(plan, encoding, color);
        cellIndices.push(candidate.index);
      });
      if (typeof encoding.legend === 'object') {
        legendDescriptors.push(
          TableLegendDescriptorSchema.parse({
            encodingId: encoding.id,
            channel: encoding.channel,
            scaleName: encoding.scale.name,
            ...(encoding.legend.title === undefined ? {} : { title: encoding.legend.title }),
            form: resolution.legendForm,
            domain: resolution.domain,
            range: resolution.range,
            ...(resolution.edges === undefined ? {} : { edges: resolution.edges }),
          }),
        );
      }
    }
    return { id: encoding.id, channel: encoding.channel, scaleName: encoding.scale.name, cellIndices };
  });
  parsedRules.forEach((rule, ruleIndex) => {
    model.cells.forEach((cell, cellIndex) => {
      if (matchesTableCellSelector(cell, rule.selector)) {
        const cellLabel = cell.id === undefined ? `${cell.rowIndex}:${cell.columnIndex}` : `"${cell.id}"`;
        applyRule(plans[cellIndex], rule, ruleIndex, cellLabel);
      }
    });
  });
  return deepFreeze({
    cells: plans satisfies Array<ResolvedTableCellPlan>,
    legendDescriptors,
    encodings: encodingSummaries,
  });
};
