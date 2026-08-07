export * from './authoring-site';
export * from './builder';
export * from './unbuilder';

// React JSX → JSON IR 的语义化别名，保留在 adapter owner 内，根入口只负责 `export *`。
export { buildIR as convertReactNodeToIR } from './builder';
