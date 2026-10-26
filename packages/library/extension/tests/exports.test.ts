import { readFileSync } from 'node:fs';

import * as extension from '@retikz/extension';
import { describe, expect, it } from 'vitest';

type PackageManifest = {
  exports: Record<string, unknown>;
  publishConfig: { exports: Record<string, unknown> };
  dependencies: Record<string, string>;
  sideEffects: boolean;
};

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as PackageManifest;

describe('扩展公共条目', () => {
  it('从一个根导出每个可选功能', () => {
    for (const name of [
      'CrossShapeDefinition',
      'TrapezoidShapeDefinition',
      'CylinderShapeProvider',
      'BarArrowDefinition',
      'CrowFootArrowProvider',
      'KiteArrowDefinition',
      'OpenSquareArrowProvider',
      'CompoundClipDefinition',
      'PathClipProvider',
      'RibbonPathDefinition',
      'ExtensionShapeDefinitions',
      'ExtensionArrowProviders',
      'ExtensionClipDefinitions',
      'RetikzExtensionError',
      'pulse',
    ])
      expect(extension).toHaveProperty(name);

    expect(extension).not.toHaveProperty('CircleDefinition');
    expect(extension).not.toHaveProperty('GridDefinition');
    expect(extension).not.toHaveProperty('SurfaceDefinition');
  });

  it('具有一个源和已发布的条目，没有第 2 层或宿主依赖性', () => {
    expect(Object.keys(manifest.exports)).toEqual(['.']);
    expect(Object.keys(manifest.publishConfig.exports)).toEqual(['.']);
    expect(manifest.sideEffects).toBe(false);

    for (const name of ['@retikz/layout', '@retikz/standard', '@retikz/react', '@retikz/vanilla']) {
      expect(manifest.dependencies).not.toHaveProperty(name);
    }
  });
});
