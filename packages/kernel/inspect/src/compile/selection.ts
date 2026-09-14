import type { CompileObservation, CompileObservationOwner, IRChild, IRScene } from '@retikz/core';
import { compareCompileOccurrences, isCompileObservationOwnerEqual, isCompileOccurrenceEqual } from '@retikz/core';
import type { JsonObject } from '@retikz/foundation';

import { RetikzInspectError, RetikzInspectErrorCode } from '../error';
import type { InspectorRegistry } from '../providers';
import { formatInspectorRegistryKey, getResolvedInspectorRegistry } from '../providers';
import { createInspectionSelectionDiagnosticOrigin, wrapInspectionError } from './diagnostics';
import { cloneAndFreezeInspectionJson } from './output';
import type {
  InspectionSelection,
  InspectionSelectionRule,
  InspectionSelectionTarget,
  ResolvedInspectionRequest,
} from './types';

type IndexedRule = Readonly<{
  index: number;
  rule: InspectionSelectionRule;
  options: JsonObject;
  parsedOptions: JsonObject;
}>;

/** 将选择目标格式化为用于去重的稳定键 */
const formatTargetKey = (target: InspectionSelectionTarget): string => {
  if (target.kind === 'scene') return 'scene';
  if (target.kind === 'subtree') return `subtree:${target.sourcePath}`;
  return `self:authored:${target.locator.sourcePath}:${target.locator.occurrenceIndex ?? '*'}`;
};

/** 收集 IR 中可用于选择的作者节点路径与子树路径 */
const collectAuthoredPaths = (ir: IRScene) => {
  const selfPaths = new Set<string>();
  const subtreePaths = new Set<string>();
  const visit = (child: IRChild, basePath: string): void => {
    if ('namespace' in child) {
      selfPaths.add(basePath);
      subtreePaths.add(basePath);
      return;
    }
    selfPaths.add(`${basePath}.${child.type}`);
    if (child.type !== 'scope') return;
    const scopePath = `${basePath}.scope`;
    subtreePaths.add(scopePath);
    child.children.forEach((nested, index) => visit(nested, `${scopePath}.children[${index}]`));
  };
  ir.children.forEach((child, index) => visit(child, `children[${index}]`));
  return { selfPaths, subtreePaths };
};

