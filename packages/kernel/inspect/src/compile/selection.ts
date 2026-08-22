import type {
  CompileObservation,
  CompileObservationOwner,
  CompileOccurrenceLocator,
  IRChild,
  IRJsonObject,
  IRScene,
} from '@retikz/core';

import type { InspectorRegistry } from '../providers';
import type {
  InspectionSelection,
  InspectionSelectionRule,
  InspectionSelectionTarget,
  ResolvedInspectionRequest,
} from './types';

import { RetikzInspectError, RetikzInspectErrorCode } from '../error';
import { inspectorRegistryKey } from '../providers';
import { selectionOrigin, wrapInspectionError } from './diagnostics';
import { cloneAndFreezeInspectionJson } from './output';

type IndexedRule = Readonly<{ index: number; rule: InspectionSelectionRule }>;

/** 校验实例定位器中 TypeScript 无法表达的非负安全整数约束 */
const assertOccurrenceLocator = (occurrence: CompileOccurrenceLocator): void => {
  if (occurrence.expansionPath.some(segment => !Number.isSafeInteger(segment.index) || segment.index < 0)) {
    throw new RetikzInspectError(RetikzInspectErrorCode.Compile, 'Invalid inspection occurrence locator');
  }
};

/** 按 Core 的编译顺序比较两个实例定位器 */
export const compareInspectionOccurrences = (
  left: CompileObservation['occurrence'],
  right: CompileObservation['occurrence'],
): number => {
  const indexes = (sourcePath: string): Array<number> =>
    Array.from(sourcePath.matchAll(/children\[(\d+)\]/g), match => Number(match[1]));
  const compare = (a: ReadonlyArray<number>, b: ReadonlyArray<number>): number => {
    for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
      const difference = a[index] - b[index];
      if (difference !== 0) return difference;
    }
    return a.length - b.length;
  };
  return (
    compare(indexes(left.sourcePath), indexes(right.sourcePath)) ||
    compare(
      left.expansionPath.map(segment => segment.index),
      right.expansionPath.map(segment => segment.index),
    )
  );
};

/** 判断两个观察所属者是否相同 */
const ownerEquals = (left: CompileObservationOwner, right: CompileObservationOwner): boolean =>
  left.kind === right.kind &&
  (left.kind === 'pathKind'
    ? right.kind === 'pathKind' && left.name === right.name
    : right.kind === 'composite' && left.namespace === right.namespace && left.type === right.type);

/** 判断两个编译实例定位器是否完全相同 */
const occurrenceEquals = (left: CompileObservation['occurrence'], right: CompileObservation['occurrence']): boolean =>
  left.sourcePath === right.sourcePath &&
  left.expansionPath.length === right.expansionPath.length &&
  left.expansionPath.every(
    (segment, index) =>
      segment.kind === right.expansionPath[index]?.kind && segment.index === right.expansionPath[index]?.index,
  );

/** 将选择目标格式化为用于去重的稳定键 */
const formatTargetKey = (target: InspectionSelectionTarget): string => {
  if (target.kind === 'scene') return 'scene';
  if (target.kind === 'subtree') return `subtree:${target.sourcePath}`;
  if (target.locator.kind === 'authored')
    return `self:authored:${target.locator.sourcePath}:${target.locator.occurrenceIndex ?? '*'}`;
  return `self:occurrence:${target.locator.occurrence.sourcePath}:${target.locator.occurrence.expansionPath
    .map(segment => `${segment.kind}[${segment.index}]`)
    .join('/')}`;
};

/** 收集 IR 中可用于选择的作者节点路径与子树路径 */
const collectAuthoredPaths = (ir: IRScene) => {
  const self = new Set<string>();
  const subtree = new Set<string>();
  const visit = (child: IRChild, basePath: string): void => {
    if ('namespace' in child) {
      self.add(basePath);
      subtree.add(basePath);
      return;
    }
    if (child.type === 'path') {
      self.add(`${basePath}.path`);
      return;
    }
    if (child.type !== 'scope') return;
    const scopePath = `${basePath}.scope`;
    subtree.add(scopePath);
    child.children.forEach((nested, index) => visit(nested, `${scopePath}.children[${index}]`));
  };
  ir.children.forEach((child, index) => visit(child, `children[${index}]`));
  return { self, subtree };
};

