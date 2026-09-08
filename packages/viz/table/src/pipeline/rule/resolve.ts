import type {
  SemanticTableCell,
  SemanticTableModel,
  TableCellAppearanceTracePathValue,
  TableCellPlanSource,
  TableLegendDescriptor,
} from '../../contract';
import type {
  IRTableCellAppearance,
  IRTableCellRule,
  IRTableCellVisualEncoding,
  IRTableFormatterRef,
  IRTablePresentationRef,
} from '../../schemas';
import type {
  ResolvedTableCellPlan,
  ResolvedTablePlan,
  ResolveTableCellPlansOptions,
  TableCellAppearanceTrace,
} from './types';

import {
  TableCellAppearanceTracePathSchema,
  TableCellPlanSourceKind,
  TableCellPlanSourceSchema,
  TableLegendDescriptorSchema,
} from '../../contract';
import { RetikzTableError } from '../../error';
import { resolveCellVisualScaleRegistry } from '../../providers';
import { resolveCellVisualScale } from '../../providers/encoding';
import {
  TableCellAppearanceSchema,
  TableCellContentStyleSchema,
  TableCellFormatter,
  TableCellLocation,
  TableCellPayloadKind,
  TableCellPresentation,
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

const hasOwnPath = (value: unknown, path: ReadonlyArray<string>): boolean => {
  let current: unknown = value;
  for (const segment of path) {
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, segment)) return false;
    current = Reflect.get(current, segment);
  }
  return current !== undefined;
};

/** 找到某个 defaults Source 字段最终采用的来源层 */
const defaultsSourceOf = (options: ResolveTableCellPlansOptions, path: ReadonlyArray<string>): TableCellPlanSource => {
  const layers = options.tableDefaults?.layers ?? [];
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];
    if (layer.defaults !== undefined && hasOwnPath(layer.defaults, path)) {
      return TableCellPlanSourceSchema.parse({ kind: TableCellPlanSourceKind.Defaults, path: layer.path });
    }
  }
  return DEFAULT_SOURCE;
};

/** 将 defaults appearance 的具体叶写入 trace */
const traceAppearanceLeaves = (
  value: unknown,
  appearancePath: ReadonlyArray<string>,
  defaultsPath: ReadonlyArray<string>,
  options: ResolveTableCellPlansOptions,
  trace: Partial<Record<TableCellAppearanceTracePathValue, TableCellPlanSource>>,
): void => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    const path = '/' + appearancePath.join('/');
    const parsedPath = TableCellAppearanceTracePathSchema.safeParse(path);
    if (parsedPath.success) trace[parsedPath.data] = defaultsSourceOf(options, defaultsPath);
    return;
  }
  Object.entries(value).forEach(([key, child]) =>
    traceAppearanceLeaves(child, [...appearancePath, key], [...defaultsPath, key], options, trace),
  );
};

/** 从 resolved Table defaults 构造 Cell appearance 与逐叶 winner */
const styleAppearanceOf = (
  cell: SemanticTableCell,
  options: ResolveTableCellPlansOptions,
): Readonly<{ appearance: IRTableCellAppearance; trace: TableCellAppearanceTrace }> => {
  const location = cell.location === TableCellLocation.ColumnHeader ? 'columnHeader' : 'body';
  const defaults = options.tableDefaults?.defaults.appearanceDefaults?.[location];
  const trace: Partial<Record<TableCellAppearanceTracePathValue, TableCellPlanSource>> = {};
  const appearance: IRTableCellAppearance = {};

  if (defaults?.background?.fill !== undefined) {
    appearance.background = TableCellAppearanceSchema.shape.background.unwrap().parse({
      fill: defaults.background.fill,
      fillOpacity: defaults.background.fillOpacity ?? 1,
    });
  }
  if (defaults?.content !== undefined) {
    appearance.content = TableCellContentStyleSchema.parse(defaults.content);
  }
  if (defaults?.borders !== undefined) {
    appearance.borders = TableCellAppearanceSchema.shape.borders.unwrap().parse(defaults.borders);
  }
  if (appearance.background !== undefined)
    traceAppearanceLeaves(
      appearance.background,
      ['background'],
      ['appearanceDefaults', location, 'background'],
      options,
      trace,
    );
  if (defaults?.background?.fillOpacity === undefined) {
    delete trace['/background/fillOpacity'];
  }
  if (appearance.content !== undefined)
    traceAppearanceLeaves(appearance.content, ['content'], ['appearanceDefaults', location, 'content'], options, trace);
  if (appearance.borders !== undefined)
    Object.keys(appearance.borders).forEach(side => {
      const path = `/${['borders', side].join('/')}`;
      const parsedPath = TableCellAppearanceTracePathSchema.safeParse(path);
      if (parsedPath.success) {
        trace[parsedPath.data] = defaultsSourceOf(options, ['appearanceDefaults', location, 'borders', side]);
      }
    });
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
    formatter: TableFormatterRefSchema.parse(cell.payload.formatter ?? { name: TableCellFormatter.Identity }),
    presentation: TablePresentationRefSchema.parse(cell.payload.presentation ?? { name: TableCellPresentation.Text }),
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
      ...plan.appearance,
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
      ...plan.appearance,
      content: { ...plan.appearance.content, style: { ...plan.appearance.content?.style, color } },
    });
    plan.trace.appearance = { ...structuredClone(plan.trace.appearance), '/content/style/color': source };
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
  const parsedRules = options.rules ?? [];
  const parsedEncodings = options.encodings ?? [];
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
