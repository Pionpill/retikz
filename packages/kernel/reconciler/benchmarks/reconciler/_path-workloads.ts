import type { IRNode, IRPath, IRScene } from '@retikz/core';
import { expect } from 'vitest';

import { createBenchmarkNode, createBenchmarkWorkload, inspectBenchmarkScene } from './_execution';

/** Path 各特征的代表性场景；连接组包含明确披露的支撑节点 */
export const pathBenchmarkCases = [
  { kind: 'line', label: '几何：直线', segments: 1 },
  { kind: 'polyline-8', label: '几何：8 段折线', segments: 8 },
  { kind: 'polyline-128', label: '几何：128 段折线', segments: 128 },
  { kind: 'cubic', label: '几何：三次贝塞尔', segments: 1 },
  { kind: 'smooth-16', label: '几何：smooth 16 过点', segments: 16 },
  { kind: 'smooth-256', label: '几何：smooth 256 过点', segments: 256 },
  { kind: 'reference-absolute', label: '连接：支撑节点＋绝对坐标', segments: 1 },
  { kind: 'reference', label: '连接：矩形自动边界', segments: 1 },
  { kind: 'anchor', label: '连接：显式左右锚点', segments: 1 },
  { kind: 'cross-scope', label: '连接：跨平移 Scope 的显式锚点', segments: 1 },
  { kind: 'ellipse', label: '连接：ellipse 自动边界', segments: 1 },
  { kind: 'diamond', label: '连接：diamond 自动边界', segments: 1 },
  { kind: 'arrow-end', label: '箭头：单端', segments: 1 },
  { kind: 'arrow-both', label: '箭头：双端', segments: 1 },
  { kind: 'labels-1', label: '标签：1 个', segments: 1 },
  { kind: 'labels-8', label: '标签：8 个', segments: 1 },
  { kind: 'marks-1', label: '标记：1 个 plus', segments: 1 },
  { kind: 'marks-8', label: '标记：8 个 plus', segments: 1 },
] as const;

/** 单条路径的复杂度，与批量路径数分别标记 */
type PathBenchmarkCase = (typeof pathBenchmarkCases)[number];

/** 需要额外编译两个端点节点的连接场景 */
export const pathUsesNodes = (kind: PathBenchmarkCase['kind']): boolean =>
  kind === 'reference-absolute' ||
  kind === 'reference' ||
  kind === 'anchor' ||
  kind === 'cross-scope' ||
  kind === 'ellipse' ||
  kind === 'diamond';

