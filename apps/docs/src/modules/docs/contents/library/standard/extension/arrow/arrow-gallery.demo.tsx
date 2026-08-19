import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';
import {
  BarArrowDefinition,
  CrowFootArrowDefinition,
  DiamondArrowDefinition,
  KiteArrowDefinition,
  OpenDiamondArrowDefinition,
  OpenKiteArrowDefinition,
  OpenSquareArrowDefinition,
  SquareArrowDefinition,
} from '@retikz/standard/arrow';

const entries = [
  { shape: 'diamond', column: 0, row: 0 },
  { shape: 'openDiamond', column: 0, row: 1 },
  { shape: 'kite', column: 0, row: 2 },
  { shape: 'openKite', column: 0, row: 3 },
  { shape: 'square', column: 1, row: 0 },
  { shape: 'openSquare', column: 1, row: 1 },
  { shape: 'bar', column: 1, row: 2 },
  { shape: 'crowFoot', column: 1, row: 3 },
] as const;

/** 分两列展示 Standard 的八个可选端点 marker */
const Demo: FC = () => {
  const detail = { color: '#ea580c', scale: 1, lineWidth: 1.5 };

  return (
    <Layout
      width={700}
      height={230}
      viewBox={{ x: 0, y: -85, width: 700, height: 170 }}
      arrows={[
        DiamondArrowDefinition,
        OpenDiamondArrowDefinition,
        KiteArrowDefinition,
        OpenKiteArrowDefinition,
        SquareArrowDefinition,
        OpenSquareArrowDefinition,
        BarArrowDefinition,
        CrowFootArrowDefinition,
      ]}
    >
      {entries.map(({ shape, column, row }) => {
        const x = column * 340;
        const y = -60 + row * 40;
        return [
          <Node
            key={`${shape}-label`}
            position={[65 + x, y]}
            fill="none"
            stroke="none"
            font={{ size: 12 }}
            textColor="gray"
          >
            {shape}
          </Node>,
          <Draw
            key={`${shape}-draw`}
            way={[
              [130 + x, y],
              [300 + x, y],
            ]}
            arrow="->"
            arrowDetail={{ ...detail, end: { ...detail, shape } }}
            stroke="#94a3b8"
            strokeWidth={2}
          />,
        ];
      })}
    </Layout>
  );
};

export default Demo;
