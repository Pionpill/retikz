import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 颜色 override：path stroke 浅灰、箭头深红（脱离 stroke 跟随）
 * @description arrowDetail.color 把 marker 描边 / 实心填充改为指定颜色，覆盖默认的 context-stroke 继承；start / end 子对象的 color 字段同样支持单端 override
 */
const Demo: FC = () => (
  <Layout width={320} height={120}>
    <Node id="a1" position={[0, 0]}>
      A
    </Node>
    <Node id="b1" position={[260, 0]}>
      B
    </Node>
    <Draw way={['a1', 'b1']} arrow="->" arrowDetail={{ color: 'red' }} stroke="gray" strokeWidth={2} />
    <Node id="a2" position={[0, 50]}>
      A
    </Node>
    <Node id="b2" position={[260, 50]}>
      B
    </Node>
    <Draw
      way={['a2', 'b2']}
      arrow="<->"
      arrowDetail={{
        shape: 'stealth',
        start: { color: 'red' },
        end: { color: 'dodgerblue' },
      }}
      stroke="gray"
      strokeWidth={2}
    />
  </Layout>
);

export default Demo;
