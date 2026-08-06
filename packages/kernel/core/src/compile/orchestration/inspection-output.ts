import type {
  InspectionAppearance,
  InspectionDiagnosticOrigin,
  InspectionPlane,
  InspectorContext,
  InspectorOutput,
  Scene,
  ScenePrimitive,
} from '../../contract';
import type { IRChild, IRJsonObject, JsonValue } from '../../schemas';
import type { CompileWarningInput } from '../warning';
import type { CompileContext } from './context';
import type { PendingInspectionEntry } from './types';

import { ChildSchema } from '../../schemas';
import { cloneAndFreezeJson } from '../../shared/json';
import { CompileWarningCode } from '../constants';
import { safeErrorMessage } from '../probe-failure';
import { createClipRegistry, createPaintRegistry } from '../resource';
import { assertFiniteLayout, computeLayoutFromBounds } from '../scene';
import { applyTransformChain } from '../transform';
import { compareCompileOccurrences, freezeOccurrence } from './artifact';
import { InspectionCompileError, wrapInspectionError } from './inspection-error';
import { compileChildrenToPrimitives } from './traversal';

/** Inspector occurrence 的 canonical 循环色板 */
const InspectionScopePalette = [
  '#2563eb',
  '#7c3aed',
  '#c026d3',
  '#db2777',
  '#ea580c',
  '#a16207',
  '#16a34a',
  '#0f766e',
  '#0891b2',
] as const;

/** Inspector 警告内容的 canonical 推荐颜色 */
const InspectionWarningColor = '#dc2626';

/** 辅助编译中必须提升为 fatal error 的跨命名空间引用 warning */
const FatalAuxiliaryWarningCodes = new Set<string>([
  CompileWarningCode.CompositeNotRegistered,
  CompileWarningCode.UnresolvedNodeReference,
  CompileWarningCode.OffsetBaseUnresolved,
  CompileWarningCode.PolarOriginUnresolved,
  CompileWarningCode.AtTargetUnresolved,
]);

const outputOrigin = (entry: PendingInspectionEntry, outputIndex: number): InspectionDiagnosticOrigin => ({
  kind: 'inspection',
  stage: 'output',
  owner: entry.owner,
  occurrence: entry.occurrence,
  outputIndex,
});

const inspectOrigin = (entry: PendingInspectionEntry): InspectionDiagnosticOrigin => ({
  kind: 'inspection',
  stage: 'inspect',
  owner: entry.owner,
  occurrence: entry.occurrence,
});

const outputIndexOfPath = (path: string): number => {
  const match = /^children\[(\d+)\]/.exec(path);
  return match === null ? 0 : Number(match[1]);
};

const outputIndexOfWarning = (warning: CompileWarningInput): number => outputIndexOfPath(warning.path);

const invokeInspector = (entry: PendingInspectionEntry, appearance: InspectionAppearance): InspectorOutput => {
  const inspect = entry.inspector.inspect as unknown as (
    subject: JsonValue,
    context: InspectorContext<IRJsonObject>,
  ) => InspectorOutput;
  try {
    return inspect(entry.subject, Object.freeze({ occurrence: entry.occurrence, options: entry.options, appearance }));
  } catch (cause) {
    throw wrapInspectionError(inspectOrigin(entry), cause);
  }
};

const outputItems = (entry: PendingInspectionEntry, output: InspectorOutput): Array<unknown> => {
  try {
    if (!Array.isArray(output)) return [output];
    if (Object.getOwnPropertySymbols(output).length > 0) {
      throw new Error('Inspector output array has symbol keys.');
    }
    const propertyNames = Object.getOwnPropertyNames(output);
    if (propertyNames.length !== output.length + 1) {
      const missingIndex = Array.from({ length: output.length }, (_, index) => index).find(index => !(index in output));
      throw Object.assign(new Error('Inspector output must be a dense array without extra properties.'), {
        outputIndex: missingIndex ?? 0,
      });
    }
    return Array.from(output, item => item);
  } catch (cause) {
    const outputIndex =
      cause !== null && typeof cause === 'object' && 'outputIndex' in cause
        ? Number(Reflect.get(cause, 'outputIndex'))
        : 0;
    throw wrapInspectionError(outputOrigin(entry, outputIndex), cause);
  }
};

const normalizeOutput = (entry: PendingInspectionEntry, output: InspectorOutput): Array<IRChild> =>
  outputItems(entry, output).map((item, outputIndex) => {
    const origin = outputOrigin(entry, outputIndex);
    try {
      const detached = cloneAndFreezeJson(item, `Inspector output[${outputIndex}]`);
      const parsed = ChildSchema.parse(detached);
      return cloneAndFreezeJson(parsed, `Inspector output[${outputIndex}] child`);
    } catch (cause) {
      throw wrapInspectionError(origin, cause);
    }
  });

