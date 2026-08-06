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

/** Inspect React compile driver 的固定配置 */
export type CreateInspectionLayoutDriverOptions = Readonly<{
  /** 本次 Layout 使用的 Inspector registry */
  registry: InspectorRegistry;
  /** 与 wrapper authoring rules 合并的显式 selection */
  selection?: InspectionSelection;
  /** 每条 committed Inspect diagnostic 的通知 */
  onDiagnostic?: (diagnostic: InspectionDiagnostic) => void;
  /** 同 revision primary、plane 与 diagnostics 成功提交后的通知 */
  onCommit?: (result: InspectionCompileResult) => void;
}>;

/** 隔离 commit callback 失败，避免破坏已经提交的 React/Render frame */
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

/** 从显式 selection 与基础 builder authored sites 构造本次 compile selection */
const resolveReactSelection = (input: LayoutCompileDriverInput, selection: InspectionSelection): InspectionSelection =>
  Object.freeze({
    rules: Object.freeze([
      ...selection.rules,
      ...input.authoringSites.flatMap(site => inspectionRulesFromReactSite(site)),
    ]),
  });

/** 创建绑定 Inspector registry、selection 与 committed callbacks 的 React compile driver */
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
          const selection = resolveReactSelection(currentInput, options.selection ?? EMPTY_SELECTION);
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
