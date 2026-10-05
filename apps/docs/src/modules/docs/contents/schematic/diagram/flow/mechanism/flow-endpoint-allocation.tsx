import { Layout, Node, Path, Step } from '@retikz/react';
import { Fragment } from 'react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { flowEndpointAllocationI18n } from './flow-endpoint-allocation.i18n';

/** 端点等分示意图语言 */
export type FlowEndpointAllocationProps = Readonly<{ lang?: Lang }>;

/** 用相同侧边长度对照一个、两个和三个自动分离位置 */
const Demo: FC<FlowEndpointAllocationProps> = props => {
  const { lang = 'zh' } = props;
  const copy = flowEndpointAllocationI18n[lang];

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {[1, 2, 3].map((count, column) => {
        const left = column * 190;
        return (
          <Fragment key={count}>
            <Node
              position={[left + 35, -32]}
              text={copy.titles[column]}
              style={{ stroke: 'none', font: { size: 14 } }}
            />
            <Node
              position={[left + 45, 80]}
              cornerRadius={4}
              layout={{ width: 90, minimumSize: { height: 160 }, padding: 0 }}
              style={{ fill: 'none' }}
            />
            <Node
              position={[left - 16, 0]}
              text="0"
              style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
            />
            <Node
              position={[left - 16, 160]}
              text="1"
              style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
            />
            {Array.from({ length: count }, (_, index) => {
              const fraction = (index + 1) / (count + 1);
              const y = fraction * 160;

              return (
                <Fragment key={index}>
                  <Path style={{ stroke: 'dodgerblue' }}>
                    <Step kind="move" to={[left - 48, y]} />
                    <Step kind="line" to={[left, y]} />
                  </Path>
                  <Node
                    position={[left, y]}
                    shape="circle"
                    layout={{ width: 6, minimumSize: { height: 6 }, padding: 0 }}
                    style={{ fill: 'dodgerblue', stroke: 'none' }}
                  />
                  <Node
                    position={[left + 42, y]}
                    text={String(Number(fraction.toFixed(2)))}
                    style={{ stroke: 'none', textColor: 'dodgerblue', font: { size: 14 } }}
                  />
                </Fragment>
              );
            })}
            <Node
              position={[left + 35, 186]}
              text={copy.side}
              style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
            />
          </Fragment>
        );
      })}
      <Node position={[225, 218]} text={copy.formula} style={{ stroke: 'none', font: { size: 14 } }} />
    </Layout>
  );
};
export default Demo;
