import { Node, Path, Step, Tikz } from '@retikz/react';
import type { ArrowShape } from '@retikz/core';
import type { FC } from 'react';

/**
 * 4 行 × 2 列：左列实心、右列对应的空心变体；stealth 没有空心右侧留空。
 *
 * 颜色随 path stroke 自动同步（marker 用 `context-stroke`）；大小随 strokeWidth
 * 缩放（`markerUnits="strokeWidth"`）。空心 shape 由 compile 把线段末端向内
 * shrink 4.8~6 × strokeWidth，让 apex 精准落在原始端点上。
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
  <Tikz width={400} height={220}>
    {pairs.flatMap(([filled, hollow], row) => {
      const y = row * ROW_GAP;
      const elements = [
        <Node key={`a-${filled}`} id={`a-${filled}`} position={[COL_X_LEFT, y]}>
          A
        </Node>,
        <Node key={`b-${filled}`} id={`b-${filled}`} position={[COL_X_LEFT_END, y]}>
          B
        </Node>,
        <Path key={`p-${filled}`} arrow="->" arrowShape={filled} strokeWidth={2}>
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
          <Path key={`p-${hollow}`} arrow="->" arrowShape={hollow} strokeWidth={2}>
            <Step kind="move" to={`a-${hollow}`} />
            <Step kind="line" to={`b-${hollow}`} />
          </Path>,
        );
      }
      return elements;
    })}
  </Tikz>
);

export default Demo;
