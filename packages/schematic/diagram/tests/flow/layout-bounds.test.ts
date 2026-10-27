import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { FlowDiagramArtifact, FlowDiagramDefinitionOptions } from '../../src/flow';
import {
  createFlowDiagramProviderContribution,
  defineFlowLayout,
  FlowDiagramArtifactSchema,
  FlowDiagramSchema,
  FlowLayoutSchema,
  layeredFlowLayoutDefinition,
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

describe('Flow Layout 边界贡献', () => {
  it('保留局部相对位置并在最终图形中包含溢出', () => {
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

  it('投影 Grid 边界，而不删除其本地轨道放置', () => {
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

  it('包括编写边距，但不包括结构贡献中的关系标签添加', () => {
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

  it('拒绝放弃编写排除的自定义提供者', () => {
    const provider = defineFlowLayout({
      ...layeredFlowLayoutDefinition,
      name: 'discard-bounds',
      layout: (input, context) =>
        layeredFlowLayoutDefinition.layout(input, {
          resolveEndpoint: () => {
            throw new Error('Unexpected endpoint query');
          },
          resolveRoutePoints: () => {
            throw new Error('Unexpected waypoint query');
          },
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

  it.each(['right', 'left', 'up', 'down'])('通过 %s 嵌套放置保持主对齐', direction => {
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

  it('当嵌套的 Layout 溢出时，保留完整的 Group 遏制', () => {
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

  it('保留省略和空排除列表的旧结果', () => {
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

  it('使用自定义提供者的共享放置语义', () => {
    const provider = defineFlowLayout({ ...layeredFlowLayoutDefinition, name: 'custom-bounds' });
    const options = { flowLayouts: [provider], defaultFlowLayout: provider.name };

    expect(compile(sourceOf(), options).elements).toEqual(compile(sourceOf()).elements);
  });

  it.each([{ excluded: ['formats', 'formats'] }, { excluded: ['png'] }, { excluded: ['canvas', 'formats'] }])(
    '拒绝其字段中的无效排除 $excluded',
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

  it('往返 Grid 排除而不更改子声明', () => {
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
