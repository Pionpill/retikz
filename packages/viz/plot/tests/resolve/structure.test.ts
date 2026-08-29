import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import * as plot from '../../src';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const source = (path: string): string => readFileSync(resolve(root, path), 'utf8');

describe('resolve source structure', () => {
  it('introduces the resolve owner', () => {
    expect(existsSync(resolve(root, 'src/resolve/index.ts'))).toBe(true);
    for (const path of [
      'src/resolve/theme/index.ts',
      'src/resolve/theme/types.ts',
      'src/resolve/theme/resolve.ts',
      'src/resolve/theme/guide.ts',
      'src/resolve/theme/mapping.ts',
      'src/resolve/theme/token-rule.ts',
    ]) {
      expect(existsSync(resolve(root, path))).toBe(true);
    }
    expect(plot.resolvePlotTheme).toBeTypeOf('function');
  });

  it('keeps Theme data determination out of providers', () => {
    for (const path of [
      'src/providers/theme/mapping.ts',
      'src/providers/theme/theme.ts',
      'src/providers/theme/token-rule.ts',
    ]) {
      expect(existsSync(resolve(root, path))).toBe(false);
    }
  });

  it('keeps Channel and Mark domain resolution out of providers', () => {
    for (const path of [
      'src/resolve/channel/index.ts',
      'src/resolve/channel/types.ts',
      'src/resolve/channel/resolve.ts',
      'src/resolve/mark/index.ts',
      'src/resolve/mark/types.ts',
      'src/resolve/mark/resolve.ts',
    ]) {
      expect(existsSync(resolve(root, path))).toBe(true);
    }
    for (const path of ['src/providers/channel/registry.ts', 'src/providers/mark/registry.ts']) {
      expect(source(path)).not.toMatch(
        /resolveMarkChannels|markDefinitionOf|parseMarkOperation|channelKindsForMark|datumAnchor/,
      );
    }
  });

  it('does not let pipeline directly look up Channel or Mark registries', () => {
    for (const path of [
      'src/pipeline/source-fields.ts',
      'src/pipeline/expand/lower.ts',
      'src/pipeline/expand/legend.ts',
      'src/pipeline/locator/locate.ts',
    ]) {
      expect(source(path)).not.toMatch(/(?:channelRegistry|markRegistry)\.get\(/);
    }
  });

  it('keeps guide tick IR schema-derived and internal context names stage-accurate', () => {
    const sourcePaths = [
      'src/schemas/guide/types.ts',
      'src/schemas/mark/types.ts',
      'src/schemas/encoding/types.ts',
      'src/resolve/guide/ticks.ts',
      'src/shared/layout.ts',
      'src/pipeline/guide/guide.ts',
      'src/pipeline/expand/legend.ts',
      'src/pipeline/expand/frame/scoped.ts',
      'src/providers/channel/shared/common.ts',
      'src/providers/channel/features/node.ts',
      'src/providers/channel/features/path.ts',
      'src/providers/channel/features/scope.ts',
      'src/providers/mark/features/relation.ts',
    ];
    const combined = sourcePaths.map(source).join('\n');
    for (const legacyName of [
      'GuideTickSourceInput',
      'GuideTickLabelFormatInput',
      'PlotAreaInput',
      'PolarCoordinateInput',
      'LegendInput',
      'LegendBaseInput',
      'ResolveScopedFramesInput',
      'MarkValueType',
      'ScaledMarkValueType',
    ]) {
      expect(combined).not.toMatch(new RegExp(`\\b${legacyName}\\b`));
    }
    expect(source('src/resolve/guide/ticks.ts')).toContain('IRPlotGuideTickSource');
    expect(source('src/resolve/guide/ticks.ts')).toContain('IRPlotGuideTickLabelFormat');
  });
});