/** 断言 Inspect 选择目标对应当前 IR 且包含合法的实例定位信息 */
const assertSelectionTarget = (
  target: InspectionSelectionTarget,
  paths: ReturnType<typeof collectAuthoredPaths>,
): void => {
  if (target.kind === 'scene') return;
  if (target.kind === 'subtree') {
    if (!paths.subtree.has(target.sourcePath))
      throw new RetikzInspectError(RetikzInspectErrorCode.Compile, `Invalid inspection subtree '${target.sourcePath}'`);
    return;
  }
  if (target.locator.kind === 'occurrence') {
    assertOccurrenceLocator(target.locator.occurrence);
    return;
  }
  if (!paths.self.has(target.locator.sourcePath)) {
    throw new RetikzInspectError(
      RetikzInspectErrorCode.Compile,
      `Invalid inspection self locator '${target.locator.sourcePath}'`,
    );
  }
  if (
    target.locator.occurrenceIndex !== undefined &&
    (!Number.isSafeInteger(target.locator.occurrenceIndex) || target.locator.occurrenceIndex < 0)
  ) {
    throw new RetikzInspectError(RetikzInspectErrorCode.Compile, 'Invalid inspection authored occurrence index');
  }
};

/** 在 Core 遍历前校验选择结构、定位器、注册表与稀疏选项 */
export const admitInspectionSelection = (
  ir: IRScene,
  registry: InspectorRegistry,
  selection: InspectionSelection,
): ReadonlyArray<IndexedRule> => {
  const paths = collectAuthoredPaths(ir);
  const requestKeys = new Set<string>();
  return Object.freeze(
    selection.rules.map((rule, index) => {
      const target = rule.target;
      try {
        assertSelectionTarget(target, paths);
        if (rule.kind === 'request') {
          const definition = registry.require(rule.inspector);
          const duplicateKey = `${formatTargetKey(target)}\u0000${inspectorRegistryKey(rule.inspector)}`;
          if (requestKeys.has(duplicateKey))
            throw new RetikzInspectError(
              RetikzInspectErrorCode.Compile,
              'Duplicate inspection target and Inspector key',
            );
          requestKeys.add(duplicateKey);
          if (rule.value !== false) {
            definition.optionsInputSchema.parse(rule.value === true ? {} : rule.value);
          }
        }
        return Object.freeze({ index, rule });
      } catch (cause) {
        throw wrapInspectionError(selectionOrigin(index, target), cause);
      }
    }),
  );
};

/** 判断选择目标是否匹配某个最终观察结果 */
const isTargetMatches = (
  target: InspectionSelectionTarget,
  observation: CompileObservation,
  observations: ReadonlyArray<CompileObservation>,
  owner: CompileObservationOwner,
): boolean => {
  if (target.kind === 'scene') return true;
  if (target.kind === 'subtree') {
    return (
      observation.occurrence.sourcePath === target.sourcePath ||
      observation.occurrence.sourcePath.startsWith(`${target.sourcePath}.`)
    );
  }
  const locator = target.locator;
  if (locator.kind === 'occurrence') return occurrenceEquals(observation.occurrence, locator.occurrence);
  if (observation.occurrence.sourcePath !== locator.sourcePath) return false;
  if (locator.occurrenceIndex === undefined) return true;
  const selected = observations
    .filter(candidate => candidate.occurrence.sourcePath === locator.sourcePath && ownerEquals(candidate.owner, owner))
    .sort((left, right) => compareInspectionOccurrences(left.occurrence, right.occurrence))
    .at(locator.occurrenceIndex);
  return selected !== undefined && occurrenceEquals(observation.occurrence, selected.occurrence);
};

/** 判断场景或子树封锁规则是否覆盖指定作者路径 */
const barrierContainsSourcePath = (
  target: Extract<InspectionSelectionTarget, { kind: 'scene' | 'subtree' }>,
  sourcePath: string,
): boolean =>
  target.kind === 'scene' || sourcePath === target.sourcePath || sourcePath.startsWith(`${target.sourcePath}.`);

