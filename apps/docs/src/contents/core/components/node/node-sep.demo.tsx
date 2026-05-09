import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * 4 个节点对照分轴 inner sep 与 outer sep 的差异：
 * - 左 1：默认（padding 走 8 兜底）
 * - 左 2：padding={16}——对称内边距
 * - 右 1：innerXSep={24} innerYSep={4}——button 风格扁宽节点
 * - 右 2：outerSep={12}——border 不变，path 端点贴在 border 外 12 处
 *
 * 末尾用一条 Draw 把 outerSep 节点和 button 节点连起来——
 * 线段在 outer 的 border 外提前 12 user units 停下（可见间隙），
 * 同时 button 端贴 border 直接相连——把"outerSep 影响 path 附着点而非 border"演给眼睛看。
 */
const Demo: FC = () => (
  <Tikz width={540} height={140}>
    <Node id="def" position={[-200, 0]}>default</Node>
    <Node id="sym" position={[-70, 0]} padding={16}>padding=16</Node>
    <Node id="wide" position={[80, 0]} innerXSep={24} innerYSep={4}>button</Node>
    <Node id="outer" position={[220, 0]} outerSep={12}>outerSep=12</Node>
    <Draw way={['outer', 'wide']} arrow="->" />
  </Tikz>
);

export default Demo;
