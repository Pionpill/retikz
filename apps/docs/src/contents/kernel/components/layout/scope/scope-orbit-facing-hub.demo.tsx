import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/**
 * 轨道 + 自转朝向中心：6 个 satellite 绕 hub 排布，自身朝向始终指向圆心（潮汐锁定）
 * @description chain `[polar-translate(θ, r), rotate(θ + 180)]` 实现"轨道 + 自转"——
 *   array[last] 先应用：rotate 先把 scope 局部坐标系旋转 θ+180°（让 local +x 指向轨道圆心），
 *   再 polar-translate 把 scope 原点推到轨道位置。
 *   单 polar-translate 只平移、不旋转，satellite 朝向恒定（"自由飘浮"）；
 *   叠加 rotate(θ + 180) 才能让 scope 自转，使其前方始终指 hub（"潮汐锁定"）。
 *   视觉验证：6 个标签都"低头看向 hub"——文字朝向随轨道角度连续变化。
 */
const Demo: FC = () => (
  <Layout width={300} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="hub" position={[0, 0]} stroke="none">hub</Node>
    {[0, 60, 120, 180, 240, 300].map(angle => (
      <Scope
        key={angle}
        transforms={[
          { kind: 'polar-translate', origin: 'hub', angle, radius: 105 },
          { kind: 'rotate', degrees: angle + 180 },
        ]}
      >
        <Node position={[0, 0]} stroke="none">{`${angle}°`}</Node>
      </Scope>
    ))}
  </Layout>
);

export default Demo;
