import type { IRJsonObject, JsonValue } from '@retikz/core';
import type { IRPlotSpec } from '@retikz/plot';

import { JsonObjectSchema } from '@retikz/core';
import {
  CoordinateCompositionSchema,
  CoordinateOperationSchema,
  GuideSchema,
  MarkOperationSchema,
  ScaleOperationSchema,
  TransformSchema,
} from '@retikz/plot';
import { z } from 'zod';

import type { ChartRecipeSeed, InternalChartSpecBound } from '../providers';
import type { IRChartInspectionMember } from '../schemas';

import { ChartContributionSource, ChartInspectionMemberKind } from '../schemas';
import { ChartResolveError, ChartResolveErrorCode } from './errors';

/** merge 期间维护的 active semantic member */
export type MergedChartMember = {
  /** 稳定或 final-index extension target */
  target: string;
  /** Plot member collection kind */
  kind: IRChartInspectionMember['kind'];
  /** 是否属于 recipe 必需结构 */
  core: boolean;
  /** 当前 member JSON 值 */
  value: IRJsonObject;
  /** 允许 patch 的 member-relative 路径 */
  patchablePaths: ReadonlyArray<ReadonlyArray<string>>;
  /** 按应用顺序累计的 contribution sources */
  sources: IRChartInspectionMember['sources'];
};

/** collection merge 的内部结果 */
export type ChartMergeResult = {
  /** 尚未执行最终 PlotSpec root parse 的 candidate */
  plotSpec: IRPlotSpec;
  /** 与 candidate collection 顺序一致的 active members */
  members: ReadonlyArray<MergedChartMember>;
};

const jsonObjectOf = (value: unknown): IRJsonObject => JsonObjectSchema.parse(value);

const source = (kind: IRChartInspectionMember['sources'][number]['kind'], path: string) => ({ kind, path });

const samePath = (left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean =>
  left.length === right.length && left.every((part, index) => part === right[index]);

/** 返回在指定叶路径写入克隆值后的 JSON object */
const setJsonPath = (object: IRJsonObject, path: ReadonlyArray<string>, value: JsonValue): IRJsonObject => {
  const [head, ...rest] = path;
  if (rest.length === 0) return { ...object, [head]: structuredClone(value) };
  const nested = JsonObjectSchema.safeParse(object[head]);
  return {
    ...object,
    [head]: setJsonPath(nested.success ? nested.data : {}, rest, value),
  };
};

const idOf = (member: IRJsonObject): string | undefined => (typeof member.id === 'string' ? member.id : undefined);

/** 从显式 Plot extension 建立一个非核心 active member */
const memberOf = (
  target: string,
  kind: MergedChartMember['kind'],
  value: unknown,
  contributionKind: IRChartInspectionMember['sources'][number]['kind'],
  path: string,
): MergedChartMember => ({
  target,
  kind,
  core: false,
  value: jsonObjectOf(value),
  patchablePaths: [],
  sources: [source(contributionKind, path)],
});

const errorPath = (path: ReadonlyArray<string | number>, suffix?: string): ReadonlyArray<string | number> =>
  suffix === undefined ? path : [...path, suffix];

const seedCollectionOfKind: Record<ChartRecipeSeed['members'][number]['kind'], string> = {
  [ChartInspectionMemberKind.Transform]: 'transform',
  [ChartInspectionMemberKind.Scale]: 'scales',
  [ChartInspectionMemberKind.Coordinate]: 'coordinate',
  [ChartInspectionMemberKind.Composition]: 'composition',
  [ChartInspectionMemberKind.Mark]: 'marks',
  [ChartInspectionMemberKind.Guide]: 'guides',
};

/** 深度比较两个 JSON-compatible 值 */
const sameJsonValue = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameJsonValue(value, right[index]))
    );
  }
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;
  const leftObject = left as Record<string, unknown>;
  const rightObject = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftObject);
  return (
    leftKeys.length === Object.keys(rightObject).length &&
    leftKeys.every(key => Object.hasOwn(rightObject, key) && sameJsonValue(leftObject[key], rightObject[key]))
  );
};

/** 带最终 Plot collection 路径且保留原始 cause 的 member schema 错误 */
export class ChartMemberParseError extends Error {
  /** 添加最终 collection 路径后的 schema error */
  readonly rebasedError: z.ZodError;
  /** member schema 抛出的原始错误 */
  override readonly cause: z.ZodError;

