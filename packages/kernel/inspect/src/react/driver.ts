import type { CompileObservationOwner } from '@retikz/core';
import type {
  LayoutCompileDriver,
  LayoutCompileDriverInput,
  LayoutCompileDriverSession,
  LayoutCompileOutput,
} from '@retikz/react';

import type { InspectionCompileResult, InspectionDiagnostic, InspectionSelection } from '../compile';
import type { InspectorRegistry } from '../providers';

import { createInspectionObserver, resolveInspectionObserverOutput } from '../compile';
import { inspectionPlaneToReadonlyLayers } from '../render';
import { inspectionRulesFromReactSite } from './authoring';

const EMPTY_SELECTION: InspectionSelection = Object.freeze({ rules: Object.freeze([]) });

/** 判断两个领域中立观测所属者是否相同 */
const observationOwnerEquals = (left: CompileObservationOwner, right: CompileObservationOwner): boolean =>
  left.kind === right.kind &&
  (left.kind === 'pathKind'
    ? right.kind === 'pathKind' && left.name === right.name
    : right.kind === 'composite' && left.namespace === right.namespace && left.type === right.type);

type ObservationOwnerCounts = {
  pathKinds: Map<string, number>;
  composites: Map<string, Map<string, number>>;
};

/** 按来源路径与结构化 owner 取得当前实例序号并推进计数 */
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

/** 判断 Scope 是否来自已折叠来源路径的嵌入贡献，因而无法无歧义定位子树 */
const isCollapsedContributionScope = (
  site: LayoutCompileDriverInput['authoringSites'][number],
  sites: LayoutCompileDriverInput['authoringSites'],
): boolean =>
  site.kind === 'scope' &&
  sites.some(candidate => candidate.sourcePath === site.sourcePath && candidate.owner !== undefined);

/** React 检查编译驱动的固定配置 */
export type CreateInspectionLayoutDriverOptions = Readonly<{
  /** 本次布局使用的检查器注册表 */
  registry: InspectorRegistry;
  /** 与包装组件声明规则合并的显式选择结果 */
  selection?: InspectionSelection;
  /** 每条已提交检查诊断的通知 */
  onDiagnostic?: (diagnostic: InspectionDiagnostic) => void;
  /** 同一版本的主结果、辅助平面与诊断成功提交后的通知 */
  onCommit?: (result: InspectionCompileResult) => void;
}>;

/** 隔离提交回调失败，避免破坏已经提交的 React 与 Render 帧 */
const deliverCommit = (options: CreateInspectionLayoutDriverOptions, output: LayoutCompileOutput): void => {
  const result = resolveInspectionObserverOutput(output.primary, output.observerOutputs);
  if (options.onDiagnostic !== undefined) {
    for (const diagnostic of result.diagnostics) {
      try {
        options.onDiagnostic(diagnostic);
      } catch (cause) {
        if (process.env.NODE_ENV !== 'production')
          console.warn('[retikz] Inspect React diagnostic callback failed', cause);
      }
    }
  }
  if (options.onCommit !== undefined) {
    try {
      options.onCommit(result);
    } catch (cause) {
      if (process.env.NODE_ENV !== 'production') console.warn('[retikz] Inspect React commit callback failed', cause);
    }
  }
};

/** 从显式选择结果与基础构建器声明位置构造本次编译选择结果 */
const resolveReactSelection = (
  input: LayoutCompileDriverInput,
  selection: InspectionSelection,
  registry: InspectorRegistry,
): InspectionSelection => {
  const occurrenceCounts = new Map<string, ObservationOwnerCounts>();
  const authoredRules = input.authoringSites.flatMap(site => {
    const siteRules = inspectionRulesFromReactSite(site);
    if (siteRules.length > 0 && isCollapsedContributionScope(site, input.authoringSites)) {
      throw new Error('Inspect React nested Scope inside an embeddable contribution cannot be located');
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
        throw new Error('Inspect React self request owner does not match authored site owner');
      }
      if (occurrenceIndex === undefined) return rule;
      return Object.freeze({
        ...rule,
        target: Object.freeze({
          kind: 'self' as const,
          locator: Object.freeze({ ...rule.target.locator, occurrenceIndex }),
        }),
      });
    });
  });
  return Object.freeze({ rules: Object.freeze([...selection.rules, ...authoredRules]) });
};

/** 创建绑定检查器注册表、选择结果与提交回调的 React 编译驱动 */
export const createInspectionLayoutDriver = (options: CreateInspectionLayoutDriverOptions): LayoutCompileDriver => {
  const sessions = new WeakMap<
    object,
    Readonly<{ updateInput: (input: LayoutCompileDriverInput) => void; session: LayoutCompileDriverSession }>
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
          const selection = resolveReactSelection(currentInput, options.selection ?? EMPTY_SELECTION, options.registry);
          return createInspectionObserver(currentInput.source, options.registry, selection).createSession();
        },
      });
      const session: LayoutCompileDriverSession = Object.freeze({
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
        commit: (output: LayoutCompileOutput) => deliverCommit(options, output),
      });
      sessions.set(
        input.instance,
        Object.freeze({
          updateInput: (nextInput: LayoutCompileDriverInput) => {
            currentInput = nextInput;
          },
          session,
        }),
      );
      return session;
    },
  });
};