/** 每条路径有独立空间、端点与装饰；构造不进入计时 */
export const createPathWorkload = ({ kind, segments }: PathBenchmarkCase, count: number) => {
  const children: IRScene['children'] = [];
  const labelCount = kind === 'labels-1' ? 1 : kind === 'labels-8' ? 8 : 0;
  const markCount = kind === 'marks-1' ? 1 : kind === 'marks-8' ? 8 : 0;
  for (let index = 0; index < count; index++) {
    const y = index * 200;
    const startId = `endpoint-${index}-start`;
    const endId = `endpoint-${index}-end`;
    if (pathUsesNodes(kind)) {
      const shape = kind === 'ellipse' || kind === 'diamond' ? kind : 'rectangle';
      const start: IRNode = { ...createBenchmarkNode(index), id: startId, shape, position: [0, y] };
      const end: IRNode = { ...createBenchmarkNode(index), id: endId, shape, position: [320, y] };
      children.push(start);
      children.push(
        kind === 'cross-scope'
          ? { type: 'scope', transforms: [{ kind: 'translate', x: 20, y: 30 }], children: [end] }
          : end,
      );
    }
    const path: IRPath = {
      type: 'path',
      id: `path-${index}`,
      style: { stroke: '#334155', strokeWidth: 1 },
      children: [{ type: 'step', kind: 'move', to: [0, y] }],
    };
    if (kind === 'cubic') {
      path.children.push({
        type: 'step',
        kind: 'cubic',
        control1: [80, y + 80],
        control2: [240, y - 80],
        to: [320, y],
      });
    } else if (kind === 'smooth-16' || kind === 'smooth-256') {
      path.children.push({
        type: 'step',
        kind: 'smooth',
        points: Array.from({ length: segments }, (_, pointIndex) => [
          ((pointIndex + 1) * 320) / segments,
          y + (pointIndex === segments - 1 ? 0 : (pointIndex % 2) * 20),
        ]),
      });
    } else if (pathUsesNodes(kind) && kind !== 'reference-absolute') {
      const explicit = kind === 'anchor' || kind === 'cross-scope';
      path.children = [
        { type: 'step', kind: 'move', to: { id: startId, ...(explicit ? { anchor: 'right' } : {}) } },
        { type: 'step', kind: 'line', to: { id: endId, ...(explicit ? { anchor: 'left' } : {}) } },
      ];
    } else {
      if (kind === 'reference-absolute') path.children[0] = { type: 'step', kind: 'move', to: [40, y] };
      for (let segment = 1; segment <= segments; segment++) {
        path.children.push({
          type: 'step',
          kind: 'line',
          to: [
            kind === 'reference-absolute' ? 280 : (segment * 320) / segments,
            y + (segment === segments ? 0 : (segment % 2) * 20),
          ],
        });
      }
    }
    if (kind === 'arrow-end' || kind === 'arrow-both')
      path.arrow = { end: { shape: 'stealth' }, ...(kind === 'arrow-both' ? { start: { shape: 'stealth' } } : {}) };
    if (labelCount > 0)
      path.label = Array.from({ length: labelCount }, (_, labelIndex) => ({
        text: `L${labelIndex}`,
        font: { size: 10 },
        position: (labelIndex + 1) / (labelCount + 1),
        side: 'left',
        distance: 8,
      }));
    if (markCount > 0)
      path.marks = Array.from({ length: markCount }, (_, markIndex) => ({
        shape: 'plus',
        pos: (markIndex + 1) / (markCount + 1),
        length: 6,
        width: 6,
      }));
    children.push(path);
  }
  return createBenchmarkWorkload(children, result => {
    const { leaves, owners } = inspectBenchmarkScene(result);
    const paths = leaves
      .filter(primitive => primitive.type === 'path')
      .filter(primitive => owners.get(primitive)?.startsWith('path-'));
    // plus 各自输出一个含两条独立线段的 path；箭头保存在主线 marker 字段中
    expect(paths).toHaveLength(count * (1 + markCount));
    const mainPaths = paths.filter(path => path.commands.filter(command => command.kind === 'move').length === 1);
    expect(mainPaths).toHaveLength(count);
    const first = mainPaths[0];
    const start = first.commands[0];
    const end = first.commands.at(-1);
    expect(start.kind).toBe('move');
    expect(end?.kind).not.toBe('close');
    const referenced = pathUsesNodes(kind);
    const arrowStart = kind === 'arrow-both';
    const arrowEnd = kind === 'arrow-both' || kind === 'arrow-end';
    if (!arrowStart && !arrowEnd) {
      expect(start).toEqual({ kind: 'move', to: [referenced ? 40 : 0, 0] });
      expect(end && 'to' in end ? end.to : undefined).toEqual(
        kind === 'cross-scope' ? [300, 30] : [referenced ? 280 : 320, 0],
      );
    }
    for (const path of mainPaths) {
      expect(path.arrowStart?.shape).toBe(arrowStart ? 'stealth' : undefined);
      expect(path.arrowEnd?.shape).toBe(arrowEnd ? 'stealth' : undefined);
      if (arrowStart) expect(path.arrowStart?.marker.length).toBeGreaterThan(0);
      if (arrowEnd) expect(path.arrowEnd?.marker.length).toBeGreaterThan(0);
    }
    if (kind === 'polyline-8' || kind === 'polyline-128')
      expect(first.commands.filter(command => command.kind === 'line')).toHaveLength(segments);
    if (kind === 'cubic' || kind === 'smooth-16' || kind === 'smooth-256')
      expect(first.commands.filter(command => command.kind === 'cubic')).toHaveLength(segments);
    const texts = leaves.filter(primitive => primitive.type === 'text');
    expect(texts).toHaveLength(count * labelCount);
    expect(texts.flatMap(text => text.lines.map(line => line.text)).sort()).toEqual(
      Array.from({ length: count }, () => Array.from({ length: labelCount }, (_, index) => `L${index}`))
        .flat()
        .sort(),
    );
    if (referenced) {
      const nodeBodies = leaves.filter(primitive => owners.get(primitive)?.startsWith('endpoint-'));
      expect(nodeBodies).toHaveLength(count * 2);
      expect(
        nodeBodies.every(
          primitive => primitive.type === (kind === 'diamond' ? 'path' : kind === 'ellipse' ? 'ellipse' : 'rect'),
        ),
      ).toBe(true);
    }
    expect([...(result.scene.resources?.paints ?? []), ...(result.scene.resources?.clips ?? [])]).toHaveLength(0);
  });
};
