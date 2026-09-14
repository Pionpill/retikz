import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { FlowDiagramArtifact, FlowDiagramDefinitionOptions } from '../../src/flow';
import {
  createFlowDiagramProviderContribution,
  defineFlowLayout,
  FlowDiagramArtifactSchema,
  FlowDiagramSchema,
  FlowLayoutSchema,
  LayeredFlowLayoutDefinition,
} from '../../src/flow';

const compile = (source: unknown, options: FlowDiagramDefinitionOptions = {}) => {
  const result = compileToScene(
    { type: 'scene', version: 1, children: [FlowDiagramSchema.parse(source)] },
    {
      ...resolveCoreProviderDependencies({ contributions: [createFlowDiagramProviderContribution(options)] }),
      padding: 0,
      measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
    },
  );
  return FlowDiagramArtifactSchema.parse(
    result.artifacts.find(item => item.kind === 'composite' && item.namespace === 'diagram' && item.type === 'flow')
      ?.value,
  );
};

const elementsOf = (elements: FlowDiagramArtifact['elements']): FlowDiagramArtifact['elements'] =>
  elements.flatMap(element => [element, ...(element.kind === 'entity' ? [] : elementsOf(element.elements))]);

const boundsOf = (artifact: FlowDiagramArtifact, id: string) => {
  const element = elementsOf(artifact.elements).find(item => item.id === id);
  if (element === undefined) throw new Error(`Missing ${id}`);
  return element.bounds;
};

const sourceOf = (direction = 'right', text = 'PNG', excluded: Array<string> = ['formats'], grouped = false) => ({
  namespace: 'diagram',
  type: 'flow',
  routing: { kind: 'straight' },
  entities: [
    { id: 'canvas', text: 'Canvas' },
    { id: 'svg', text: 'SVG' },
    { id: 'png', text },
    { id: 'jpeg', text: ['JPEG', 'format', 'output'] },
  ],
  groups: grouped ? [{ id: 'group', children: ['outputs'] }] : [],
  layouts: [
    { id: 'outputs', kind: 'linear', direction: 'down', children: ['svg', 'row'] },
    { id: 'row', kind: 'linear', direction, gap: 24, children: ['canvas', 'formats'], excludeFromBounds: excluded },
    { id: 'formats', kind: 'linear', direction: 'down', children: ['png', 'jpeg'], gap: 12 },
  ],
  children: grouped ? ['group'] : ['outputs'],
  relations: [
    { source: 'canvas', target: 'png' },
    { source: 'canvas', target: 'jpeg' },
  ],
});

