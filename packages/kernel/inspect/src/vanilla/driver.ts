import type { CompileObservationOwner } from '@retikz/core';
import type {
  VanillaCompileDriver,
  VanillaCompileDriverInput,
  VanillaCompileDriverSession,
  VanillaCompileOutput,
} from '@retikz/vanilla';

import type { InspectionCompileResult, InspectionDiagnostic, InspectionSelection } from '../compile';
import type { InspectorRegistry } from '../providers';

import { createInspectionObserver, resolveInspectionObserverOutput } from '../compile';
import { inspectionPlaneToReadonlyLayers } from '../render';
import { inspectionRulesFromVanillaSite } from './authoring';

const EMPTY_SELECTION: InspectionSelection = { rules: [] };

/** 判断两个领域中立观察所属者是否相同 */
const observationOwnerEquals = (left: CompileObservationOwner, right: CompileObservationOwner): boolean =>
  left.kind === right.kind &&
  (left.kind === 'pathKind'
    ? right.kind === 'pathKind' && left.name === right.name
    : right.kind === 'composite' && left.namespace === right.namespace && left.type === right.type);

type ObservationOwnerCounts = {
  pathKinds: Map<string, number>;
  composites: Map<string, Map<string, number>>;
};

/** 按来源路径与结构化所属者取得当前实例序号并推进计数 */
const takeObservationOwnerIndex = (
  countsBySourcePath: Map<string, ObservationOwnerCounts>,
  sourcePath: string,
  owner: CompileObservationOwner,
): number => {
  let counts = countsBySourcePath.get(sourcePath);
  if (counts === undefined) {
    counts = { pathKinds: new Map(), composites: new Map() };
    countsBySourcePath.set(sourcePath, counts);
  }
  if (owner.kind === 'pathKind') {
    const index = counts.pathKinds.get(owner.name) ?? 0;
    counts.pathKinds.set(owner.name, index + 1);
    return index;
  }
  let typeCounts = counts.composites.get(owner.namespace);
  if (typeCounts === undefined) {
    typeCounts = new Map();
    counts.composites.set(owner.namespace, typeCounts);
  }
  const index = typeCounts.get(owner.type) ?? 0;
  typeCounts.set(owner.type, index + 1);
  return index;
};

/** 判断 Scope 是否来自折叠贡献，因而无法无歧义定位其子树 */
const isCollapsedContributionScope = (
  site: VanillaCompileDriverInput['authoringSites'][number],
  sites: VanillaCompileDriverInput['authoringSites'],
): boolean =>
  site.kind === 'scope' &&
  sites.some(candidate => candidate.sourcePath === site.sourcePath && candidate.owner !== undefined);

/** Inspect Vanilla 编译驱动的固定配置 */
export type CreateInspectionVanillaDriverOptions = Readonly<{
  /** 本次宿主使用的 Inspector registry */
  registry: InspectorRegistry;
  /** 与 plain authoring rules 合并的显式 selection */
  selection?: InspectionSelection;
  /** 每条 committed Inspect diagnostic 的通知 */
  onDiagnostic?: (diagnostic: InspectionDiagnostic) => void;
  /** 含 revision primary、plane 与 diagnostics 成功提交后的通知 */
  onCommit?: (result: InspectionCompileResult) => void;
}>;

/** 隔离 commit callback 失败，避免破坏已经提交的 Vanilla/Render frame */
const deliverCommit = (options: CreateInspectionVanillaDriverOptions, output: VanillaCompileOutput): void => {
  const result = resolveInspectionObserverOutput(output.primary, output.observerOutputs);
  if (options.onDiagnostic !== undefined) {
    for (const diagnostic of result.diagnostics) {
      try {
        options.onDiagnostic(diagnostic);
      } catch (cause) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[retikz] Inspect Vanilla diagnostic callback failed', cause);
        }
      }
    }
  }
  if (options.onCommit !== undefined) {
    try {
      options.onCommit(result);
    } catch (cause) {
      if (process.env.NODE_ENV !== 'production') console.warn('[retikz] Inspect Vanilla commit callback failed', cause);
    }
  }
};

/** 从显式 selection 与基础 normalizer 的作者来源构造本次 compile selection */
const resolveVanillaSelection = (
  input: VanillaCompileDriverInput,
  selection: InspectionSelection,
  registry: InspectorRegistry,
): InspectionSelection => {
  const occurrenceCounts = new Map<string, ObservationOwnerCounts>();
  const authoredRules = input.authoringSites.flatMap(site => {
    const siteRules = inspectionRulesFromVanillaSite(site);
    if (siteRules.length > 0 && isCollapsedContributionScope(site, input.authoringSites)) {
      throw new Error('Inspect nested Scope inside an embeddable contribution cannot be located');
    }
    const owner = site.owner;
    const occurrenceIndex =
      owner === undefined ? undefined : takeObservationOwnerIndex(occurrenceCounts, site.sourcePath, owner);
    return siteRules.map(rule => {
      if (rule.kind !== 'request' || rule.target.kind !== 'self' || rule.target.locator.kind !== 'authored') {
        return rule;
      }
      const definitionOwner = registry.require(rule.inspector).owner;
      if (owner !== undefined && !observationOwnerEquals(owner, definitionOwner)) {
        throw new Error('Inspect self request owner does not match authored site owner');
      }
      if (occurrenceIndex === undefined) return rule;
      return {
        ...rule,
        target: {
          kind: 'self' as const,
          locator: { ...rule.target.locator, occurrenceIndex },
        },
      };
    });
  });
  return { rules: [...selection.rules, ...authoredRules] };
};

/** 创建绑定 Inspector registry、selection 与 committed callbacks 的 Vanilla 编译驱动 */
export const createInspectionVanillaDriver = (options: CreateInspectionVanillaDriverOptions): VanillaCompileDriver => {
  const sessions = new WeakMap<
    object,
    Readonly<{ updateInput: (input: VanillaCompileDriverInput) => void; session: VanillaCompileDriverSession }>
  >();
  return Object.freeze({
    create: input => {
      const existing = sessions.get(input.instance);
      if (existing !== undefined) {
        existing.updateInput(input);
        return existing.session;
      }
      let currentInput = input;
      const observer = Object.freeze({
        key: '@retikz/inspect',
        createSession: () => {
          const selection = resolveVanillaSelection(
            currentInput,
            options.selection ?? EMPTY_SELECTION,
            options.registry,
          );
          return createInspectionObserver(currentInput.source, options.registry, selection).createSession();
        },
      });
      const session: VanillaCompileDriverSession = Object.freeze({
        observers: Object.freeze([observer]),
        resolve: coreOutput => {
          const result = resolveInspectionObserverOutput(coreOutput.result, coreOutput.observerOutputs);
          return Object.freeze({
            primary: result.primary,
            observerOutputs: coreOutput.observerOutputs,
            layers: inspectionPlaneToReadonlyLayers(result.inspection),
            diagnostics: result.diagnostics,
          });
        },
        commit: output => deliverCommit(options, output),
      });
      sessions.set(input.instance, {
        updateInput: nextInput => {
          currentInput = nextInput;
        },
        session,
      });
      return session;
    },
  });
};
