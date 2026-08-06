import type { CompileObservation, CompileObservationOwner, IRChild, IRJsonObject, IRScene } from '@retikz/core';

import type { InspectorRegistry } from '../providers/inspector';
import type {
  InspectionAppearance,
  InspectionSelection,
  InspectionSelectionRule,
  InspectionSelectionTarget,
  ResolvedInspectionRequest,
} from '../shared';

import { inspectorRegistryKey } from '../providers/inspector';
import { INSPECTION_SCOPE_PALETTE, INSPECTION_WARNING_COLOR } from '../shared';
import { selectionOrigin, wrapInspectionError } from './diagnostics';
import { cloneAndFreezeInspectionJson } from './output';

type IndexedRule = Readonly<{ index: number; rule: InspectionSelectionRule }>;

/** Core canonical occurrence preorder 的包内等价比较器 */
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

const ownerEquals = (left: CompileObservationOwner, right: CompileObservationOwner): boolean =>
  left.kind === right.kind &&
  (left.kind === 'pathKind'
    ? right.kind === 'pathKind' && left.name === right.name
    : right.kind === 'composite' && left.namespace === right.namespace && left.type === right.type);

const occurrenceEquals = (left: CompileObservation['occurrence'], right: CompileObservation['occurrence']): boolean =>
  left.sourcePath === right.sourcePath &&
  left.expansionPath.length === right.expansionPath.length &&
  left.expansionPath.every(
    (segment, index) =>
      segment.kind === right.expansionPath[index]?.kind && segment.index === right.expansionPath[index]?.index,
  );

const targetKey = (target: InspectionSelectionTarget): string => {
  if (target.kind === 'scene') return 'scene';
  if (target.kind === 'subtree') return `subtree:${target.sourcePath}`;
  if (target.locator.kind === 'authored') return `self:authored:${target.locator.sourcePath}`;
  return `self:occurrence:${target.locator.occurrence.sourcePath}:${target.locator.occurrence.expansionPath
    .map(segment => `${segment.kind}[${segment.index}]`)
    .join('/')}`;
};

const collectAuthoredPaths = (ir: IRScene) => {
  const self = new Set<string>();
  const subtree = new Set<string>();
  const visit = (child: IRChild, base: string): void => {
    if ('namespace' in child) {
      self.add(base);
      subtree.add(base);
      return;
    }
    if (child.type === 'path') {
      self.add(`${base}.path`);
      return;
    }
    if (child.type !== 'scope') return;
    const scopePath = `${base}.scope`;
    subtree.add(scopePath);
    child.children.forEach((nested, index) => visit(nested, `${scopePath}.children[${index}]`));
  };
  ir.children.forEach((child, index) => visit(child, `children[${index}]`));
  return { self, subtree };
};

const validateTarget = (target: InspectionSelectionTarget, paths: ReturnType<typeof collectAuthoredPaths>): void => {
  if (target.kind === 'scene') return;
  if (target.kind === 'subtree') {
    if (!paths.subtree.has(target.sourcePath)) throw new Error(`Invalid inspection subtree '${target.sourcePath}'`);
    return;
  }
  if (target.locator.kind === 'authored' && !paths.self.has(target.locator.sourcePath)) {
    throw new Error(`Invalid inspection self locator '${target.locator.sourcePath}'`);
  }
  if (
    target.locator.kind === 'occurrence' &&
    (typeof target.locator.occurrence.sourcePath !== 'string' ||
      !Array.isArray(target.locator.occurrence.expansionPath))
  ) {
    throw new Error('Invalid inspection occurrence locator');
  }
};

