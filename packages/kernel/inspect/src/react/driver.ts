import type { CompileObservationOwner } from '@retikz/core';
import type {
  LayoutCompileDriver,
  LayoutCompileDriverInput,
  LayoutCompileDriverSession,
  LayoutCompileOutput,
} from '@retikz/react';

import type { InspectorRegistry } from '../providers/inspector';
import type { InspectionCompileResult, InspectionDiagnostic, InspectionSelection } from '../shared';

import { createInspectionObserver, resolveInspectionObserverOutput } from '../compile';
import { inspectionPlaneToReadonlyLayers } from '../render';
import { inspectionRulesFromReactSite } from './authoring';

const EMPTY_SELECTION: InspectionSelection = Object.freeze({ rules: Object.freeze([]) });

/** 生成用于同一来源路径实例计数的所属者键 */
const observationOwnerKey = (owner: CompileObservationOwner): string =>
  owner.kind === 'pathKind' ? `pathKind:${owner.name}` : `composite:${owner.namespace}:${owner.type}`;

/** 判断两个领域中立观测所属者是否相同 */
const observationOwnerEquals = (left: CompileObservationOwner, right: CompileObservationOwner): boolean =>
  observationOwnerKey(left) === observationOwnerKey(right);

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
  const occurrenceCounts = new Map<string, number>();
  const authoredRules = input.authoringSites.flatMap(site => {
    const owner = site.owner;
    let occurrenceIndex: number | undefined;
    if (owner !== undefined) {
      const countKey = `${site.sourcePath}\u0000${observationOwnerKey(owner)}`;
      occurrenceIndex = occurrenceCounts.get(countKey) ?? 0;
      occurrenceCounts.set(countKey, occurrenceIndex + 1);
    }
    return inspectionRulesFromReactSite(site).map(rule => {
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
