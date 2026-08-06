import type { IRPlotSpec } from '@retikz/plot';

import { JsonObjectSchema } from '@retikz/core';

import type { InternalChartSpecBound } from '../families/shared';
import type { IRChartPresentationInspection } from '../presentation';
import type { ResolvedChartStyleContext } from '../style';
import type { ChartInspectionMemberInput, IRChartInspection } from './schema';

import { ChartInspectionMemberKind, ChartInspectionSchema } from './schema';

const valueAtPath = (root: unknown, path: ReadonlyArray<string | number>): unknown => {
  let value = root;
  for (const part of path) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) {
      throw new Error(`Chart inspection path does not exist: ${JSON.stringify(path)}`);
    }
    value = (value as Record<string | number, unknown>)[part];
  }
  return value;
};

/** 按最终 Plot collection 顺序排列 active members */
const orderedMembers = (members: ReadonlyArray<ChartInspectionMemberInput>): Array<ChartInspectionMemberInput> => [
  ...members.filter(member => member.kind === ChartInspectionMemberKind.Transform),
  ...members.filter(member => member.kind === ChartInspectionMemberKind.Scale),
  ...members.filter(member => member.kind === ChartInspectionMemberKind.Coordinate),
  ...members.filter(member => member.kind === ChartInspectionMemberKind.Composition),
  ...members.filter(member => member.kind === ChartInspectionMemberKind.Mark),
  ...members.filter(member => member.kind === ChartInspectionMemberKind.Guide),
];

/** 从最终 PlotSpec 与中立 member records 建立 inspection */
export const createChartInspection = (
  spec: InternalChartSpecBound,
  plotSpec: IRPlotSpec,
  members: ReadonlyArray<ChartInspectionMemberInput>,
  style: ResolvedChartStyleContext,
  presentation: IRChartPresentationInspection,
): IRChartInspection => {
  const finalMembers = orderedMembers(members).map(member => {
    const value = JsonObjectSchema.parse(valueAtPath(plotSpec, member.plotPath));
    if (JSON.stringify(value) !== JSON.stringify(member.value)) {
      throw new Error(`Chart inspection member "${member.target}" does not match its final Plot path`);
    }
    return {
      target: member.target,
      kind: member.kind,
      ...(typeof value.id === 'string' ? { id: value.id } : {}),
      core: member.core,
      value,
      sources: member.sources,
    };
  });
  return ChartInspectionSchema.parse({
    chart: { type: spec.type, ...(spec.id === undefined ? {} : { id: spec.id }) },
    plot: { ...(plotSpec.id === undefined ? {} : { id: plotSpec.id }) },
    style: {
      preset: style.style,
      mode: style.themeMode,
      tokens: style.tokens,
      tokenSources: style.tokenSources,
      authoredOverrides: style.authoredOverrides,
    },
    presentation,
    members: finalMembers,
  });
};
