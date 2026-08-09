import type { IRScene } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  createFlexLayout,
  createGrid,
  createLegend,
  FlexLayoutDefinition,
  GridDefinition,
  LegendDefinition,
} from '../src';

const gridScene: IRScene = {
  type: 'scene',
  version: 1,
  children: [createGrid({ bounds: { start: [0, 0], end: [10, 10] }, line: { spacing: 10 } })],
};

const flexScene: IRScene = {
  type: 'scene',
  version: 1,
  children: [
    createFlexLayout({
      children: [{ kind: 'flex', key: 'child', child: { type: 'node', id: 'child', position: [0, 0] } }],
    }),
  ],
};

describe('Standard direct definition loading', () => {
  it('compiles selected Standard composites through Core compile options', () => {
    const direct = compileToScene(gridScene, { composites: [GridDefinition] });

    expect(direct.scene.primitives).not.toHaveLength(0);
  });

  it('retains the Core warning when a definition is omitted', () => {
    const warningCodes: Array<string> = [];

    compileToScene(gridScene, {
      onWarn: warning => warningCodes.push(warning.code),
    });

    expect(warningCodes).toContain('COMPOSITE_NOT_REGISTERED');
  });

  it('still requires FlexLayoutDefinition after the public compiler subpath is imported', () => {
    const warningCodes: Array<string> = [];
    const omitted = compileToScene(flexScene, {
      onWarn: warning => warningCodes.push(warning.code),
    });
    const selected = compileToScene(flexScene, { composites: [FlexLayoutDefinition] });

    expect(omitted.scene.primitives).toEqual([]);
    expect(warningCodes).toContain('COMPOSITE_NOT_REGISTERED');
    expect(selected.scene.primitives).not.toEqual([]);
  });

  it('leaves duplicate composite keys for the Core registry to diagnose', () => {
    expect(() => compileToScene(gridScene, { composites: [GridDefinition, GridDefinition] })).toThrow(
      /duplicate composite registration.*standard\.grid/i,
    );
  });

  it('does not implicitly collect definitions for nested Standard samples', () => {
    const legend = createLegend({
      content: {
        kind: 'items',
        items: [
          {
            key: 'grid',
            sample: createGrid({ bounds: { start: [0, 0], end: [10, 10] }, line: { spacing: 10 } }),
          },
        ],
      },
    });

    expect(() =>
      compileToScene({ type: 'scene', version: 1, children: [legend] }, { composites: [LegendDefinition] }),
    ).toThrow(/standard\.grid|composite.*not registered/i);
  });
});
