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

/** Inspect Vanilla 编译驱动的固定配置 */
export type CreateInspectionVanillaDriverOptions = Readonly<{
  /** 本次宿主使用的 Inspector registry */
  registry: InspectorRegistry;
  /** 与 plain authoring rules 合并的显式 selection */
  selection?: InspectionSelection;
  /** 每条 committed Inspect diagnostic 的通知 */
  onDiagnostic?: (diagnostic: InspectionDiagnostic) => void;
  /** 同 revision primary、plane 与 diagnostics 成功提交后的通知 */
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

/** 从显式 selection 与基础 normalizer authored sites 构造本次 compile selection */
const resolveVanillaSelection = (
  input: VanillaCompileDriverInput,
  selection: InspectionSelection,
): InspectionSelection => ({
  rules: [...selection.rules, ...input.authoringSites.flatMap(site => inspectionRulesFromVanillaSite(site))],
});

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
          const selection = resolveVanillaSelection(currentInput, options.selection ?? EMPTY_SELECTION);
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