describe('Flow Layout bounds contribution', () => {
  it('retains local relative placement and includes overflow in the final drawing', () => {
    const full = compile(sourceOf('left', 'PNG'.repeat(20), []));
    const excluded = compile(sourceOf('left', 'PNG'.repeat(20)));
    const fullCanvas = boundsOf(full, 'canvas');
    const canvas = boundsOf(excluded, 'canvas');
    const drawing = excluded.regions.drawing.allocationBounds;
    for (const id of ['canvas', 'png', 'jpeg']) {
      const before = boundsOf(full, id);
      const after = boundsOf(excluded, id);
      expect(after.x - canvas.x).toBeCloseTo(before.x - fullCanvas.x, 8);
      expect(after.y - canvas.y).toBeCloseTo(before.y - fullCanvas.y, 8);
      expect(after.x).toBeGreaterThanOrEqual(drawing.x);
      expect(after.y).toBeGreaterThanOrEqual(drawing.y);
      expect(after.x + after.width - drawing.x - drawing.width).toBeLessThan(1e-8);
      expect(after.y + after.height - drawing.y - drawing.height).toBeLessThan(1e-8);
    }
  });

  it('projects Grid bounds without removing its local track placement', () => {
    const source = sourceOf();
    const layouts = source.layouts.map(layout =>
      layout.id === 'row'
        ? {
            kind: 'grid',
            id: 'row',
            children: ['canvas', 'formats'],
            placements: [['canvas', 'formats']],
            excludeFromBounds: ['formats'],
          }
        : layout,
    );
    const artifact = compile({ ...source, layouts });
    const row = boundsOf(artifact, 'row');
    const canvas = boundsOf(artifact, 'canvas');
    expect(row).toEqual(canvas);
    expect(boundsOf(artifact, 'png').x).toBeGreaterThan(canvas.x + canvas.width);
  });

  it('includes authored margins but not relation-label additions in structural contribution', () => {
    const source = sourceOf();
    const artifact = compile({
      ...source,
      entities: source.entities.map(entity =>
        entity.id === 'canvas' ? { ...entity, layout: { margin: { left: 13, right: 3, top: 7, bottom: 2 } } } : entity,
      ),
      relations: [{ source: 'canvas', target: 'png', label: 'A long connection label' }],
    });
    const canvas = boundsOf(artifact, 'canvas');
    const row = boundsOf(artifact, 'row');
    expect(row.x).toBeCloseTo(canvas.x - 13, 8);
    expect(row.y).toBeCloseTo(canvas.y - 7, 8);
    expect(row.width).toBeCloseTo(canvas.width + 16, 8);
    expect(row.height).toBeCloseTo(canvas.height + 9, 8);
  });

  it('rejects a custom provider that discards the authored exclusion', () => {
    const provider = defineFlowLayout({
      ...LayeredFlowLayoutDefinition,
      name: 'discard-bounds',
      layout: (input, context) =>
        LayeredFlowLayoutDefinition.layout(input, {
          placeLayout: placement => {
            const { excludeFromBounds: _excluded, ...layout } = placement.layout;
            void _excluded;
            return context.placeLayout({ ...placement, layout });
          },
        }),
    });
    expect(() => compile(sourceOf(), { flowLayouts: [provider], defaultFlowLayout: provider.name })).toThrow(
      'exclusion',
    );
  });

  it.each(['right', 'left', 'up', 'down'])('keeps the primary aligned through %s nested placement', direction => {
    for (const text of ['PNG', 'PNG'.repeat(20)]) {
      const artifact = compile(sourceOf(direction, text));
      const canvas = boundsOf(artifact, 'canvas');
      const svg = boundsOf(artifact, 'svg');
      const row = boundsOf(artifact, 'row');
      expect(canvas.x + canvas.width / 2).toBeCloseTo(svg.x + svg.width / 2, 8);
      expect(row).toEqual(canvas);
      const png = boundsOf(artifact, 'png');
      const jpeg = boundsOf(artifact, 'jpeg');
      expect(png.x + png.width / 2).toBeCloseTo(jpeg.x + jpeg.width / 2, 8);
      expect(jpeg.y).toBeGreaterThan(png.y + png.height);
      expect(artifact.relations).toHaveLength(2);
    }
  });

  it('preserves complete Group containment when a nested Layout overflows', () => {
    const artifact = compile(sourceOf('left', 'PNG'.repeat(20), ['formats'], true));
    const group = boundsOf(artifact, 'group');
    for (const id of ['canvas', 'svg', 'png', 'jpeg']) {
      const child = boundsOf(artifact, id);
      expect(child.x).toBeGreaterThanOrEqual(group.x);
      expect(child.y).toBeGreaterThanOrEqual(group.y);
      expect(child.x + child.width).toBeLessThanOrEqual(group.x + group.width);
      expect(child.y + child.height).toBeLessThanOrEqual(group.y + group.height);
    }
  });

  it('preserves the old result for omitted and empty exclusion lists', () => {
    const source = sourceOf('right', 'PNG', []);
    const omitted = {
      ...source,
      layouts: source.layouts.map(({ excludeFromBounds: _excluded, ...layout }) => {
        void _excluded;
        return layout;
      }),
    };
    expect(compile(source)).toEqual(compile(omitted));
  });

  it('uses the shared placement semantics for custom providers', () => {
    const provider = defineFlowLayout({ ...LayeredFlowLayoutDefinition, name: 'custom-bounds' });
    const options = { flowLayouts: [provider], defaultFlowLayout: provider.name };
    expect(compile(sourceOf(), options).elements).toEqual(compile(sourceOf()).elements);
  });

  it.each([{ excluded: ['formats', 'formats'] }, { excluded: ['png'] }, { excluded: ['canvas', 'formats'] }])(
    'rejects invalid exclusion $excluded at its field',
    ({ excluded }) => {
      const result = FlowLayoutSchema.safeParse({
        kind: 'linear',
        id: 'row',
        direction: 'right',
        children: ['canvas', 'formats'],
        excludeFromBounds: excluded,
      });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues.some(issue => issue.path[0] === 'excludeFromBounds')).toBe(true);
    },
  );

  it('round-trips Grid exclusion without changing child declarations', () => {
    const source = {
      kind: 'grid',
      id: 'grid',
      children: ['canvas', 'formats'],
      placements: [['canvas', 'formats']],
      excludeFromBounds: ['formats'],
    };
    expect(FlowLayoutSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);
  });
});
