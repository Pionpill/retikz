import type { CompileResult } from '@retikz/core';
import { categoricalColorAt, compileToScene, DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { AFFINE_IDENTITY } from '@retikz/math';

import type { InspectorOutput } from '../contract';
import { RetikzInspectError, RetikzInspectErrorCode } from '../error';
import { wrapInspectionError } from './diagnostics';
import { freezeInspectionValue, sealInspectionScene, snapshotInspectionValue } from './output';
import { prepareInspectionRequests } from './selection';
import type {
  InspectionCompileOptions,
  InspectionCompileResult,
  InspectionDiagnostic,
  InspectionPlaneEntry,
} from './types';

/** 消费已完成的普通编译结果，仅编译检查器生成的独立辅助 IR */
export const compileInspectionToScene = (
  input: CompileResult,
  options: InspectionCompileOptions,
): InspectionCompileResult => {
  const snapshot = snapshotInspectionValue(input);
  const requests = prepareInspectionRequests(snapshot, options.registry, options.requests);
  const entries: Array<InspectionPlaneEntry> = [];
  const diagnostics: Array<InspectionDiagnostic> = [];
  for (const [colorScope, request] of requests.entries()) {
    const { definition, site, requestIndex } = request;
    const inspector = snapshotInspectionValue({ namespace: definition.namespace, type: definition.type });
    const origin = { stage: 'inspect' as const, requestIndex, inspector, target: site.target };
    const context = Object.freeze({
      inspectorKey: inspector,
      target: snapshotInspectionValue(site.target),
      result: snapshot,
      options: snapshotInspectionValue(request.options),
      appearance: snapshotInspectionValue({
        colorScope,
        scopeColor: categoricalColorAt(DEFAULT_RESOLVED_THEME.colors.categorical, colorScope),
        semanticColors: DEFAULT_RESOLVED_THEME.colors.semantic,
      }),
      ...(site.transform === undefined ? {} : { transform: snapshotInspectionValue(site.transform) }),
    });
    const withWarnings = Object.freeze({
      ...context,
      warn: (code: string, message: string): void => {
        diagnostics.push({ origin, cause: { code, message } });
      },
    });
    let fragments: InspectorOutput;
    try {
      // 注册键与 subject 匹配已在选择阶段建立，异构注册表在此恢复调用关系
      fragments = definition.inspect(site.value as never, withWarnings as never);
    } catch (cause) {
      throw wrapInspectionError(origin, cause);
    }
    for (const [outputIndex, fragment] of fragments.entries()) {
      const fragmentOrigin = { ...origin, stage: 'fragment' as const, outputIndex };
      try {
        if (site.target.kind === 'artifact' && fragment.coordinateSpace !== 'scene') {
          throw new RetikzInspectError(
            RetikzInspectErrorCode.Contract,
            'Artifact fragments must use scene coordinates',
          );
        }
        const result = compileToScene(
          { version: 1, type: 'scene', children: [structuredClone(fragment.child)] },
          {
            ...options.compileOptions,
            onWarn: warning => diagnostics.push({ origin: fragmentOrigin, cause: warning }),
          },
        );
        if (result.scene.primitives.length > 0)
          entries.push({
            inspector,
            target: site.target,
            scene: sealInspectionScene(result.scene),
            transform: fragment.coordinateSpace === 'local' ? (site.transform ?? AFFINE_IDENTITY) : AFFINE_IDENTITY,
          });
      } catch (cause) {
        throw wrapInspectionError(fragmentOrigin, cause);
      }
    }
  }
  return freezeInspectionValue({
    inspection: entries.length === 0 ? null : { entries },
    diagnostics,
  });
};
