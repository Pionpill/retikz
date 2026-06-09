import { Draw, Layout, Node } from '@retikz/react';
import type { ArrowShape } from '@retikz/core';
import type { FC } from 'react';

/**
 * 4 行 × 2 列对照实心 vs 空心箭头
 * @description 颜色随 path stroke 同步（`context-stroke`），大小随 strokeWidth 缩放；空心 shape 由 compile 把末端 shrink 到 marker 接触点，避免路径中线穿过空心轮廓。
 */
const pairs: ReadonlyArray<readonly [ArrowShape, ArrowShape | null]> = [
  ['normal', 'open'],
  ['stealth', 'openStealth'],
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
        <Draw
          key={`p-${filled}`}
          way={[`a-${filled}`, `b-${filled}`]}
          arrow="->"
          arrowDetail={{ shape: filled }}
          strokeWidth={2}
        />,
      ];
      if (hollow) {
        elements.push(
          <Node key={`a-${hollow}`} id={`a-${hollow}`} position={[COL_X_RIGHT, y]}>
            A
          </Node>,
          <Node key={`b-${hollow}`} id={`b-${hollow}`} position={[COL_X_RIGHT_END, y]}>
            B
          </Node>,
          <Draw
            key={`p-${hollow}`}
            way={[`a-${hollow}`, `b-${hollow}`]}
            arrow="->"
            arrowDetail={{ shape: hollow }}
            strokeWidth={2}
          />,
        );
      }
      return elements;
    })}
  </Layout>
);

export default Demo;
