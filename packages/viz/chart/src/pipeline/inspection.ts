import type { IRJsonObject } from '@retikz/core';
import type { IRPlotSpec } from '@retikz/plot';

import { JsonObjectSchema } from '@retikz/core';

import type { InternalChartSpecBound } from '../providers';
import type { IRChartInspection } from '../schemas';
import type { MergedChartMember } from './merge';

import { ChartInspectionMemberKind, ChartInspectionSchema } from '../schemas';

/** 按 Plot collection 顺序提取最终成员的 JSON-safe 值 */
const normalizedValues = (plotSpec: IRPlotSpec): Array<IRJsonObject> => [
  ...(plotSpec.transform ?? []).map(value => JsonObjectSchema.parse(value)),
  ...plotSpec.scales.map(value => JsonObjectSchema.parse(value)),
  ...(plotSpec.coordinate === undefined ? [] : [JsonObjectSchema.parse(plotSpec.coordinate)]),
  ...(plotSpec.composition === undefined ? [] : [JsonObjectSchema.parse(plotSpec.composition)]),
  ...plotSpec.marks.map(value => JsonObjectSchema.parse(value)),
  ...(plotSpec.guides ?? []).map(value => JsonObjectSchema.parse(value)),
];

/** 按 normalized PlotSpec 的 collection 顺序排列 active members */
const orderedMembers = (members: ReadonlyArray<MergedChartMember>): Array<MergedChartMember> => [
  ...members.filter(member => member.kind === ChartInspectionMemberKind.Transform),
  ...members.filter(member => member.kind === ChartInspectionMemberKind.Scale),
  ...members.filter(member => member.kind === ChartInspectionMemberKind.Coordinate),
  ...members.filter(member => member.kind === ChartInspectionMemberKind.Composition),
  ...members.filter(member => member.kind === ChartInspectionMemberKind.Mark),
  ...members.filter(member => member.kind === ChartInspectionMemberKind.Guide),
];

/** 从 normalized PlotSpec 与 active member records 建立 inspection */
export const createChartInspection = (
  spec: InternalChartSpecBound,
  plotSpec: IRPlotSpec,
  members: ReadonlyArray<MergedChartMember>,
): IRChartInspection => {
  const values = normalizedValues(plotSpec);
  return ChartInspectionSchema.parse({
    chart: { type: spec.type, ...(spec.id === undefined ? {} : { id: spec.id }) },
    plot: { ...(plotSpec.id === undefined ? {} : { id: plotSpec.id }) },
    members: orderedMembers(members).map((member, index) => ({
      target: member.target,
      kind: member.kind,
      ...(typeof values[index]?.id === 'string' ? { id: values[index].id } : {}),
      core: member.core,
      value: values[index],
      sources: member.sources,
    })),
  });
};
