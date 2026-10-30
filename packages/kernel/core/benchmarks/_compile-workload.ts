import type { CompileResult, IRNode, IRPath, IRScene, ScenePrimitive } from '@retikz/core';
import { expect } from 'vitest';

/** 固定配方的流程图；每组十个节点、十二条边、两层作用域 */
export const createCompileWorkload = (nodeCount: number) => {
  const groupCount = nodeCount / 10;
  const children: IRScene['children'] = [];
  const shapes = [
    'rectangle',
    'rectangle',
    'ellipse',
    'diamond',
    'rectangle',
    'ellipse',
    'diamond',
    'rectangle',
    'ellipse',
    'diamond',
  ];
  const expectedText: Array<string> = [];
  for (let group = 0; group < groupCount; group++) {
    const nodes: Array<IRNode> = Array.from({ length: 10 }, (_, index) => {
      const text = `${group}.${index}`;
      expectedText.push(text);
      if (index % 5 === 0) expectedText.push(`L${index}`);
      return {
        type: 'node',
        id: `node-${group}-${index}`,
        shape: shapes[index],
        position:
          index === 1
            ? { direction: 'right', of: `node-${group}-0`, distance: 180 }
            : [(index % 5) * 180, Math.floor(index / 5) * 160],
        text,
        layout: { width: 80, minimumSize: { width: 80, height: 40 }, padding: 0, margin: 0 },
        style:
          index % 2 === 0
            ? {
                fill: {
                  kind: 'linearGradient',
                  angle: 90,
                  stops: [
                    { offset: 0, color: '#dbeafe' },
                    { offset: 1, color: '#93c5fd' },
                  ],
                },
              }
            : undefined,
        label: index % 5 === 0 ? [{ text: `L${index}`, position: 'top' }] : undefined,
      };
    });
    const paths: Array<IRPath> = Array.from({ length: 12 }, (_, index) => {
      const start = index % 10;
      const end = (start + 1) % 10;
      const x = (start % 5) * 180;
      const y = Math.floor(start / 5) * 160;
      const steps: IRPath['children'] = [
        {
          type: 'step',
          kind: 'move',
          to: { id: `node-${group}-${start}`, ...(index === 0 ? { anchor: 'right' } : {}) },
        },
      ];
      if (index >= 8) {
        steps.push({
          type: 'step',
          kind: 'cubic',
          control1: [x + 60, y + 70],
          control2: [(end % 5) * 180 - 60, Math.floor(end / 5) * 160 + 70],
          to: { id: `node-${group}-${end}` },
        });
      } else {
        if (index >= 4) steps.push({ type: 'step', kind: 'line', to: [x + 90, y + 60] });
        steps.push({
          type: 'step',
          kind: 'line',
          to: { id: `node-${group}-${end}`, ...(index === 0 ? { anchor: 'left' } : {}) },
        });
      }
      return {
        type: 'path',
        id: `edge-${group}-${index}`,
        children: steps,
        arrow: index % 2 === 1 ? { end: { shape: 'stealth' } } : undefined,
      };
    });
    children.push({
      type: 'scope',
      transforms: [{ kind: 'translate', x: (group % 10) * 1000, y: Math.floor(group / 10) * 400 }],
      defaults: {
        node: { style: { fill: '#f8fafc', stroke: '#334155' } },
        path: { style: { stroke: '#64748b', strokeWidth: 1 } },
      },
      children: [{ type: 'scope', defaults: { node: { style: { strokeWidth: 1 } } }, children: [...nodes, ...paths] }],
    });
  }
  const ir: IRScene = { type: 'scene', version: 1, children };
  const before = JSON.stringify(ir);
  return {
    ir,
    /** 计时外核对确定性输出，不通过额外编译生成预期值 */
    verify: (result: CompileResult): void => {
      const leaves: Array<ScenePrimitive> = [];
      const edgePaths: Array<{ host: string; primitive: Extract<ScenePrimitive, { type: 'path' }> }> = [];
      let translatedGroups = 0;
      const visit = (primitives: ReadonlyArray<ScenePrimitive>, inheritedId = ''): void => {
        for (const primitive of primitives) {
          const host = primitive.id ?? inheritedId;
          if (primitive.type === 'group') {
            if (primitive.transforms?.some(transform => transform.kind === 'translate')) translatedGroups++;
            visit(primitive.children, host);
          } else {
            leaves.push(primitive);
            if (primitive.type === 'path') {
              if (host.startsWith('edge-')) edgePaths.push({ host, primitive });
              if (primitive.arrowStart) visit(primitive.arrowStart.marker);
              if (primitive.arrowEnd) visit(primitive.arrowEnd.marker);
            }
          }
        }
      };
      visit(result.scene.primitives);
      const text = leaves.flatMap(primitive =>
        primitive.type === 'text' ? primitive.lines.map(line => line.text) : [],
      );
      expect(text.sort()).toEqual([...expectedText].sort());
      expect(leaves.filter(primitive => primitive.type === 'rect')).toHaveLength(groupCount * 4);
      expect(leaves.filter(primitive => primitive.type === 'ellipse')).toHaveLength(groupCount * 3);
      expect(new Set(edgePaths.map(path => path.host)).size).toBe(groupCount * 12);
      expect(edgePaths).toHaveLength(groupCount * 12);
      expect(edgePaths.filter(path => path.primitive.arrowEnd?.shape === 'stealth')).toHaveLength(groupCount * 6);
      expect(leaves.filter(primitive => primitive.type === 'path')).toHaveLength(groupCount * 21);
      expect(leaves).toHaveLength(groupCount * 40);
      expect(edgePaths.filter(path => path.primitive.commands.some(command => command.kind === 'cubic'))).toHaveLength(
        groupCount * 4,
      );
      const firstEdge = edgePaths.find(path => path.host === 'edge-0-0');
      expect(firstEdge?.primitive.commands).toEqual([
        { kind: 'move', to: [40, 0] },
        { kind: 'line', to: [140, 0] },
      ]);
      expect(translatedGroups).toBeGreaterThanOrEqual(groupCount - 1);
      expect(result.scene.resources).toHaveLength(1);
      const resourceIds = new Set(result.scene.resources?.map(resource => resource.id));
      const references = leaves.filter(
        primitive => 'fill' in primitive && typeof primitive.fill === 'object' && primitive.fill.kind === 'resourceRef',
      );
      expect(references).toHaveLength(nodeCount / 2);
      for (const primitive of references) {
        if ('fill' in primitive && typeof primitive.fill === 'object' && primitive.fill.kind === 'resourceRef')
          expect(resourceIds.has(primitive.fill.id)).toBe(true);
      }
      for (const value of Object.values(result.scene.layout)) expect(Number.isFinite(value)).toBe(true);
      expect(result.scene.layout.width).toBeGreaterThan((Math.min(groupCount, 10) - 1) * 1000 + 700);
      expect(result.scene.layout.height).toBeGreaterThan((Math.ceil(groupCount / 10) - 1) * 400 + 160);
      expect(result.artifacts).toEqual([]);
      expect(JSON.stringify(ir)).toBe(before);
    },
  };
};
