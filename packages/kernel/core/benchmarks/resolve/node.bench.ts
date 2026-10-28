import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { resolveBoundaryRegistry, resolvePatternRegistry, resolveShapeRegistry } from '../../src/providers';
import { resolveNode } from '../../src/resolve/node';
import type { NodeResolveContext } from '../../src/resolve/node';
import { resolveScopeDefaults } from '../../src/resolve/style';
import type { IRNode } from '../../src/schemas';

for (const kind of ['simple', 'inherited', 'contrast', 'pattern', 'labels'] as const) {
  defineBenchmark(
    { id: `resolve/node/${kind}`, dimensions: ['Node 解析', kind, kind === 'labels' ? '单节点，16 标签' : '单节点'] },
    () => {
      const context: NodeResolveContext = {
        mode: 'light',
        scopeDefaults:
          kind === 'inherited'
            ? resolveScopeDefaults({
                defaults: {
                  style: { stroke: 'blue' },
                  node: { style: { font: { family: 'serif', size: 20 } }, layout: { padding: 3 } },
                },
              })
            : {},
        shapeRegistry: resolveShapeRegistry(),
        boundaryRegistry: resolveBoundaryRegistry(),
        patternRegistry: resolvePatternRegistry(),
        round: value => value,
        irPath: 'node',
        warn: () => {},
        labelDistance: 12,
      };
      const source: IRNode = {
        type: 'node',
        text: 'A',
        ...(kind === 'inherited' ? { style: { stroke: 'red' }, layout: { margin: { y: 2 } } } : {}),
        ...(kind === 'contrast' ? { style: { fill: 'white', textColor: 'contrast' } } : {}),
        ...(kind === 'pattern' ? { style: { fill: { kind: 'pattern', shape: 'dots' } } } : {}),
        ...(kind === 'labels' ? { label: Array.from({ length: 16 }, (_, index) => ({ text: `L${index}` })) } : {}),
      };
      const original = JSON.stringify(source);
      return {
        run: () => resolveNode(source, context),
        verify: result => {
          expect(result.node.position).toEqual([0, 0]);
          expect(result.node.scale).toEqual({ x: 1, y: 1 });
          if (kind === 'inherited')
            expect(result.node).toMatchObject({
              stroke: 'red',
              font: { family: 'serif', size: 20 },
              padding: { top: 3, right: 3, bottom: 3, left: 3 },
              margin: { top: 2, bottom: 2 },
            });
          if (kind === 'contrast') {
            expect(result.node.textColor).toBe('#000000');
            expect(result.node.text).toEqual(['A']);
          }
          if (kind === 'pattern')
            expect(result.node.fill).toMatchObject({ kind: 'paint', pattern: { name: 'dots', size: 8 } });
          if (kind === 'labels') {
            expect(result.node.label).toHaveLength(16);
            expect(result.node.label?.at(-1)).toMatchObject({ text: 'L15', position: 'top', distance: 12 });
          }
          if (kind === 'simple') expect(result.node.text).toEqual(['A']);
          expect(JSON.stringify(source)).toBe(original);
        },
      };
    },
  );
}
