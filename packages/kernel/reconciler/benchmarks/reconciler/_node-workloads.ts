import type { IRNode } from '@retikz/core';
import { expect } from 'vitest';

import { createBenchmarkNode, createBenchmarkWorkload, inspectBenchmarkScene } from './_execution';

/** 单项变化的 Node 配方；不对各维度做笛卡尔积 */
export const nodeBenchmarkCases = [
  { kind: 'plain', label: '基础：无 ID 矩形' },
  { kind: 'identified', label: '身份：唯一 ID' },
  { kind: 'ellipse', label: '形状：ellipse' },
  { kind: 'circle', label: '形状：circle' },
  { kind: 'diamond', label: '形状：diamond' },
  { kind: 'polygon-6', label: '形状：6 边 polygon' },
  { kind: 'polygon-64', label: '形状：64 边 polygon' },
  { kind: 'text-short', label: '正文：16 字符，自适应宽度' },
  { kind: 'text-long', label: '正文：256 字符，自适应宽度' },
  { kind: 'text-fixed', label: '正文：16 字符，固定宽度折行' },
  { kind: 'labels-1', label: '标签：1 个' },
  { kind: 'labels-8', label: '标签：8 个' },
  { kind: 'gradient-shared', label: '资源：共享渐变' },
  { kind: 'gradient-distinct', label: '资源：各节点不同渐变' },
] as const;

/** Node 场景的实际特征 */
type NodeBenchmarkKind = (typeof nodeBenchmarkCases)[number]['kind'];

/** 确定性批量节点；空节点保持同一尺寸，正文场景单独比较宽度策略 */
export const createNodeWorkload = (kind: NodeBenchmarkKind, count: number) => {
  const bodyText = kind === 'text-long' ? `${'abcd '.repeat(51)}x` : `${'abcd '.repeat(3)}x`;
  const labelCount = kind === 'labels-1' ? 1 : kind === 'labels-8' ? 8 : 0;
  const hasBody = kind === 'text-short' || kind === 'text-long' || kind === 'text-fixed';
  const nodes = Array.from({ length: count }, (_, index): IRNode => {
    const node = createBenchmarkNode(index);
    if (kind === 'identified') node.id = `node-${index}`;
    if (kind === 'ellipse' || kind === 'circle' || kind === 'diamond') node.shape = kind;
    // circle 使用方形约束，避免显式的非等轴尺寸把输出拉成椭圆
    if (kind === 'circle') node.layout = { width: 80, minimumSize: 80, padding: 0, margin: 0 };
    if (kind === 'polygon-6' || kind === 'polygon-64')
      node.shape = { type: 'polygon', params: { sides: kind === 'polygon-6' ? 6 : 64 } };
    if (hasBody) {
      node.text = bodyText;
      node.layout = { padding: 0, margin: 0, minimumSize: 0, ...(kind === 'text-fixed' ? { width: 40 } : {}) };
    }
    if (labelCount > 0) {
      const positions = ['top', 'right', 'bottom', 'left'] as const;
      node.label = Array.from({ length: labelCount }, (_label, labelIndex) => ({
        text: `L${labelIndex}`,
        position: positions[labelIndex % positions.length],
        distance: 12 + Math.floor(labelIndex / 4) * 20,
      }));
    }
    if (kind === 'gradient-shared' || kind === 'gradient-distinct')
      node.style = {
        ...node.style,
        fill: {
          kind: 'linearGradient',
          angle: 0,
          stops: [
            { offset: 0, color: kind === 'gradient-shared' ? '#dbeafe' : `#${index.toString(16).padStart(6, '0')}` },
            { offset: 1, color: '#93c5fd' },
          ],
        },
      };
    return node;
  });
  return createBenchmarkWorkload(nodes, result => {
    const { leaves, groups } = inspectBenchmarkScene(result);
    const bodies = leaves.filter(primitive => primitive.type !== 'text');
    expect(bodies).toHaveLength(count);
    const expectedType =
      kind === 'ellipse' || kind === 'circle'
        ? 'ellipse'
        : kind === 'diamond' || kind === 'polygon-6' || kind === 'polygon-64'
          ? 'path'
          : 'rect';
    expect(bodies.every(primitive => primitive.type === expectedType)).toBe(true);
    const firstBody = bodies[0];
    if (firstBody.type === 'rect') {
      expect(firstBody.width).toBe(kind === 'text-fixed' ? 40 : hasBody ? bodyText.length * 5 : 80);
      if (kind === 'plain' || kind === 'identified') expect(firstBody.height).toBe(40);
    }
    if (firstBody.type === 'ellipse') {
      expect(firstBody.rx).toBeGreaterThanOrEqual(40);
      expect(firstBody.ry).toBeGreaterThanOrEqual(20);
      if (kind === 'circle') expect(firstBody.rx).toBe(firstBody.ry);
    }
    if (firstBody.type === 'path') {
      const sides = kind === 'polygon-64' ? 64 : kind === 'polygon-6' ? 6 : 4;
      expect(firstBody.commands.filter(command => command.kind === 'line')).toHaveLength(sides - 1);
      expect(firstBody.commands.at(-1)?.kind).toBe('close');
    }
    const texts = leaves.filter(primitive => primitive.type === 'text');
    expect(texts).toHaveLength(count * (hasBody ? 1 : labelCount));
    if (hasBody) {
      for (const text of texts)
        expect(
          text.lines
            .map(line => line.text)
            .join('')
            .replaceAll(' ', ''),
        ).toBe(bodyText.replaceAll(' ', ''));
      expect(texts[0].lines.length).toBe(kind === 'text-fixed' ? 3 : 1);
    } else if (labelCount > 0) {
      const actual = texts.flatMap(text => text.lines.map(line => line.text)).sort();
      const expected = nodes.flatMap(() => Array.from({ length: labelCount }, (_, index) => `L${index}`)).sort();
      expect(actual).toEqual(expected);
    }
    if (kind === 'identified') {
      const ids = [...groups, ...leaves].flatMap(primitive =>
        primitive.id?.startsWith('node-') ? [primitive.id] : [],
      );
      expect(new Set(ids).size).toBe(count);
    }
    const resourceCount = kind === 'gradient-shared' ? 1 : kind === 'gradient-distinct' ? count : 0;
    expect(result.scene.resources ?? []).toHaveLength(resourceCount);
    if (resourceCount > 0)
      expect(bodies.filter(primitive => 'fill' in primitive && typeof primitive.fill === 'object')).toHaveLength(count);
  });
};
