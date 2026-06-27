import type { IR } from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { Layout } from '@retikz/react';
import type { FC } from 'react';
import { z } from 'zod';

/** 柱宽 / 柱间距 / 满高（user units）——展示用常量，与 IR 无关 */
const BAR_WIDTH = 24;
const GAP = 14;
const MAX_HEIGHT = 80;

/**
 * 示例 Tier 2 type：barChart —— 据 data 数组展开成「一条基线 + N 根柱」（多个 Tier 1 node）。
 * 关键：展开产物的**节点数量由 data.length 决定**、柱高经 value/peak **缩放**——无法 1:1 反推、含算法，
 *   这正是该用 Tier 2 composite 而非 Sugar 的判定线（对照本页「与 Sugar 的区别」表）。
 * core 不内置任何 composite；domain 包用 defineComposite 注册，经 <Layout composites> 注入、节点经 IR 直传。
 */
const barChart = defineComposite({
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('demo'),
    type: z.literal('barChart'),
    data: z.array(z.number()),
  }),
  expand: node => {
    const peak = Math.max(...node.data, 1);
    const step = BAR_WIDTH + GAP;
    const span = (node.data.length - 1) * step + BAR_WIDTH;
    // 一根柱 = 一个 rect 节点；柱高按 value/peak 缩放，柱底贴基线 y=0（屏幕 y+ 朝下 → 中心取 -h/2 使其向上长）
    const bars = node.data.map((value, i) => {
      const height = (value / peak) * MAX_HEIGHT;
      return {
        type: 'node' as const,
        position: [i * step, -height / 2] as [number, number],
        shape: 'rectangle',
        minimumWidth: BAR_WIDTH,
        minimumHeight: height,
        innerXSep: 0,
        innerYSep: 0,
        fill: 'currentColor',
        stroke: 'none',
      };
    });
    return [
      {
        type: 'node' as const,
        position: [((node.data.length - 1) * step) / 2, 0] as [number, number],
        shape: 'rectangle',
        minimumWidth: span,
        minimumHeight: 1.5,
        innerXSep: 0,
        innerYSep: 0,
        fill: 'gray',
        stroke: 'none',
      },
      ...bars,
    ];
  },
});

const ir: IR = {
  version: 1,
  type: 'scene',
  children: [{ namespace: 'demo', type: 'barChart', data: [4, 7, 3, 8, 5, 6] }],
};

const Demo: FC = () => <Layout ir={ir} composites={[barChart]} width={260} height={140} />;

export default Demo;
