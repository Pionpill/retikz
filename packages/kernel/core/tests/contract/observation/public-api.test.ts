import { describe, expect, it } from 'vitest';

import type { IRScene } from '../../../src';

import * as core from '../../../src';

const emptyScene: IRScene = { version: 1, type: 'scene', children: [] };

describe('Core observation public contract', () => {
  it('exports only the domain-neutral observation entry points', () => {
    expect(Reflect.get(core, 'observeCompileToScene')).toBeTypeOf('function');
    expect('InspectorDefinition' in core).toBe(false);
    expect('InspectionPlane' in core).toBe(false);

    const result = core.compileToScene(emptyScene);
    expect('inspection' in result).toBe(false);
  });
});

void emptyScene;
