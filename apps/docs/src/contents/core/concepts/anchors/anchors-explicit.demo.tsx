import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * 显式 anchor 字符串语法（ADR-0004）
 * @description 'A.north' / 'A.east' / 'A.30' / 'A.center'；中央节点 8 条 Draw 用 8 个不同 anchor / 角度作端点强制锁死贴边位置。
 */
const Demo: FC = () => (
  <Tikz width={360} height={260}>
    <Node id="hub" position={[0, 0]}>
      hub
    </Node>
    {/* 8 个外围点位（笛卡尔），各自连到 hub 的某个具名 anchor */}
    <Draw way={[[120, -90], 'hub.north-east']} arrow="->" />
    <Draw way={[[140, 0], 'hub.east']} arrow="->" />
    <Draw way={[[120, 90], 'hub.south-east']} arrow="->" />
    <Draw way={[[0, 110], 'hub.south']} arrow="->" />
    <Draw way={[[-120, 90], 'hub.south-west']} arrow="->" />
    <Draw way={[[-140, 0], 'hub.west']} arrow="->" />
    <Draw way={[[-120, -90], 'hub.north-west']} arrow="->" />
    <Draw way={[[0, -110], 'hub.north']} arrow="->" />
  </Tikz>
);

export default Demo;
