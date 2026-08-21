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

import { categoricalColorAt, observeCompileToScene } from '@retikz/core';

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
import { cloneAndFreezeInspectionJson, normalizeInspectorOutput, sealInspectionScene } from './output';
import { admitInspectionSelection, resolveInspectionSelection, selectionMayRequestSite } from './selection';

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

const ownerMatches = (left: CompileObservation['owner'], right: CompileObservation['owner']): boolean =>
  left.kind === right.kind &&
  (left.kind === 'pathKind'
    ? right.kind === 'pathKind' && left.name === right.name
    : right.kind === 'composite' && left.namespace === right.namespace && left.type === right.type);

const occurrenceMatches = (left: CompileObservation['occurrence'], right: CompileObservation['occurrence']): boolean =>
  left.sourcePath === right.sourcePath &&
  left.expansionPath.length === right.expansionPath.length &&
  left.expansionPath.every(
    (segment, index) =>
      segment.kind === right.expansionPath[index]?.kind && segment.index === right.expansionPath[index]?.index,
  );

const originFor = (stage: 'subject' | 'inspect', request: ResolvedInspectionRequest): InspectionDiagnosticOrigin =>
  Object.freeze({ stage, inspector: request.inspector, owner: request.owner, occurrence: request.occurrence });

const outputOriginFor = (
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

const completeInspection = (
  ir: IRScene,
  registry: InspectorRegistry,
  selection: InspectionSelection,
  captured: ReadonlyArray<CapturedObservation>,
): InspectionObserverOutput => {
  const requests = resolveInspectionSelection({
    ir,
    registry,
    selection,
    observations: captured.map(entry => entry.observation),
  });
  const prepared = requests.map(request => {
    const definition = registry.require(request.inspector);
    const capture = captured.find(
      entry =>
        ownerMatches(entry.observation.owner, request.owner) &&
        occurrenceMatches(entry.observation.occurrence, request.occurrence),
    );
    if (capture === undefined)
      throw createInspectionCompileError('Inspection complete failed: observation is missing', { stage: 'complete' });
    const appearance = inspectionAppearanceOf(request.colorScope, capture.context.theme);
    let subject: JsonValue;
    try {
      subject = cloneAndFreezeInspectionJson(
        definition.subjectSchema.parse(capture.observation.value),
        `Inspector '${definition.namespace}/${definition.type}' subject`,
      );
    } catch (cause) {
      throw wrapInspectionError(originFor('subject', request), cause);
    }
    return { request, definition, capture, subject, appearance };
  });

  const entries: Array<InspectionPlaneEntry> = [];
  const diagnostics: Array<InspectionDiagnostic> = [];
  for (const item of prepared) {
    const context: InspectorContext = Object.freeze({
      inspector: item.request.inspector,
      owner: item.request.owner,
      occurrence: item.request.occurrence,
      provenance: item.request.provenance,
      options: item.request.options,
      appearance: item.appearance,
    });
    let output: ReturnType<typeof normalizeInspectorOutput>;
    try {
      const inspect = item.definition.inspect as unknown as (
        subject: JsonValue,
        context: InspectorContext,
      ) => Parameters<typeof normalizeInspectorOutput>[0];
      const callbackOutput = inspect(item.subject, context);
      try {
        output = normalizeInspectorOutput(callbackOutput);
      } catch (cause) {
        const outputIndex = Array.isArray(callbackOutput)
          ? (Array.from({ length: callbackOutput.length }, (_, index) => index).find(
              index => !(index in callbackOutput),
            ) ?? 0)
          : 0;
        throw wrapInspectionError(outputOriginFor('output', item.request, outputIndex), cause);
      }
    } catch (cause) {
      throw wrapInspectionError(originFor('inspect', item.request), cause);
    }
    for (const [outputIndex, child] of output.entries()) {
      let fragment: ReturnType<CompileObservationContext['compileFragment']>;
      try {
        fragment = item.capture.context.compileFragment(child);
      } catch (cause) {
        throw wrapInspectionError(outputOriginFor('fragment', item.request, outputIndex), cause);
      }
      const scene = sealInspectionScene(fragment.scene);
      entries.push(
        Object.freeze({
          inspector: item.request.inspector,
          owner: item.request.owner,
          occurrence: item.request.occurrence,
          colorScope: item.request.colorScope,
          scene,
          transform: item.capture.observation.transform,
        }),
      );
      for (const diagnostic of fragment.diagnostics) {
        diagnostics.push(
          Object.freeze({
            origin: outputOriginFor('fragment', item.request, outputIndex),
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
  const admitted = admitInspectionSelection(ir, registry, capturedSelection);
  return Object.freeze({
    key: INSPECTION_OBSERVER_KEY,
    createSession: () => {
      const captured: Array<CapturedObservation> = [];
      return Object.freeze({
        select: (site: Readonly<{ owner: CompileObservation['owner']; sourcePath: string }>) =>
          selectionMayRequestSite(admitted, registry, site.owner, site.sourcePath),
        observe: (observation: CompileObservation, context: CompileObservationContext) => {
          captured.push({ observation, context });
        },
        complete: () => completeInspection(ir, registry, capturedSelection, captured),
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