  /** 为 member schema issues 添加最终 collection 路径 */
  constructor(error: z.ZodError, path: ReadonlyArray<string | number>) {
    super('Chart member schema parse failed', { cause: error });
    this.name = 'ChartMemberParseError';
    this.rebasedError = new z.ZodError(error.issues.map(issue => ({ ...issue, path: [...path, ...issue.path] })));
    this.cause = error;
  }
}

/** 解析 Plot member，并把 schema issue 定位到最终 collection 路径 */
const parseMemberAtPath = <T>(schema: z.ZodType<T>, value: unknown, path: ReadonlyArray<string | number>): T => {
  try {
    return schema.parse(value);
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    throw new ChartMemberParseError(error, path);
  }
};

/** 从 JSON root 读取结构化路径并区分缺失与 undefined */
const valueAtPath = (root: unknown, path: ReadonlyArray<string | number>): { found: boolean; value?: unknown } => {
  let value = root;
  for (const part of path) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) return { found: false };
    value = (value as Record<string | number, unknown>)[part];
  }
  return { found: true, value };
};

/** 枚举 seed Plot 中必须由语义 member 索引覆盖的全部 collection 路径 */
const seedPlotMemberPaths = (plot: IRPlotSpec): Array<ReadonlyArray<string | number>> => [
  ...(plot.transform ?? []).map((_, index) => ['transform', index] as const),
  ...plot.scales.map((_, index) => ['scales', index] as const),
  ...(plot.coordinate === undefined ? [] : [['coordinate'] as const]),
  ...(plot.composition === undefined ? [] : [['composition'] as const]),
  ...plot.marks.map((_, index) => ['marks', index] as const),
  ...(plot.guides ?? []).map((_, index) => ['guides', index] as const),
];

/** 校验 recipe member index 并从 seed Plot 的真实路径初始化 active records */
const initializeSeedMembers = (seed: ChartRecipeSeed): Array<MergedChartMember> => {
  const seenPaths = new Set<string>();
  const seenTargets = new Set<string>();
  const members = seed.members.map(member => {
    const expectedRoot = seedCollectionOfKind[member.kind];
    const isCollection =
      member.kind === ChartInspectionMemberKind.Transform ||
      member.kind === ChartInspectionMemberKind.Scale ||
      member.kind === ChartInspectionMemberKind.Mark ||
      member.kind === ChartInspectionMemberKind.Guide;
    const validShape =
      member.plotPath[0] === expectedRoot &&
      (isCollection
        ? member.plotPath.length === 2 && typeof member.plotPath[1] === 'number'
        : member.plotPath.length === 1);
    const pathKey = JSON.stringify(member.plotPath);
    const located = validShape ? valueAtPath(seed.plot, member.plotPath) : { found: false };
    if (!located.found || seenPaths.has(pathKey) || !sameJsonValue(located.value, member.value)) {
      throw new Error(`Chart recipe seed member "${member.target}" has an invalid plotPath or mismatched value`);
    }
    if (seenTargets.has(member.target)) {
      throw new Error(`Chart recipe seed member target "${member.target}" is duplicated`);
    }
    seenPaths.add(pathKey);
    seenTargets.add(member.target);
    return {
      target: member.target,
      kind: member.kind,
      core: member.core,
      value: jsonObjectOf(located.value),
      patchablePaths: member.patchablePaths,
      sources: [source(ChartContributionSource.TypeDefault, member.sourcePath)],
    };
  });
  const missingPath = seedPlotMemberPaths(seed.plot).find(path => !seenPaths.has(JSON.stringify(path)));
  if (missingPath !== undefined) {
    throw new Error(`Chart recipe seed members do not cover Plot member at ${JSON.stringify(missingPath)}`);
  }
  return members;
};