/** 断言 Inspect 选择目标对应当前 IR 且包含合法的实例定位信息 */
const assertSelectionTarget = (
  target: InspectionSelectionTarget,
  authoredPaths: ReturnType<typeof collectAuthoredPaths>,
): void => {
  if (target.kind === 'scene') return;
  if (target.kind === 'subtree') {
    if (!authoredPaths.subtreePaths.has(target.sourcePath))
      throw new RetikzInspectError(RetikzInspectErrorCode.Compile, `Invalid inspection subtree '${target.sourcePath}'`);
    return;
  }
  if (!authoredPaths.selfPaths.has(target.locator.sourcePath)) {
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
  const authoredPaths = collectAuthoredPaths(ir);
  const requestKeys = new Set<string>();
  return Object.freeze(
    selection.rules.map((rule, index) => {
      const target = rule.target;
      try {
        let options: JsonObject = {};
        let parsedOptions: JsonObject = {};
        assertSelectionTarget(target, authoredPaths);
        if (rule.kind === 'request') {
          const definition = getResolvedInspectorRegistry(registry).require(rule.inspector);
          const duplicateKey = `${formatTargetKey(target)}\u0000${formatInspectorRegistryKey(rule.inspector)}`;
          if (requestKeys.has(duplicateKey))
            throw new RetikzInspectError(
              RetikzInspectErrorCode.Compile,
              'Duplicate inspection target and Inspector key',
            );
          requestKeys.add(duplicateKey);
          if (rule.options !== false) {
            const sourceOptions = rule.options === true ? {} : rule.options;
            parsedOptions = cloneAndFreezeInspectionJson(
              definition.optionsSchema.parse(sourceOptions),
              `Inspector '${definition.namespace}/${definition.type}' source options`,
            );
            options = structuredClone(sourceOptions);
          }
        }
        return Object.freeze({ index, rule, options, parsedOptions });
      } catch (cause) {
        throw wrapInspectionError(createInspectionSelectionDiagnosticOrigin(index, target), cause);
      }
    }),
  );
};

/** 判断选择目标是否匹配某个最终观察结果 */
const doesTargetMatchObservation = (
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
  if (observation.owner.kind === 'clip') return false;
  if (observation.occurrence.sourcePath !== locator.sourcePath) return false;
  if (locator.occurrenceIndex === undefined) return true;
  const selectedObservation = observations
    .filter(
      candidate =>
        candidate.occurrence.sourcePath === locator.sourcePath &&
        isCompileObservationOwnerEqual(candidate.owner, owner),
    )
    .sort((left, right) => compareCompileOccurrences(left.occurrence, right.occurrence))
    .at(locator.occurrenceIndex);
  return (
    selectedObservation !== undefined &&
    isCompileOccurrenceEqual(observation.occurrence, selectedObservation.occurrence)
  );
};

/** 判断场景或子树封锁规则是否覆盖指定作者路径 */
const doesBarrierContainSourcePath = (
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
  return resolveAdmittedInspectionSelection({
    registry,
    admittedRules: admitInspectionSelection(ir, registry, selection),
    observations,
  });
};

/**
 * 将已准入的选择规则解析为本次最终实例的 Inspector 请求
 *
 * @description 对每个最终 observation，仅消费 owner 相符且未被 barrier 封锁的 request。按 scene、外层 subtree、内层 subtree、self 的顺序级联稀疏 options，最后才补默认值并交给 Inspector 的 resolveOptions
 * @remarks observer 的多次 session 复用同一份稀疏 Source；本函数只根据本轮 observations 物化运行时请求
 */
export const resolveAdmittedInspectionSelection = ({
  registry,
  admittedRules,
  observations,
}: Readonly<{
  registry: InspectorRegistry;
  admittedRules: ReadonlyArray<IndexedRule>;
  observations: ReadonlyArray<CompileObservation>;
}>): ReadonlyArray<ResolvedInspectionRequest> => {
  /** 所有实例按 Core 的稳定顺序处理，避免输入 observation 顺序影响 options 合并或颜色 */
  const orderedObservations = [...observations].sort((left, right) =>
    compareCompileOccurrences(left.occurrence, right.occurrence),
  );
  /** self 是显式指向 authored 对象的请求，必须在实际遍历前确认它至少对应一个最终 owner output */
  for (const { index, rule } of admittedRules) {
    if (rule.kind !== 'request' || rule.target.kind !== 'self' || rule.options === false) continue;
    const sourcePath = rule.target.locator.sourcePath;
    if (
      admittedRules.some(
        ({ rule: candidate }) =>
          candidate.kind === 'barrier' && doesBarrierContainSourcePath(candidate.target, sourcePath),
      )
    ) {
      continue;
    }
    const definition = getResolvedInspectorRegistry(registry).require(rule.inspector);
    const matchingObservations = orderedObservations.filter(observation =>
      doesTargetMatchObservation(rule.target, observation, orderedObservations, definition.owner),
    );
    try {
      if (matchingObservations.length === 0)
        throw new RetikzInspectError(RetikzInspectErrorCode.Compile, 'Explicit self target has no final owner output');
      if (
        !matchingObservations.some(observation => isCompileObservationOwnerEqual(observation.owner, definition.owner))
      ) {
        throw new RetikzInspectError(
          RetikzInspectErrorCode.Compile,
          'Explicit self target owner does not match Inspector owner',
        );
      }
    } catch (cause) {
      throw wrapInspectionError(createInspectionSelectionDiagnosticOrigin(index, rule.target), cause);
    }
  }

  /** 每项都是一个 observation 与一个 owner-matched Inspector 的最终请求，尚未分配外观颜色 */
  const pendingRequests: Array<Omit<ResolvedInspectionRequest, 'colorScope'>> = [];
  for (const observation of orderedObservations) {
    for (const definition of getResolvedInspectorRegistry(registry).definitions) {
      if (!isCompileObservationOwnerEqual(observation.owner, definition.owner)) continue;
      /** 仅保留作用到当前最终实例的规则；barrier 优先于任何 request */
      const matchingRules = admittedRules.filter(({ rule }) =>
        doesTargetMatchObservation(rule.target, observation, orderedObservations, definition.owner),
      );
      if (matchingRules.some(({ rule }) => rule.kind === 'barrier')) continue;
      /** 级联从宽到窄：scene → subtree（由外至内）→ self；同范围保持作者声明顺序 */
      const requests = matchingRules
        .filter(
          (entry): entry is IndexedRule & { rule: Extract<InspectionSelectionRule, { kind: 'request' }> } =>
            entry.rule.kind === 'request' &&
            formatInspectorRegistryKey(entry.rule.inspector) === formatInspectorRegistryKey(definition),
        )
        .sort((left, right) => {
          const rankSelectionTarget = (target: InspectionSelectionTarget): number =>
            target.kind === 'scene' ? 0 : target.kind === 'subtree' ? 1 : 2;
          const rankDifference = rankSelectionTarget(left.rule.target) - rankSelectionTarget(right.rule.target);
          if (rankDifference !== 0) return rankDifference;
          if (left.rule.target.kind === 'subtree' && right.rule.target.kind === 'subtree') {
            const depthDifference = left.rule.target.sourcePath.length - right.rule.target.sourcePath.length;
            if (depthDifference !== 0) return depthDifference;
          }
          return left.index - right.index;
        });
      let isRequestActive = false;
      let mergedOptionsInput: JsonObject = {};
      let parsedOptions: JsonObject | undefined;
      /** false 会关闭并清空此前继承；合并时保留 sparse options，避免默认值被误当作显式覆盖 */
      for (const entry of requests) {
        try {
          if (entry.rule.options === false) {
            isRequestActive = false;
            mergedOptionsInput = {};
            parsedOptions = undefined;
            continue;
          }
          const localOptionsInput = entry.options;
          const mergeOptionsInput = definition.mergeOptionsInput as
            | ((inheritedOptionsInput: JsonObject, localOptionsInput: JsonObject) => JsonObject)
            | undefined;
          mergedOptionsInput =
            isRequestActive && mergeOptionsInput !== undefined
              ? mergeOptionsInput(structuredClone(mergedOptionsInput), structuredClone(localOptionsInput))
              : localOptionsInput;
          parsedOptions = isRequestActive && mergeOptionsInput !== undefined ? undefined : entry.parsedOptions;
          isRequestActive = true;
        } catch (cause) {
          throw wrapInspectionError(createInspectionSelectionDiagnosticOrigin(entry.index, entry.rule.target), cause);
        }
      }
      if (!isRequestActive) continue;
      let options: JsonObject;
      try {
        const resolveOptions = definition.resolveOptions as (source: JsonObject) => JsonObject;
        options = cloneAndFreezeInspectionJson(
          resolveOptions(
            parsedOptions ??
              cloneAndFreezeInspectionJson(
                definition.optionsSchema.parse(mergedOptionsInput),
                'Parsed merged Inspector options',
              ),
          ),
          `Inspector '${definition.namespace}/${definition.type}' options`,
        );
      } catch (cause) {
        const lastRequest = requests.at(-1);
        throw wrapInspectionError(
          createInspectionSelectionDiagnosticOrigin(
            lastRequest?.index ?? 0,
            lastRequest?.rule.target ?? { kind: 'scene' },
          ),
          cause,
        );
      }
      pendingRequests.push({
        inspector: Object.freeze({ namespace: definition.namespace, type: definition.type }),
        owner: observation.owner,
        occurrence: observation.occurrence,
        provenance: observation.provenance,
        options,
      });
    }
  }
  /** 以最终实例和 Inspector key 固定输出顺序，再分配连续 colorScope */
  pendingRequests.sort(
    (left, right) =>
      compareCompileOccurrences(left.occurrence, right.occurrence) ||
      formatInspectorRegistryKey(left.inspector).localeCompare(formatInspectorRegistryKey(right.inspector)),
  );
  return Object.freeze(pendingRequests.map((request, colorScope) => Object.freeze({ ...request, colorScope })));
};

/** 判断作者站点是否可能命中选择规则，以便按需发布所属者产物 */
export const canInspectionSelectionRequestSite = (
  admittedRules: ReadonlyArray<IndexedRule>,
  registry: InspectorRegistry,
  owner: CompileObservationOwner,
  sourcePath: string,
): boolean =>
  !admittedRules.some(({ rule }) => rule.kind === 'barrier' && doesBarrierContainSourcePath(rule.target, sourcePath)) &&
  admittedRules.some(({ rule }) => {
    if (rule.kind !== 'request' || rule.options === false) return false;
    const definition = getResolvedInspectorRegistry(registry).get(rule.inspector);
    if (definition === undefined || !isCompileObservationOwnerEqual(owner, definition.owner)) return false;
    if (rule.target.kind === 'scene') return true;
    if (rule.target.kind === 'subtree')
      return sourcePath === rule.target.sourcePath || sourcePath.startsWith(`${rule.target.sourcePath}.`);
    return owner.kind !== 'clip' && sourcePath === rule.target.locator.sourcePath;
  });
