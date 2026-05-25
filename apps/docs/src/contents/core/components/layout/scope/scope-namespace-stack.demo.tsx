import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 命名空间栈：localNamespace 屏障 vs 默认透传（叙述性插图）
 * @description 5 个 box 都用 Node 带 id 表达（B/A/Y/X/root），cascade 箭头直接走
 *   <Draw way={['B', 'A']}> id 引用、不写坐标对。
 *   左：A 开 localNamespace（实线），B 不开（虚线）；B 透传，b cascade 到 A 的 frame；
 *       A 屏蔽，a/b 上溯被红色 × 中断（虚线箭头 + 大红 ×）。
 *   右：X / Y 都不开 localNamespace（都虚线）；y → X → root 链式 cascade，
 *       X 能访问 {x, y}，x/y 全落 root。
 *   实线 = 推 frame；虚线 = 透传；红 × = 屏蔽。
 */
const Demo: FC = () => (
  <Layout width={640} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    {/* === 5 个 box Node（带 id，empty 内容，仅当 cascade 箭头的端点） === */}
    <Node id="B" position={[-155, -100]} minimumWidth={250} minimumHeight={40} stroke="gray" dashArray={[4, 3]} />
    <Node id="A" position={[-155, -30]} minimumWidth={250} minimumHeight={60} stroke="gray" />
    <Node id="Y" position={[155, -100]} minimumWidth={250} minimumHeight={40} stroke="gray" dashArray={[4, 3]} />
    <Node id="X" position={[155, -30]} minimumWidth={250} minimumHeight={60} stroke="gray" dashArray={[4, 3]} />
    <Node id="root" position={[0, 55]} minimumWidth={560} minimumHeight={50} stroke="gray" />

    {/* === 标签（各自落在所属 box 内部） === */}
    {/* B */}
    <Node position={[-220, -100]} stroke="none">scope B</Node>
    <Node position={[-80, -100]} stroke="none" textColor="gray">id &quot;b&quot;</Node>

    {/* A */}
    <Node position={[-220, -45]} stroke="none">scope A</Node>
    <Node position={[-80, -45]} stroke="none" textColor="gray">id &quot;a&quot;</Node>
    <Node position={[-210, -20]} stroke="none" textColor="gray">localNamespace</Node>
    <Node position={[-80, -20]} stroke="none" textColor="gray">{`access: {a, b}`}</Node>

    {/* Y */}
    <Node position={[90, -100]} stroke="none">scope Y</Node>
    <Node position={[230, -100]} stroke="none" textColor="gray">id &quot;y&quot;</Node>

    {/* X */}
    <Node position={[90, -45]} stroke="none">scope X</Node>
    <Node position={[230, -45]} stroke="none" textColor="gray">id &quot;x&quot;</Node>
    <Node position={[230, -20]} stroke="none" textColor="gray">{`access: {x, y}`}</Node>

    {/* root */}
    <Node position={[0, 45]} stroke="none">root frame</Node>
    <Node position={[-155, 65]} stroke="none" textColor="gray">a, b hidden by A</Node>
    <Node position={[155, 65]} stroke="none" textColor="gray">x, y cascade to root</Node>

    {/* === Cascade 箭头 === */}
    {/* B → A、Y → X：自然垂直，用 id 引用 */}
    <Draw way={['B', 'A']} arrow="->" stroke="gray" />
    <Draw way={['Y', 'X']} arrow="->" stroke="gray" />

    {/* X → root、A → root：用坐标对保证垂直（root 居中、id 引用会成对角） */}
    <Draw way={[[155, 0], [155, 30]]} arrow="->" stroke="gray" />
    <Draw way={[[-155, 0], [-155, 30]]} arrow="->" stroke="gray" dashPattern={[3, 2]} />

    {/* 红 × 标记，叠在 A→root 箭头中点 (-155, 15)；两条短粗线交叉 */}
    <Draw way={[[-163, 7], [-147, 23]]} stroke="red" strokeWidth={2} />
    <Draw way={[[-147, 7], [-163, 23]]} stroke="red" strokeWidth={2} />
  </Layout>
);

export default Demo;
