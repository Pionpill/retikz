import type { PropertyPath } from '@retikz/foundation';

import type {
  InputPathBoundaryLabel,
  InputPathLabel,
  PathDefinitionCompileContext,
  ScenePrimitive,
} from '../../../contract';
import { resolvePathLabel, resolvePathLabelColors, resolvePathLabelContent } from '../../../resolve';
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
    resolvePathLabelContent(
      resolvePathLabelColors(
        resolvePathLabel(label, scopeDefaults.path?.label ?? {}, canonicalPath.color),
        scopeDefaults.path?.label?.color ?? canonicalPath.color,
        theme.mode,
        [...irPath, 'label'],
      ),
      false,
      { rootFontSize, gatingOn: lowerTex !== undefined, warn: targetWarn },
    );
  const emitHostLabels = (input: InputPathLabel): ReadonlyArray<ScenePrimitive> =>
    input.labels.flatMap((label, index) => {
      const sample = input.samples[index];
      const sourcePath = [...irPath, ...input.sourcePath, index];
      const emittedLabel = emitLabelPrimitive({ ...label, interrupt: false, gap: 0 }, sample, {
        measureText,
        round,
        hostOpacity: canonicalPath.opacity,
        placement: { sideOffset: sample.sideOffset },
        tex: {
          lowerTex,
          warn: (code, message) => targetWarn(code, message, { irPath: sourcePath }),
        },
      });
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
      const emitted = emitBoundaryLabelPrimitive(
        request,
        resolvePathLabelContent(
          { ...styled, position: 0, side: 'center', sloped: false, distance: 0, interrupt: false, gap: 0 },
          false,
          {
            rootFontSize,
            gatingOn: lowerTex !== undefined,
            warn: (code, message) => targetWarn(code, message, { irPath: [...irPath, ...request.sourcePath] }),
          },
        ),
        {
          measureText,
          round,
          hostOpacity: canonicalPath.opacity,
          tex: {
            lowerTex,
            warn: (code, message) => targetWarn(code, message, { irPath: [...irPath, ...request.sourcePath] }),
          },
        },
      );
      hostLabelBoundsPoints.push(...emitted.boundsPoints);
      if (canonicalPath.meta !== undefined) emitted.primitive.meta = canonicalPath.meta;

      return emitted.primitive;
    });

  return { emitHostLabels, resolveHostLabel, emitBoundaryLabels, hostLabelBoundsPoints };
};