/** 把 recipe seed 与 Chart shared collections 确定性合并为 Plot candidate */
export const mergeChartSeed = (spec: InternalChartSpecBound, seed: ChartRecipeSeed): ChartMergeResult => {
  let members = initializeSeedMembers(seed);
  const recipeIds = new Set(members.map(member => idOf(member.value)).filter(id => id !== undefined));
  const userIds: Array<{ id: string; path: ReadonlyArray<string | number> }> = [];

  const userTransforms = (spec.transform ?? []).map((transform, index) =>
    memberOf(
      `extension.transform.${index}`,
      ChartInspectionMemberKind.Transform,
      transform,
      ChartContributionSource.UserOverride,
      `$spec/transform/${index}`,
    ),
  );
  members = [...userTransforms, ...members];

  const seenScaleNames = new Set<string>();
  for (const [index, scale] of (spec.scales ?? []).entries()) {
    if (seenScaleNames.has(scale.name)) {
      throw new ChartResolveError(ChartResolveErrorCode.DuplicateScale, { path: ['scales', index, 'name'] });
    }
    seenScaleNames.add(scale.name);
    const existingIndex = members.findIndex(
      member => member.kind === ChartInspectionMemberKind.Scale && member.value.name === scale.name,
    );
    if (existingIndex >= 0) {
      const existing = members[existingIndex];
      members[existingIndex] = {
        ...existing,
        value: jsonObjectOf(scale),
        sources: [...existing.sources, source(ChartContributionSource.UserOverride, `$spec/scales/${index}`)],
      };
    } else {
      const finalIndex = members.filter(member => member.kind === ChartInspectionMemberKind.Scale).length;
      members.push(
        memberOf(
          `extension.scale.${finalIndex}`,
          ChartInspectionMemberKind.Scale,
          scale,
          ChartContributionSource.UserOverride,
          `$spec/scales/${index}`,
        ),
      );
    }
  }

  const spatialIndex = members.findIndex(
    member =>
      member.kind === ChartInspectionMemberKind.Coordinate || member.kind === ChartInspectionMemberKind.Composition,
  );
  const spatial = spatialIndex >= 0 ? members[spatialIndex] : undefined;
  if (spec.coordinate !== undefined) {
    if (spatial?.kind === ChartInspectionMemberKind.Composition) {
      throw new ChartResolveError(ChartResolveErrorCode.CoordinateConflict, { path: ['coordinate'] });
    }
    const replacement =
      spatial === undefined
        ? memberOf(
            'extension.coordinate.0',
            ChartInspectionMemberKind.Coordinate,
            spec.coordinate,
            ChartContributionSource.UserOverride,
            '$spec/coordinate',
          )
        : {
            ...spatial,
            value: jsonObjectOf(spec.coordinate),
            sources: [...spatial.sources, source(ChartContributionSource.UserOverride, '$spec/coordinate')],
          };
    if (spatialIndex >= 0) members[spatialIndex] = replacement;
    else members.push(replacement);
  }
  if (spec.composition !== undefined) {
    if (spatial?.kind === ChartInspectionMemberKind.Coordinate) {
      throw new ChartResolveError(ChartResolveErrorCode.CoordinateConflict, { path: ['composition'] });
    }
    const replacement =
      spatial === undefined
        ? memberOf(
            'extension.composition.0',
            ChartInspectionMemberKind.Composition,
            spec.composition,
            ChartContributionSource.UserOverride,
            '$spec/composition',
          )
        : {
            ...spatial,
            value: jsonObjectOf(spec.composition),
            sources: [...spatial.sources, source(ChartContributionSource.UserOverride, '$spec/composition')],
          };
    if (spatialIndex >= 0) members[spatialIndex] = replacement;
    else members.push(replacement);
  }

  if (spec.guides !== undefined) {
    members = members.filter(member => member.kind !== ChartInspectionMemberKind.Guide);
    for (const [index, guide] of spec.guides.entries()) {
      members.push(
        memberOf(
          `extension.guide.${index}`,
          ChartInspectionMemberKind.Guide,
          guide,
          ChartContributionSource.UserOverride,
          `$spec/guides/${index}`,
        ),
      );
      const guideId = idOf(jsonObjectOf(guide));
      if (guideId !== undefined) userIds.push({ id: guideId, path: ['guides', index, 'id'] });
    }
  }

  const patchMemberIndexes = seed.patches.map(patch => {
    const memberIndex = members.findIndex(member => member.target === patch.target);
    if (memberIndex < 0) {
      throw new ChartResolveError(ChartResolveErrorCode.UnknownTarget, {
        path: errorPath(patch.inputPath, 'target'),
        target: patch.target,
      });
    }
    return memberIndex;
  });
  const patchedTargets = new Set<string>();
  for (const patch of seed.patches) {
    if (patchedTargets.has(patch.target)) {
      throw new ChartResolveError(ChartResolveErrorCode.DuplicateTarget, {
        path: errorPath(patch.inputPath, 'target'),
        target: patch.target,
      });
    }
    patchedTargets.add(patch.target);
  }
  for (const patch of seed.patches) {
    if (patch.changes.length === 0) {
      throw new ChartResolveError(ChartResolveErrorCode.InvalidPatch, { path: patch.inputPath, target: patch.target });
    }
    const seenChanges: Array<ReadonlyArray<string>> = [];
    for (const change of patch.changes) {
      if (change.path.length === 0 || seenChanges.some(path => samePath(path, change.path))) {
        throw new ChartResolveError(ChartResolveErrorCode.InvalidPatch, {
          path: patch.inputPath,
          target: patch.target,
        });
      }
      seenChanges.push(change.path);
    }
  }
  for (const [patchIndex, patch] of seed.patches.entries()) {
    const member = members[patchMemberIndexes[patchIndex]];
    for (const change of patch.changes) {
      if (!member.patchablePaths.some(path => samePath(path, change.path))) {
        throw new ChartResolveError(ChartResolveErrorCode.ProtectedField, {
          path: [...patch.inputPath, ...change.path],
          target: patch.target,
        });
      }
    }
  }
  for (const [patchIndex, patch] of seed.patches.entries()) {
    const memberIndex = patchMemberIndexes[patchIndex];
    const member = members[memberIndex];
    members[memberIndex] = {
      ...member,
      value: patch.changes.reduce((value, change) => setJsonPath(value, change.path, change.value), member.value),
      sources: [...member.sources, source(ChartContributionSource.UserOverride, patch.sourcePath)],
    };
  }

  for (const [index, mark] of (spec.marks ?? []).entries()) {
    const finalIndex = members.filter(member => member.kind === ChartInspectionMemberKind.Mark).length;
    members.push(
      memberOf(
        `extension.mark.${finalIndex}`,
        ChartInspectionMemberKind.Mark,
        mark,
        ChartContributionSource.PlotExtension,
        `$spec/marks/${index}`,
      ),
    );
    const markId = idOf(jsonObjectOf(mark));
    if (markId !== undefined) userIds.push({ id: markId, path: ['marks', index, 'id'] });
  }

  const seenUserIds = new Set<string>();
  for (const userId of userIds) {
    if (recipeIds.has(userId.id)) {
      throw new ChartResolveError(ChartResolveErrorCode.DuplicateId, {
        path: userId.path,
        conflictingId: userId.id,
      });
    }
    if (userId.id.startsWith('__chart.')) {
      throw new ChartResolveError(ChartResolveErrorCode.ReservedId, {
        path: userId.path,
        conflictingId: userId.id,
      });
    }
    if (seenUserIds.has(userId.id)) {
      throw new ChartResolveError(ChartResolveErrorCode.DuplicateId, {
        path: userId.path,
        conflictingId: userId.id,
      });
    }
    seenUserIds.add(userId.id);
  }

  const transforms = members
    .filter(member => member.kind === ChartInspectionMemberKind.Transform)
    .map((member, index) => parseMemberAtPath(TransformSchema, member.value, ['transform', index]));
  const scales = members
    .filter(member => member.kind === ChartInspectionMemberKind.Scale)
    .map((member, index) => parseMemberAtPath(ScaleOperationSchema, member.value, ['scales', index]));
  const coordinateMember = members.find(member => member.kind === ChartInspectionMemberKind.Coordinate);
  const compositionMember = members.find(member => member.kind === ChartInspectionMemberKind.Composition);
  const marks = members
    .filter(member => member.kind === ChartInspectionMemberKind.Mark)
    .map((member, index) => parseMemberAtPath(MarkOperationSchema, member.value, ['marks', index]));
  const guides = members
    .filter(member => member.kind === ChartInspectionMemberKind.Guide)
    .map((member, index) => parseMemberAtPath(GuideSchema, member.value, ['guides', index]));
  const {
    transform: seedTransform,
    scales: seedScales,
    coordinate: seedCoordinate,
    composition: seedComposition,
    marks: seedMarks,
    guides: seedGuides,
    ...passthrough
  } = seed.plot;
  void seedTransform;
  void seedScales;
  void seedCoordinate;
  void seedComposition;
  void seedMarks;
  void seedGuides;
  const plotSpec: IRPlotSpec = {
    ...passthrough,
    ...(transforms.length === 0 ? {} : { transform: transforms }),
    scales,
    ...(coordinateMember === undefined
      ? {}
      : { coordinate: parseMemberAtPath(CoordinateOperationSchema, coordinateMember.value, ['coordinate']) }),
    ...(compositionMember === undefined
      ? {}
      : { composition: parseMemberAtPath(CoordinateCompositionSchema, compositionMember.value, ['composition']) }),
    marks,
    guides,
  };

  return { plotSpec, members };
};
