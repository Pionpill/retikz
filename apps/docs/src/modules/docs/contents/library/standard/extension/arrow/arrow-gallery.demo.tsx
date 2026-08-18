import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';
import { DiamondArrowDefinition, OpenDiamondArrowDefinition } from '@retikz/standard/arrow';
import { Fragment } from 'react';

const rows = [
  { solid: 'normal', open: 'open' },
  { solid: 'diamond', open: 'openDiamond' },
] as const;

/** 将 Core 实心箭头与 Standard 空心箭头按行并列对照 */
const Demo: FC = () => {
  const detail = { color: '#ea580c', scale: 1, lineWidth: 1.5 };

  return (
    <Layout
      width={480}
      height={110}
      viewBox={{ x: -20, y: -110, width: 500, height: 110 }}
      arrows={[DiamondArrowDefinition, OpenDiamondArrowDefinition]}
    >
      {rows.map((row, index) => {
        const y = -52 + index * 34;
        return (
          <Fragment key={row.solid}>
            <Draw
              way={[
                [30, y],
                [190, y],
              ]}
              arrow="->"
              arrowDetail={{ ...detail, end: { ...detail, shape: row.solid } }}
              stroke="#94a3b8"
              strokeWidth={2}
            />
            <Draw
              way={[
                [270, y],
                [430, y],
              ]}
              arrow="->"
              arrowDetail={{ ...detail, end: { ...detail, shape: row.open } }}
              stroke="#94a3b8"
              strokeWidth={2}
            />
          </Fragment>
        );
      })}
      <Node position={[110, -82]} align="middle" fill="none" stroke="none" font={{ size: 12 }} textColor="gray">
        solid
      </Node>
      <Node position={[350, -82]} align="middle" fill="none" stroke="none" font={{ size: 12 }} textColor="gray">
        open
      </Node>
    </Layout>
  );
};

export default Demo;
