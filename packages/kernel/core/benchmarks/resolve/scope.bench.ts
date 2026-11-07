import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { resolveClipRegistry, resolveShapeRegistry, resolveThemeRegistry } from '../../src/providers';
import { resolveScope, resolveScopeInheritance } from '../../src/resolve/scope';
import type { ScopeResolveContext } from '../../src/resolve/scope';
import type { IRScope } from '../../src/schemas';

for (const kind of ['simple', 'inherited', 'reset', 'transforms', 'clip-envelope'] as const) {
  defineBenchmark(
    {
      id: `resolve/scope/${kind}`,
      dimensions: ['Scope 解析', kind, kind === 'transforms' ? '单作用域，4 个变换' : '单作用域，不含子树'],
    },
    () => {
      const themeRegistry = resolveThemeRegistry();
      const parent = resolveScopeInheritance(
        {
          defaults: {
            style: { stroke: 'blue' },
            node: { layout: { padding: 3 } },
            path: { style: { strokeWidth: 2 } },
          },
        },
        themeRegistry,
      );
      const context: ScopeResolveContext = {
        parent,
        themeRegistry,
        shapeRegistry: resolveShapeRegistry(),
        clipRegistry: resolveClipRegistry(),
        irPath: [],
        nodeDistance: 24,
      };
      const source: Omit<IRScope, 'children'> = {
        type: 'scope',
        id: 'scope',
        ...(kind === 'inherited' || kind === 'reset'
          ? {
              defaults: {
                ...(kind === 'reset' ? { reset: ['node'] as Array<'node'> } : {}),
                node: { style: { fill: 'red' } },
              },
            }
          : {}),
        ...(kind === 'transforms'
          ? {
              transforms: [
                { kind: 'rotate' as const, degrees: 30 },
                { kind: 'scale' as const, x: 2 },
                { kind: 'polar-translate' as const, radius: 10, angle: 90 },
                { kind: 'at-translate' as const, direction: 'right' as const, of: 'node' },
              ],
            }
          : {}),
        ...(kind === 'clip-envelope'
          ? {
              boundingShape: 'circle' as const,
              clip: { kind: 'rect', params: { x: 0, y: 0, width: 40, height: 30 } },
            }
          : {}),
      };
      const original = structuredClone(source);
      const parentBefore = structuredClone(parent);
      return {
        run: () => resolveScope(source, context),
        verify: result => {
          expect(result.style.id).toBe('scope');
          expect(result.localNamespace).toBe(false);
          expect(result.animations).toEqual([]);
          expect(result.inheritance.theme).toEqual(parent.theme);
          expect(result.inheritance.defaults.path?.style).toMatchObject({ stroke: 'blue', strokeWidth: 2 });
          expect(result.inheritance.defaults.node?.style.stroke).toBe(kind === 'reset' ? undefined : 'blue');
          expect(result.inheritance.defaults.node?.layout.padding).toBe(kind === 'reset' ? undefined : 3);
          if (kind === 'inherited' || kind === 'reset')
            expect(result.inheritance.defaults.node?.style.fill).toBe('red');
          expect(result.envelope.kind).toBe(kind === 'clip-envelope' ? 'circle' : 'rectangle');
          expect(result.envelope.shape.definition.name).toBe(kind === 'clip-envelope' ? 'ellipse' : 'rectangle');
          if (kind === 'transforms')
            expect(result.transform.transforms).toEqual([
              { kind: 'rotate', degrees: 30, pivot: 'origin' },
              { kind: 'scale', x: 2, y: 2, pivot: 'origin' },
              { kind: 'polar-translate', radius: 10, angle: 90, origin: [0, 0] },
              { kind: 'at-translate', direction: 'right', of: 'node', distance: 24 },
            ]);
          else expect(result.transform.transforms).toEqual([]);
          if (kind === 'clip-envelope')
            expect(result.clip).toMatchObject({
              kind: 'rect',
              definition: { kind: 'rect' },
              params: { kind: 'rect', params: { x: 0, y: 0, width: 40, height: 30 } },
            });
          else expect(result.clip).toBeUndefined();
          expect(source).toEqual(original);
          expect(parent).toEqual(parentBefore);
        },
      };
    },
  );
}
