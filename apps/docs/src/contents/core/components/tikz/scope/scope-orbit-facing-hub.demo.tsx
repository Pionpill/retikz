import { Node, Scope, TikZ } from '@retikz/react';
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
  <TikZ width={420} height={420}>
    <Node id="hub" position={[0, 0]} shape="circle" padding={6}>hub</Node>
    <Scope transforms={[
      { kind: 'polar-translate', origin: 'hub', angle: 0, radius: 140 },
      { kind: 'rotate', degrees: 0 + 180 },
    ]}>
      <Node position={[0, 0]} minimumWidth={50} minimumHeight={22}>0°</Node>
    </Scope>
    <Scope transforms={[
      { kind: 'polar-translate', origin: 'hub', angle: 60, radius: 140 },
      { kind: 'rotate', degrees: 60 + 180 },
    ]}>
      <Node position={[0, 0]} minimumWidth={50} minimumHeight={22}>60°</Node>
    </Scope>
    <Scope transforms={[
      { kind: 'polar-translate', origin: 'hub', angle: 120, radius: 140 },
      { kind: 'rotate', degrees: 120 + 180 },
    ]}>
      <Node position={[0, 0]} minimumWidth={50} minimumHeight={22}>120°</Node>
    </Scope>
    <Scope transforms={[
      { kind: 'polar-translate', origin: 'hub', angle: 180, radius: 140 },
      { kind: 'rotate', degrees: 180 + 180 },
    ]}>
      <Node position={[0, 0]} minimumWidth={50} minimumHeight={22}>180°</Node>
    </Scope>
    <Scope transforms={[
      { kind: 'polar-translate', origin: 'hub', angle: 240, radius: 140 },
      { kind: 'rotate', degrees: 240 + 180 },
    ]}>
      <Node position={[0, 0]} minimumWidth={50} minimumHeight={22}>240°</Node>
    </Scope>
    <Scope transforms={[
      { kind: 'polar-translate', origin: 'hub', angle: 300, radius: 140 },
      { kind: 'rotate', degrees: 300 + 180 },
    ]}>
      <Node position={[0, 0]} minimumWidth={50} minimumHeight={22}>300°</Node>
    </Scope>
  </TikZ>
);

export default Demo;
