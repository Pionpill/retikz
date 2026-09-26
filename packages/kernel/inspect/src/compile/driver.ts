import type {
  AnyCompositeDefinition,
  CompileObservation,
  CompileObservationContext,
  CompileObserverDefinition,
  CompileObserverOutput,
  CompileOptions,
  CompileResult,
  IRScene,
} from '@retikz/core';
import {
  categoricalColorAt,
  isCompileObservationOwnerEqual,
  isCompileOccurrenceEqual,
  observeCompileToScene,
} from '@retikz/core';
import type { JsonValue } from '@retikz/foundation';

import type { InspectorContext } from '../contract';
import { RetikzInspectError, RetikzInspectErrorCode } from '../error';
import type { InspectorRegistry } from '../providers';
import { getResolvedInspectorRegistry } from '../providers';
import { INSPECTION_OBSERVER_KEY } from './constants';
import { wrapInspectionError } from './diagnostics';
import { cloneAndFreezeInspectionJson, sealInspectionScene, snapshotInspectorOutput } from './output';
import {
  admitInspectionSelection,
  canInspectionSelectionRequestSite,
  resolveAdmittedInspectionSelection,
} from './selection';
import type {
  InspectionCompileResult,
  InspectionDiagnostic,
  InspectionDiagnosticOrigin,
  InspectionPlaneEntry,
  InspectionSelection,
  ResolvedInspectionRequest,
} from './types';

type CapturedObservation = Readonly<{ observation: CompileObservation; context: CompileObservationContext }>;
type InspectionObserverOutput = Readonly<{
  inspection: InspectionCompileResult['inspection'];
  diagnostics: ReadonlyArray<InspectionDiagnostic>;
}>;

/** 按当前 occurrence Theme 生成 Inspector callback 使用的冻结外观 */
const inspectionAppearanceOf = (
  colorScope: number,
  theme: CompileObservationContext['theme'],
): InspectorContext['appearance'] =>
  Object.freeze({
    colorScope,
    scopeColor: categoricalColorAt(theme.colors.categorical, colorScope),
    semanticColors: Object.freeze({
      error: theme.colors.semantic.error,
      success: theme.colors.semantic.success,
      warning: theme.colors.semantic.warning,
      guide: theme.colors.semantic.guide,
    }),
  });

/** 创建带结构化 origin 的 Inspect compile 失败 */
const createInspectionCompileError = (message: string, origin: InspectionDiagnosticOrigin): RetikzInspectError =>
  new RetikzInspectError({
    code: RetikzInspectErrorCode.CompileFailed,
    message,
    details: { origin },
  });

/** 创建 subject 解析或 Inspector 回调失败时使用的诊断来源 */
const createInspectionDiagnosticOrigin = (
  stage: 'subject' | 'inspect',
  request: ResolvedInspectionRequest,
): InspectionDiagnosticOrigin =>
  Object.freeze({ stage, inspector: request.inspector, owner: request.owner, occurrence: request.occurrence });

/** 创建 Inspect 输出或 fragment 编译失败时使用的诊断来源 */
const createInspectionOutputDiagnosticOrigin = (
  stage: 'output' | 'fragment',
  request: ResolvedInspectionRequest,
  outputIndex: number,
): InspectionDiagnosticOrigin =>
  Object.freeze({
    stage,
    inspector: request.inspector,
    owner: request.owner,
    occurrence: request.occurrence,
    outputIndex,
  });

