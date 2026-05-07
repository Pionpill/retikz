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

// React 节点 ↔ IR 桥接：buildIR 内部名保留，对外以 convertReactNodeToIR 暴露（命名 pattern 给后续多框架 adapter 留位）
export { buildIR as convertReactNodeToIR } from './kernel/_builder';
// IR JSON → Kernel element 树（带 key、不裹 Tikz/Fragment 外壳）；Sugar 不可逆——只产 <Node/>/<Path/>/<Step/> 三件套
export { convertIRToReactNode } from './kernel/_unbuilder';
