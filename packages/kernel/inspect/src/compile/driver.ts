import type {
  AnyCompositeDefinition,
  CompileObservation,
  CompileObservationContext,
  CompileObserverDefinition,
  CompileObserverOutput,
  CompileOptions,
  CompileResult,
  IRScene,
  JsonValue,
} from '@retikz/core';

import {
  categoricalColorAt,
  isCompileObservationOwnerEqual,
  isCompileOccurrenceEqual,
  observeCompileToScene,
} from '@retikz/core';

import type { InspectorContext } from '../contract';
import type { InspectorRegistry } from '../providers';
import type {
  InspectionCompileResult,
  InspectionDiagnostic,
  InspectionDiagnosticOrigin,
  InspectionPlaneEntry,
  InspectionSelection,
  ResolvedInspectionRequest,
} from './types';

import { RetikzInspectError, RetikzInspectErrorCode } from '../error';
import { INSPECTION_OBSERVER_KEY } from './constants';
import { wrapInspectionError } from './diagnostics';
import { cloneAndFreezeInspectionJson, sealInspectionScene, snapshotInspectorOutput } from './output';
import { admitInspectionSelection, canInspectionSelectionRequestSite, resolveInspectionSelection } from './selection';

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

const createInspectionDiagnosticOrigin = (
  stage: 'subject' | 'inspect',
  request: ResolvedInspectionRequest,
): InspectionDiagnosticOrigin =>
  Object.freeze({ stage, inspector: request.inspector, owner: request.owner, occurrence: request.occurrence });

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

const compileInspectionObserverOutput = (
  ir: IRScene,
  registry: InspectorRegistry,
  selection: InspectionSelection,
  captured: ReadonlyArray<CapturedObservation>,
): InspectionObserverOutput => {
  const resolvedRequests = resolveInspectionSelection({
    ir,
    registry,
    selection,
    observations: captured.map(entry => entry.observation),
  });
  const preparedRequests = resolvedRequests.map(request => {
    const definition = registry.require(request.inspector);
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
      inspectorKey: preparedRequest.request.inspector,
      owner: preparedRequest.request.owner,
      occurrence: preparedRequest.request.occurrence,
      provenance: preparedRequest.request.provenance,
      options: preparedRequest.request.options,
      appearance: preparedRequest.appearance,
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
        const outputIndex = Array.isArray(callbackOutput)
          ? (Array.from({ length: callbackOutput.length }, (_, index) => index).find(
              index => !(index in callbackOutput),
            ) ?? 0)
          : 0;
        throw wrapInspectionError(
          createInspectionOutputDiagnosticOrigin('output', preparedRequest.request, outputIndex),
          cause,
        );
      }
    } catch (cause) {
      throw wrapInspectionError(createInspectionDiagnosticOrigin('inspect', preparedRequest.request), cause);
    }
    for (const [outputIndex, child] of outputChildren.entries()) {
      let fragment: ReturnType<CompileObservationContext['compileFragment']>;
      try {
        fragment = preparedRequest.capturedObservation.context.compileFragment(child);
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
          transform: preparedRequest.capturedObservation.observation.transform,
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
  const capturedSelection = cloneAndFreezeInspectionJson(selection, 'Inspection selection');
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
        complete: () => compileInspectionObserverOutput(ir, registry, capturedSelection, captured),
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

/** 基于 Core observed compile 执行一次原子 Inspector compile */
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