/** 根据最终观察结果解析选择规则，并分配连续的外观颜色序号 */
export const resolveInspectionSelection = ({
  ir,
  registry,
  selection,
  observations,
}: Readonly<{
  ir: IRScene;
  registry: InspectorRegistry;
  selection: InspectionSelection;
  observations: ReadonlyArray<CompileObservation>;
}>): ReadonlyArray<ResolvedInspectionRequest> => {
  const admitted = admitInspectionSelection(ir, registry, selection);
  const orderedObservations = [...observations].sort((left, right) =>
    compareInspectionOccurrences(left.occurrence, right.occurrence),
  );
  for (const { index, rule } of admitted) {
    if (rule.kind !== 'request' || rule.target.kind !== 'self' || rule.value === false) continue;
    const sourcePath =
      rule.target.locator.kind === 'authored'
        ? rule.target.locator.sourcePath
        : rule.target.locator.occurrence.sourcePath;
    if (
      admitted.some(
        ({ rule: candidate }) =>
          candidate.kind === 'barrier' && barrierContainsSourcePath(candidate.target, sourcePath),
      )
    ) {
      continue;
    }
    const definition = registry.require(rule.inspector);
    const matches = orderedObservations.filter(observation =>
      isTargetMatches(rule.target, observation, orderedObservations, definition.owner),
    );
    try {
      if (matches.length === 0)
        throw new RetikzInspectError(RetikzInspectErrorCode.Compile, 'Explicit self target has no final owner output');
      if (!matches.some(observation => ownerEquals(observation.owner, definition.owner))) {
        throw new RetikzInspectError(
          RetikzInspectErrorCode.Compile,
          'Explicit self target owner does not match Inspector owner',
        );
      }
    } catch (cause) {
      throw wrapInspectionError(selectionOrigin(index, rule.target), cause);
    }
  }

  const pending: Array<Omit<ResolvedInspectionRequest, 'colorScope'>> = [];
  for (const observation of orderedObservations) {
    for (const definition of registry.definitions) {
      if (!ownerEquals(observation.owner, definition.owner)) continue;
      const matching = admitted.filter(({ rule }) =>
        isTargetMatches(rule.target, observation, orderedObservations, definition.owner),
      );
      if (matching.some(({ rule }) => rule.kind === 'barrier')) continue;
      const requests = matching
        .filter(
          (entry): entry is IndexedRule & { rule: Extract<InspectionSelectionRule, { kind: 'request' }> } =>
            entry.rule.kind === 'request' &&
            inspectorRegistryKey(entry.rule.inspector) === inspectorRegistryKey(definition),
        )
        .sort((left, right) => {
          const rank = (target: InspectionSelectionTarget): number =>
            target.kind === 'scene' ? 0 : target.kind === 'subtree' ? 1 : 2;
          const rankDifference = rank(left.rule.target) - rank(right.rule.target);
          if (rankDifference !== 0) return rankDifference;
          if (left.rule.target.kind === 'subtree' && right.rule.target.kind === 'subtree') {
            const depthDifference = left.rule.target.sourcePath.length - right.rule.target.sourcePath.length;
            if (depthDifference !== 0) return depthDifference;
          }
          return left.index - right.index;
        });
      if (definition.owner.kind === 'pathKind' && !requests.some(entry => entry.rule.target.kind === 'self')) continue;
      let active = false;
      let input: IRJsonObject = {};
      for (const entry of requests) {
        try {
          if (entry.rule.value === false) {
            active = false;
            input = {};
            continue;
          }
          const local = definition.optionsInputSchema.parse(entry.rule.value === true ? {} : entry.rule.value);
          const merge = definition.mergeOptionsInput as
            | ((inherited: IRJsonObject, local: IRJsonObject) => IRJsonObject)
            | undefined;
          input = active && merge !== undefined ? merge(input, local) : local;
          input = definition.optionsInputSchema.parse(input);
          active = true;
        } catch (cause) {
          throw wrapInspectionError(selectionOrigin(entry.index, entry.rule.target), cause);
        }
      }
      if (!active) continue;
      let options: IRJsonObject;
      try {
        options = cloneAndFreezeInspectionJson(
          definition.optionsSchema.parse(input),
          `Inspector '${definition.namespace}/${definition.type}' options`,
        );
      } catch (cause) {
        const last = requests.at(-1);
        throw wrapInspectionError(selectionOrigin(last?.index ?? 0, last?.rule.target ?? { kind: 'scene' }), cause);
      }
      pending.push({
        inspector: Object.freeze({ namespace: definition.namespace, type: definition.type }),
        owner: observation.owner,
        occurrence: observation.occurrence,
        provenance: observation.provenance,
        options,
      });
    }
  }
  pending.sort(
    (left, right) =>
      compareInspectionOccurrences(left.occurrence, right.occurrence) ||
      inspectorRegistryKey(left.inspector).localeCompare(inspectorRegistryKey(right.inspector)),
  );
  return Object.freeze(pending.map((request, colorScope) => Object.freeze({ ...request, colorScope })));
};

/** 判断作者站点是否可能命中选择规则，以便按需发布所属者产物 */
export const selectionMayRequestSite = (
  admitted: ReadonlyArray<IndexedRule>,
  registry: InspectorRegistry,
  owner: CompileObservationOwner,
  sourcePath: string,
): boolean =>
  !admitted.some(({ rule }) => rule.kind === 'barrier' && barrierContainsSourcePath(rule.target, sourcePath)) &&
  admitted.some(({ rule }) => {
    if (rule.kind !== 'request' || rule.value === false) return false;
    const definition = registry.get(rule.inspector);
    if (definition === undefined || !ownerEquals(owner, definition.owner)) return false;
    if (definition.owner.kind === 'pathKind' && rule.target.kind !== 'self') return false;
    if (rule.target.kind === 'scene') return true;
    if (rule.target.kind === 'subtree')
      return sourcePath === rule.target.sourcePath || sourcePath.startsWith(`${rule.target.sourcePath}.`);
    return rule.target.locator.kind === 'authored'
      ? sourcePath === rule.target.locator.sourcePath
      : sourcePath === rule.target.locator.occurrence.sourcePath;
  });
