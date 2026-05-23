import { Layout, Node, Path, Step } from '@retikz/react';
import type { ArrowShape } from '@retikz/core';
import type { FC } from 'react';

/**
 * 4 行 × 2 列对照实心 vs 空心箭头
 * @description stealth 无空心变体；颜色随 path stroke 同步（`context-stroke`），大小随 strokeWidth 缩放；空心 shape 由 compile 把末端 shrink 4.8~6 × strokeWidth 让 apex 落在原端点。
 */
const pairs: ReadonlyArray<readonly [ArrowShape, ArrowShape | null]> = [
  ['normal', 'open'],
  ['stealth', null],
  ['diamond', 'openDiamond'],
  ['circle', 'openCircle'],
];

/** 每行/每列的端点坐标偏移 */
const ROW_GAP = 50;
const COL_X_LEFT = 0;
const COL_X_LEFT_END = 120;
const COL_X_RIGHT = 220;
const COL_X_RIGHT_END = 340;

const Demo: FC = () => (
  <Layout width={400} height={220}>
    {pairs.flatMap(([filled, hollow], row) => {
      const y = row * ROW_GAP;
      const elements = [
        <Node key={`a-${filled}`} id={`a-${filled}`} position={[COL_X_LEFT, y]}>
          A
        </Node>,
        <Node key={`b-${filled}`} id={`b-${filled}`} position={[COL_X_LEFT_END, y]}>
          B
        </Node>,
        <Path key={`p-${filled}`} arrow="->" arrowDetail={{ shape: filled }} strokeWidth={2}>
          <Step kind="move" to={`a-${filled}`} />
          <Step kind="line" to={`b-${filled}`} />
        </Path>,
      ];
      if (hollow) {
        elements.push(
          <Node key={`a-${hollow}`} id={`a-${hollow}`} position={[COL_X_RIGHT, y]}>
            A
          </Node>,
          <Node key={`b-${hollow}`} id={`b-${hollow}`} position={[COL_X_RIGHT_END, y]}>
            B
          </Node>,
          <Path key={`p-${hollow}`} arrow="->" arrowDetail={{ shape: hollow }} strokeWidth={2}>
            <Step kind="move" to={`a-${hollow}`} />
            <Step kind="line" to={`b-${hollow}`} />
          </Path>,
        );
      }
      return elements;
    })}
  </Layout>
);

export default Demo;