/** 将捕获的 observation 编译为 Inspect plane 与诊断结果 */
const compileInspectionObserverOutput = (
  registry: InspectorRegistry,
  admittedRules: ReturnType<typeof admitInspectionSelection>,
  captured: ReadonlyArray<CapturedObservation>,
): InspectionObserverOutput => {
  const resolvedRequests = resolveAdmittedInspectionSelection({
    registry,
    admittedRules,
    observations: captured.map(entry => entry.observation),
  });
  const preparedRequests = resolvedRequests.map(request => {
    const definition = getResolvedInspectorRegistry(registry).require(request.inspector);
    const capturedObservation = captured.find(
      entry =>
        isCompileObservationOwnerEqual(entry.observation.owner, request.owner) &&
        isCompileOccurrenceEqual(entry.observation.occurrence, request.occurrence),
    );
    if (capturedObservation === undefined)
      throw createInspectionCompileError('Inspection complete failed: observation is missing', { stage: 'complete' });
    const appearance = inspectionAppearanceOf(request.colorScope, capturedObservation.context.theme);
    let subject: JsonValue;
    try {
      subject = cloneAndFreezeInspectionJson(
        definition.subjectSchema.parse(capturedObservation.observation.value),
        `Inspector '${definition.namespace}/${definition.type}' subject`,
      );
    } catch (cause) {
      throw wrapInspectionError(createInspectionDiagnosticOrigin('subject', request), cause);
    }
    return { request, definition, capturedObservation, subject, appearance };
  });

  const entries: Array<InspectionPlaneEntry> = [];
  const diagnostics: Array<InspectionDiagnostic> = [];
  for (const preparedRequest of preparedRequests) {
    const context: InspectorContext = Object.freeze({
      round: preparedRequest.capturedObservation.context.round,
      inspectorKey: preparedRequest.request.inspector,
      owner: preparedRequest.request.owner,
      occurrence: preparedRequest.request.occurrence,
      provenance: preparedRequest.request.provenance,
      options: preparedRequest.request.options,
      appearance: preparedRequest.appearance,
      transform: preparedRequest.capturedObservation.observation.transform,
      ancestors: preparedRequest.capturedObservation.observation.ancestors,
      warn: (code: string, message: string): void => {
        diagnostics.push(
          Object.freeze({
            origin: createInspectionDiagnosticOrigin('inspect', preparedRequest.request),
            cause: Object.freeze({ code, message, path: preparedRequest.request.occurrence.sourcePath }),
          }),
        );
      },
    });
    let outputChildren: ReturnType<typeof snapshotInspectorOutput>;
    try {
      const inspect = preparedRequest.definition.inspect as unknown as (
        subject: JsonValue,
        context: InspectorContext,
      ) => Parameters<typeof snapshotInspectorOutput>[0];
      const callbackOutput = inspect(preparedRequest.subject, context);
      try {
        outputChildren = snapshotInspectorOutput(callbackOutput);
      } catch (cause) {
        throw wrapInspectionError(createInspectionOutputDiagnosticOrigin('output', preparedRequest.request, 0), cause);
      }
    } catch (cause) {
      throw wrapInspectionError(createInspectionDiagnosticOrigin('inspect', preparedRequest.request), cause);
    }
    for (const [outputIndex, outputFragment] of outputChildren.entries()) {
      let fragment: ReturnType<CompileObservationContext['compileFragment']>;
      try {
        fragment = preparedRequest.capturedObservation.context.compileFragment(outputFragment.child);
      } catch (cause) {
        throw wrapInspectionError(
          createInspectionOutputDiagnosticOrigin('fragment', preparedRequest.request, outputIndex),
          cause,
        );
      }
      const scene = sealInspectionScene(fragment.scene);
      entries.push(
        Object.freeze({
          inspector: preparedRequest.request.inspector,
          owner: preparedRequest.request.owner,
          occurrence: preparedRequest.request.occurrence,
          colorScope: preparedRequest.request.colorScope,
          scene,
          transform:
            outputFragment.coordinateSpace === 'scene'
              ? Object.freeze([1, 0, 0, 1, 0, 0] as const)
              : preparedRequest.capturedObservation.observation.transform,
        }),
      );
      for (const diagnostic of fragment.diagnostics) {
        diagnostics.push(
          Object.freeze({
            origin: createInspectionOutputDiagnosticOrigin('fragment', preparedRequest.request, outputIndex),
            cause: Object.freeze({ code: diagnostic.code, message: diagnostic.message, path: diagnostic.path }),
          }),
        );
      }
    }
  }
  const frozenDiagnostics = Object.freeze(diagnostics);
  const inspection = entries.length === 0 ? null : Object.freeze({ entries: Object.freeze(entries) });
  return Object.freeze({ inspection, diagnostics: frozenDiagnostics });
};

/** 为 static 或 retained Core compile 创建一次 Inspect observer definition */
export const createInspectionObserver = (
  ir: IRScene,
  registry: InspectorRegistry,
  selection: InspectionSelection,
): CompileObserverDefinition<InspectionObserverOutput> => {
  const capturedSelection = structuredClone(selection);
  const admittedRules = admitInspectionSelection(ir, registry, capturedSelection);
  return Object.freeze({
    key: INSPECTION_OBSERVER_KEY,
    createSession: () => {
      const captured: Array<CapturedObservation> = [];
      return Object.freeze({
        select: (site: Readonly<{ owner: CompileObservation['owner']; sourcePath: string }>) =>
          canInspectionSelectionRequestSite(admittedRules, registry, site.owner, site.sourcePath),
        observe: (observation: CompileObservation, context: CompileObservationContext) => {
          captured.push({ observation, context });
        },
        complete: () => compileInspectionObserverOutput(registry, admittedRules, captured),
      });
    },
  });
};

/** 从同 revision Core primary 与 observer outputs 组装原子 Inspect 结果 */
export const resolveInspectionObserverOutput = (
  primary: CompileResult,
  observerOutputs: ReadonlyArray<CompileObserverOutput>,
): InspectionCompileResult => {
  const matches = observerOutputs.filter(output => output.key === INSPECTION_OBSERVER_KEY);
  if (matches.length !== 1) {
    throw createInspectionCompileError('Inspection complete failed: expected exactly one observer output', {
      stage: 'complete',
    });
  }
  const value = matches[0]?.value;
  if (value === null || typeof value !== 'object') {
    throw createInspectionCompileError('Inspection complete failed: invalid observer output', {
      stage: 'complete',
    });
  }
  const output = value as InspectionObserverOutput;
  if (!Array.isArray(output.diagnostics) || !('inspection' in output)) {
    throw createInspectionCompileError('Inspection complete failed: invalid observer output', {
      stage: 'complete',
    });
  }
  return Object.freeze({ primary, inspection: output.inspection, diagnostics: output.diagnostics });
};

/**
 * 基于 Core observed compile 执行一次原子 Inspector compile
 *
 * @param ir 要编译并观测的 Source Scene IR，不修改输入
 * @param options Inspector 注册表、选择规则与可选 Core 编译配置
 * @returns 同次编译的主图、辅助平面与诊断；无辅助输出时 inspection 为 null
 * @throws 选择、对象解析、Inspector 回调或辅助输出无效时编译失败，不返回部分结果；Core 编译错误沿调用链传播
 * @template TComposites 当前 Scene 可用的 Composite Definition 集合
 */
export const compileInspectionToScene = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  ir: IRScene,
  options: Readonly<{
    registry: InspectorRegistry;
    selection: InspectionSelection;
    compileOptions?: CompileOptions<TComposites>;
  }>,
): InspectionCompileResult => {
  const observer = createInspectionObserver(ir, options.registry, options.selection);
  const observed = observeCompileToScene(ir, options.compileOptions, [observer]);
  return resolveInspectionObserverOutput(observed.primary, observed.observerOutputs);
};