const sealPrimitive = (primitive: ScenePrimitive): ScenePrimitive => {
  const sealed = { ...primitive } as ScenePrimitive & Record<string, unknown>;
  delete sealed.id;
  delete sealed.meta;
  delete sealed.animations;
  if (primitive.type === 'group') sealed.children = primitive.children.map(sealPrimitive);
  return sealed;
};

/** 移除 Scene 可选字段的显式 undefined，收敛为可深冻结的 JSON 对象 */
const omitUndefinedSceneFields = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(omitUndefinedSceneFields);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) =>
      child === undefined ? [] : [[key, omitUndefinedSceneFields(child)]],
    ),
  );
};

const sealScene = (scene: Scene): Scene =>
  cloneAndFreezeJson(
    omitUndefinedSceneFields({
      primitives: scene.primitives.map(sealPrimitive),
      layout: scene.layout,
      ...(scene.resources === undefined ? {} : { resources: scene.resources }),
    }),
    'Inspection entry Scene',
  ) as Scene;

const matrixOf = (entry: PendingInspectionEntry): readonly [number, number, number, number, number, number] => {
  const origin = applyTransformChain([0, 0], entry.scopeChain);
  const xBasis = applyTransformChain([1, 0], entry.scopeChain);
  const yBasis = applyTransformChain([0, 1], entry.scopeChain);
  return [
    xBasis[0] - origin[0],
    xBasis[1] - origin[1],
    yBasis[0] - origin[0],
    yBasis[1] - origin[1],
    origin[0],
    origin[1],
  ];
};

const compileEntryScene = (
  entry: PendingInspectionEntry,
  children: ReadonlyArray<IRChild>,
  context: CompileContext,
): Scene => {
  let failurePath: string | undefined;
  const paint = createPaintRegistry(context.patterns, context.round);
  const clip = createClipRegistry(context.round, context.clips);
  const sandbox: CompileContext = {
    ...context,
    inspection: undefined,
    artifacts: undefined,
    trace: undefined,
    paint,
    clip,
    onWarn: warning => {
      const origin = outputOrigin(entry, outputIndexOfWarning(warning));
      if (FatalAuxiliaryWarningCodes.has(warning.code)) {
        throw wrapInspectionError(origin, new Error(`${warning.code} at ${warning.path}: ${warning.message}`));
      }
      context.onWarn({ ...warning, origin });
    },
  };
  try {
    const compiled = compileChildrenToPrimitives(children, sandbox, {
      styleStack: entry.styleStack,
      theme: entry.theme,
      generated: true,
      observeFailurePath: path => (failurePath ??= path),
    });
    const resources = [...paint.resources(), ...clip.resources()];
    return sealScene({
      primitives: compiled.primitives,
      layout: assertFiniteLayout(computeLayoutFromBounds(compiled.layoutBounds, 0, context.round)),
      ...(resources.length === 0 ? {} : { resources }),
    });
  } catch (cause) {
    if (cause instanceof InspectionCompileError) throw cause;
    const outputIndex = failurePath === undefined ? 0 : outputIndexOfPath(failurePath);
    const contextualCause =
      failurePath === undefined
        ? cause
        : new Error(`${safeErrorMessage(cause, 'Auxiliary child compilation failed')} at ${failurePath}`, { cause });
    throw wrapInspectionError(outputOrigin(entry, outputIndex), contextualCause);
  }
};

/** 稳定排序 Inspector 请求并编译为隔离的静态辅助 Scene */
export const compileInspectionPlane = (
  entries: ReadonlyArray<PendingInspectionEntry>,
  context: CompileContext,
): InspectionPlane | null => {
  if (entries.length === 0) return null;
  const ordered = entries
    .map((entry, index) => ({ entry, index }))
    .sort(
      (left, right) =>
        compareCompileOccurrences(left.entry.occurrence, right.entry.occurrence) || left.index - right.index,
    );
  const sealedEntries = ordered.flatMap(({ entry }, colorScope) => {
    const appearance = Object.freeze({
      colorScope,
      scopeColor: InspectionScopePalette[colorScope % InspectionScopePalette.length],
      warningColor: InspectionWarningColor,
    });
    const children = normalizeOutput(entry, invokeInspector(entry, appearance));
    if (children.length === 0) return [];
    return [
      Object.freeze({
        owner: entry.owner,
        occurrence: freezeOccurrence(entry.occurrence),
        colorScope,
        transform: matrixOf(entry),
        scene: compileEntryScene(entry, children, context),
      }),
    ];
  });
  if (sealedEntries.length === 0) return null;
  return cloneAndFreezeJson({ entries: sealedEntries }, 'Inspection plane');
};
