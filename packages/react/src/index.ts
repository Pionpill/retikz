/**
 * @retikz/react 公开 API
 *
 * Kernel 组件：<Tikz> <Node> <Path> <Step>
 * Sugar 组件：<Draw>
 *
 * 渲染管道：buildIR → compileToScene → renderPrim → SVG
 */

export { Tikz, Node, Path, Step } from './kernel';
export type { TikzProps, NodeProps, PathProps, StepProps } from './kernel';

export { Draw } from './sugar';
export type { DrawProps } from './sugar';
