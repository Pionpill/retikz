import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 分轴 inner sep 与 outer sep 差异
 * @description 默认 padding 走 8 兜底；padding=16 对称、innerXSep/innerYSep button 风格扁宽、outerSep=12 border 不变但 path 端点提前 12 user units 停下，靠末尾一条 Draw 演示。
 */
const Demo: FC = () => (
  <Layout width={540} height={140}>
    <Node id="def" position={[-200, 0]}>default</Node>
    <Node id="sym" position={[-70, 0]} padding={16}>padding=16</Node>
    <Node id="wide" position={[80, 0]} innerXSep={24} innerYSep={4}>button</Node>
    <Node id="outer" position={[220, 0]} outerSep={12}>outerSep=12</Node>
    <Draw way={['outer', 'wide']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
