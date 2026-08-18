# ADR-03：Tier 2 IR lowering 后反向转换为 Kernel JSX

- 状态：Accepted
- 决策日期：2026-07-12
- 关联：[v0.3-alpha.2 Tier 2 支撑](../../v0.3/alpha.2/01-tier2-support.md)

## 背景

`convertIRToReactNode` 的参数是完整 `IRScene`，但旧实现遇到带 namespace 的 Tier 2 composite 会抛错，公开类型、运行时和 DSL / IR 双向桥文档因此不一致。React 不应复制 Core 的 composite registry、payload 校验和 lowering

## 决策

Core 公开纯函数 `lowerIRToKernel()`，复用 compile 的 composite registry、schema 校验、递归展开和深度限制，把完整 `IRScene` 转为不含 composite 的递归类型：

```ts
type LoweredIRChild = IRNode | IRPathBase | IRCoordinate | LoweredIRScope;
type LoweredIRScope = Omit<IRScope, 'children'> & { children: Array<LoweredIRChild> };
type LoweredIRScene = Omit<IRScene, 'children'> & { children: Array<LoweredIRChild> };
type LowerIRToKernelOptions = Pick<CompileCompositeOptions, 'composites' | 'maxCompositeDepth'>;

declare const lowerIRToKernel: (ir: IRScene, options?: LowerIRToKernelOptions) => LoweredIRScene;
```

`convertIRToReactNode` 接受同一 options。Tier 1 无需 options，行为保持；Tier 2 通过 `options.composites` 提供 definition。`lowerIRToKernel` 与 `compileToScene` 共享 definition 解析、payload 校验、递归和深度语义，但错误策略不同：compile 对未注册 composite 保持 warning + skip，lowering 必须 fail-loud，错误包含 `namespace.type` 和 IR path。React 转换失败统一以 `convertIRToReactNode:` 包装并保留 composite key、path、payload 或深度诊断

往返契约为：Tier 1 保持结构等价；Tier 2 只保证 lowering 后的渲染语义等价，不恢复原始高层 JSON、Sugar 或自定义 React 组件

## 兼容性与最终结果

Core 新增 lowering function / types；React 只新增 `convertIRToReactNode` 可选 options，现有 Tier 1 调用兼容。IR / Scene schema 不变，不注册 React reverse adapter，不在 React 内展开 composite

## 遗留边界

不恢复自定义 React composite、Sugar、datasets 或函数，不改变 compile 对未注册 composite 的 warning + skip 策略；Vanilla 不新增 JSX 反向转换 API
