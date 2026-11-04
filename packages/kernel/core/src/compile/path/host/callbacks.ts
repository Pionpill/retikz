import type { PropertyPath } from '@retikz/foundation';

import type {
  InputPathBoundaryLabel,
  InputPathLabel,
  PathDefinitionCompileContext,
  ScenePrimitive,
} from '../../../contract';
import { resolvePathLabel, resolvePathLabelColors } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import type { BoundPathResolution, PathCompileContext } from '../types';
import { emitBoundaryLabelPrimitive } from './boundary-label';
import { emitLabelPrimitive } from './label';

/** 标签回调共享本次 Definition 调用的边界贡献，供最终包装读取 */
export const createPathLabelCallbacks = (
  resolution: BoundPathResolution,
  context: PathCompileContext,
  targetWarn: (code: string, message: string, node?: { irPath?: PropertyPath }) => void,
) => {
  const { scopeDefaults, theme, measureText, round, rootFontSize, lowerTex } = context;
  const { irPath, properties: canonicalPath } = resolution;
  const hostLabelBoundsPoints: Array<IRPosition> = [];
  const resolveHostLabel: PathDefinitionCompileContext['resolveHostLabel'] = label =>
    resolvePathLabel(label, scopeDefaults.path?.label ?? {}, canonicalPath.color);
  const emitHostLabels = (input: InputPathLabel): ReadonlyArray<ScenePrimitive> =>
    input.labels.flatMap((label, index) => {
      const sample = input.samples[index];
      const labelDefault = scopeDefaults.path?.label ?? {};
      const sourcePath = [...irPath, ...input.sourcePath, index];
      const { side, ...labelSource } = label;
      const { position, distance } = labelSource;
      const styled = resolvePathLabelColors(
        labelSource,
        labelDefault.color ?? canonicalPath.color,
        theme.mode,
        sourcePath,
      );
      const emittedLabel = emitLabelPrimitive(
        { ...styled, position, side, distance, interrupt: false, gap: 0 },
        sample,
        {
          measureText,
          round,
          rootFontSize,
          hostOpacity: canonicalPath.opacity,
          placement: { sideOffset: sample.sideOffset },
          tex: {
            lowerTex,
            gatingOn: lowerTex !== undefined,
            warn: (code, message) => targetWarn(code, message, { irPath: sourcePath }),
          },
        },
      );
      hostLabelBoundsPoints.push(...emittedLabel.boundsPoints);

      return [emittedLabel.primitive];
    });
  const emitBoundaryLabels = (input: ReadonlyArray<InputPathBoundaryLabel>): ReadonlyArray<ScenePrimitive> =>
    input.map(request => {
      const labelDefault = scopeDefaults.path?.label ?? {};
      const styled = resolvePathLabelColors(
        resolvePathLabel(request.label, labelDefault, canonicalPath.color),
        labelDefault.color ?? canonicalPath.color,
        theme.mode,
        [...irPath, ...request.sourcePath],
      );
      const emitted = emitBoundaryLabelPrimitive(request, styled, {
        measureText,
        round,
        rootFontSize,
        hostOpacity: canonicalPath.opacity,
        tex: {
          lowerTex,
          gatingOn: lowerTex !== undefined,
          warn: (code, message) => targetWarn(code, message, { irPath: [...irPath, ...request.sourcePath] }),
        },
      });
      hostLabelBoundsPoints.push(...emitted.boundsPoints);
      if (canonicalPath.meta !== undefined) emitted.primitive.meta = canonicalPath.meta;

      return emitted.primitive;
    });

  return { emitHostLabels, resolveHostLabel, emitBoundaryLabels, hostLabelBoundsPoints };
};
