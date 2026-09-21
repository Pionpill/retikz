import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import * as root from '../../src';
import * as arrow from '../../src/arrow';
import * as clip from '../../src/clip';
import * as nodeShape from '../../src/node-shape';
import * as ribbon from '../../src/ribbon';
import * as shape from '../../src/shape';

type PackageManifest = {
  exports: Record<string, { types: string; default: string }>;
  publishConfig: {
    exports: Record<string, { types: string; import: string; default: string }>;
  };
};

const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as PackageManifest;

describe('Standard provider subpath exports', () => {
  it('keeps optional providers out of the root entry and makes each capability entry explicit', () => {
    for (const name of [
      'CrossShapeDefinition',
      'TrapezoidShapeDefinition',
      'BarArrowDefinition',
      'KiteArrowDefinition',
      'OpenSquareArrowDefinition',
      'CompoundClipDefinition',
      'RibbonPathKindDefinition',
    ]) {
      expect(root).not.toHaveProperty(name);
    }
    expect(root).not.toHaveProperty('CircleDefinition');
    expect(shape.CircleDefinition).toBeDefined();
    expect(shape).not.toHaveProperty('CrossShapeDefinition');
    expect(nodeShape).not.toHaveProperty('CircleDefinition');
    expect(nodeShape.CrossShapeDefinition).toBeDefined();
    expect(nodeShape.TrapezoidShapeDefinition).toBeDefined();
    expect(nodeShape.CylinderShapeProvider).toBeDefined();
    expect(arrow.BarArrowDefinition).toBeDefined();
    expect(arrow.CrowFootArrowProvider).toBeDefined();
    expect(arrow.KiteArrowDefinition).toBeDefined();
    expect(arrow.OpenKiteArrowProvider).toBeDefined();
    expect(arrow.SquareArrowDefinition).toBeDefined();
    expect(arrow.OpenSquareArrowProvider).toBeDefined();
    expect(arrow).toHaveProperty('StraightBarbArrowDefinition');
    expect(arrow).toHaveProperty('StraightBarbArrowProvider');
    expect(clip.CompoundClipDefinition).toBeDefined();
    expect(ribbon.RibbonPathKindDefinition).toBeDefined();
  });

  it('declares separate node-shape and shape subpaths', () => {
    const entries = ['.', './arrow', './clip', './ribbon', './node-shape', './shape'];
    expect(Object.keys(manifest.exports)).toEqual(entries);
    expect(Object.keys(manifest.publishConfig.exports)).toEqual(entries);
    expect(manifest.exports['./node-shape']).toEqual({
      types: './src/node-shape/index.ts',
      default: './src/node-shape/index.ts',
    });
    expect(manifest.exports['./arrow']).toEqual({ types: './src/arrow/index.ts', default: './src/arrow/index.ts' });
    expect(manifest.exports['./clip']).toEqual({ types: './src/clip/index.ts', default: './src/clip/index.ts' });
    expect(manifest.exports['./ribbon']).toEqual({ types: './src/ribbon/index.ts', default: './src/ribbon/index.ts' });
  });

  it('exports only complete Clip definitions and providers from the clip subpath', () => {
    for (const name of [
      'CircleClipDefinition',
      'EllipseClipDefinition',
      'PolygonClipDefinition',
      'PathClipDefinition',
      'CompoundClipDefinition',
      'CircleClipProvider',
      'EllipseClipProvider',
      'PolygonClipProvider',
      'PathClipProvider',
      'CompoundClipProvider',
      'StandardClipDefinitions',
      'StandardClipProviders',
    ]) {
      expect(clip).toHaveProperty(name);
    }
    for (const name of [
      'CircleClipShapeDefinition',
      'EllipseClipShapeDefinition',
      'PolygonClipShapeDefinition',
      'PathClipShapeDefinition',
      'CompoundClipShapeDefinition',
      'CircleClipShapeProvider',
      'EllipseClipShapeProvider',
      'PolygonClipShapeProvider',
      'PathClipShapeProvider',
      'CompoundClipShapeProvider',
      'StandardClipShapeDefinitions',
    ]) {
      expect(clip).not.toHaveProperty(name);
    }
  });
});