/** 在 Core traversal 前完成 selection 结构、locator、registry 与 sparse options admission */
export const admitInspectionSelection = (
  ir: IRScene,
  registry: InspectorRegistry,
  selection: InspectionSelection,
): ReadonlyArray<IndexedRule> => {
  if (!Array.isArray(selection.rules)) throw new Error('Inspection selection rules must be an array');
  const paths = collectAuthoredPaths(ir);
  const requestKeys = new Set<string>();
  return Object.freeze(
    selection.rules.map((rule, index) => {
      const target = Reflect.get(rule, 'target') as InspectionSelectionTarget;
      try {
        if (rule.kind !== 'request' && rule.kind !== 'barrier') throw new Error('Unknown inspection selection rule');
        if (rule.kind === 'barrier' && target.kind === 'self') throw new Error('Inspection barrier cannot target self');
        validateTarget(target, paths);
        if (rule.kind === 'request') {
          const definition = registry.require(rule.inspector);
          const duplicateKey = `${targetKey(target)}\u0000${inspectorRegistryKey(rule.inspector)}`;
          if (requestKeys.has(duplicateKey)) throw new Error('Duplicate inspection target and Inspector key');
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

const targetMatches = (target: InspectionSelectionTarget, observation: CompileObservation): boolean => {
  if (target.kind === 'scene') return true;
  if (target.kind === 'subtree') {
    return (
      observation.occurrence.sourcePath === target.sourcePath ||
      observation.occurrence.sourcePath.startsWith(`${target.sourcePath}.`)
    );
  }
  return target.locator.kind === 'authored'
    ? observation.occurrence.sourcePath === target.locator.sourcePath
    : occurrenceEquals(observation.occurrence, target.locator.occurrence);
};

/** 判断 scene 或 subtree barrier 是否覆盖给定 authored source path */
const barrierContainsSourcePath = (
  target: Extract<InspectionSelectionTarget, { kind: 'scene' | 'subtree' }>,
  sourcePath: string,
): boolean =>
  target.kind === 'scene' || sourcePath === target.sourcePath || sourcePath.startsWith(`${target.sourcePath}.`);

/** 对全部 final observations 求值 selection 并分配连续 appearance */
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
    const matches = observations.filter(observation => targetMatches(rule.target, observation));
    try {
      if (matches.length === 0) throw new Error('Explicit self target has no final owner output');
      if (!matches.some(observation => ownerEquals(observation.owner, definition.owner))) {
        throw new Error('Explicit self target owner does not match Inspector owner');
      }
    } catch (cause) {
      throw wrapInspectionError(selectionOrigin(index, rule.target), cause);
    }
  }

  const pending: Array<Omit<ResolvedInspectionRequest, 'appearance'>> = [];
  const orderedObservations = [...observations].sort((left, right) =>
    compareInspectionOccurrences(left.occurrence, right.occurrence),
  );
  for (const observation of orderedObservations) {
    for (const definition of registry.definitions) {
      if (!ownerEquals(observation.owner, definition.owner)) continue;
      const matching = admitted.filter(({ rule }) => targetMatches(rule.target, observation));
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
          `Inspector '${definition.namespace}/${definition.name}' options`,
        );
      } catch (cause) {
        const last = requests.at(-1);
        throw wrapInspectionError(selectionOrigin(last?.index ?? 0, last?.rule.target ?? { kind: 'scene' }), cause);
      }
      pending.push(
        Object.freeze({
          inspector: Object.freeze({ namespace: definition.namespace, name: definition.name }),
          owner: observation.owner,
          occurrence: observation.occurrence,
          provenance: observation.provenance,
          options,
        }),
      );
    }
  }
  pending.sort(
    (left, right) =>
      compareInspectionOccurrences(left.occurrence, right.occurrence) ||
      inspectorRegistryKey(left.inspector).localeCompare(inspectorRegistryKey(right.inspector)),
  );
  return Object.freeze(
    pending.map((request, colorScope) => {
      const appearance: InspectionAppearance = Object.freeze({
        colorScope,
        scopeColor:
          INSPECTION_SCOPE_PALETTE[colorScope % INSPECTION_SCOPE_PALETTE.length] ?? INSPECTION_SCOPE_PALETTE[0],
        warningColor: INSPECTION_WARNING_COLOR,
      });
      return Object.freeze({ ...request, appearance });
    }),
  );
};

/** 判断 authored site 是否可能被 selection 选中，以保持 owner output 按需发布 */
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
