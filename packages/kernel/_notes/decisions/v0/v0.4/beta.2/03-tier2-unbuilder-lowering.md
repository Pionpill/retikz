# ADR-03：Tier 2 IR lowering 后反向转换为 Kernel JSX

- 状态：Accepted
- 决策日期：2026-07-12
- 验收日期：2026-07-14
- 实现提交：`811097df`
- 关联：[beta.2 roadmap](./roadmap.md) · [v0.4 roadmap](../roadmap.md) · [v0.3-alpha.2 Tier 2 支撑](../../v0.3/alpha.2/01-tier2-support.md)

## 背景

`convertIRToReactNode(ir)` 的公开参数是完整 `IRScene`，其 children 可以包含带 `namespace` 的 Tier 2 composite；旧实现却在遇到 composite 时直接抛错，导致公开类型、运行时行为和“DSL / IR 双向桥”文档不一致。

Tier 2 schema、Definition registry、payload 校验、递归展开与深度限制由 `@retikz/core` 拥有。React adapter 不能重写一套 lowering，也不能承诺恢复原始自定义 React 组件；稳定边界只能是先展开为 Tier 1，再生成语义等价的 Kernel JSX。

## 决策

`@retikz/core` 公开纯函数 `lowerIRToKernel()`，复用 compile 的 composite registry 与 fixpoint 展开，把完整 `IRScene` 转为不再包含 composite 的递归类型：

```ts
export type LoweredIRChild = IRNode | IRPathBase | IRCoordinate | LoweredIRScope;

export type LoweredIRScope = Omit<IRScope, 'children'> & {
  children: Array<LoweredIRChild>;
};

export type LoweredIRScene = Omit<IRScene, 'children'> & {
  children: Array<LoweredIRChild>;
};

export type LowerIRToKernelOptions = Pick<CompileCompositeOptions, 'composites' | 'maxCompositeDepth'>;

export const lowerIRToKernel = (
  ir: IRScene,
  options?: LowerIRToKernelOptions,
): LoweredIRScene;
```

`lowerIRToKernel()` 与 `compileToScene()` 共享 definition 解析、payload 校验、递归展开和最大深度语义，但错误策略不同：

- `compileToScene()` 保持 warning 后跳过未注册 composite，继续编译其余内容。
- `lowerIRToKernel()` 必须 fail-loud，错误包含 `namespace.type` 与 IR path，禁止静默丢节点。

React 的 `convertIRToReactNode()` 接受同一组 lowering options：

```ts
export type ConvertIRToReactNodeOptions = LowerIRToKernelOptions;

export const convertIRToReactNode = (
  ir: IRScene,
  options?: ConvertIRToReactNodeOptions,
): ReactNode;
```

Tier 1 输入不需要 options，行为保持不变；Tier 2 输入通过 `options.composites` 提供 Definition。转换失败统一以 `convertIRToReactNode:` 包装 cause，并保留 composite key、IR path、payload 或深度诊断。

结构往返契约分为：

```ts
convertReactNodeToIR(convertIRToReactNode(tier1IR)) === tier1IR;

convertReactNodeToIR(convertIRToReactNode(tier2IR, { composites })) === lowerIRToKernel(tier2IR, { composites });
```

Tier 2 只保证 lowering 后的渲染语义等价，不保证恢复原始高层 JSON 结构、Sugar 或自定义 React 组件。

## 兼容性与否决方案

- `@retikz/core` 新增 `lowerIRToKernel` 与 `LoweredIR*` 公共类型；IR / Scene schema 不变。
- `@retikz/react` 只为 `convertIRToReactNode` 增加可选 options，现有 Tier 1 调用源码兼容。
- 不把参数收窄为 Tier 1：普通 `IRScene` 不应要求额外 type guard 或断言。
- 不注册 React reverse adapter：Definition 不拥有组件名与 props 映射，强加该契约会制造 React 专属扩展面。
- 不在 React 内展开 composite：这会复制 core 的 registry、校验与深度语义。

## 最终实现

- `@retikz/core` 的 compile owner 提供公开 fail-loud wrapper，并与既有 composite traversal 共享 lowering 实现。
- `@retikz/react` unbuilder 在生成 Kernel JSX 前统一调用 core lowering；Tier 1 与 Tier 2 走同一后续转换路径。
- public API guards 固定新增导出、options 形状与错误诊断；README、Layout overview 和 beta.2 changelog 同步语义等价边界。

## 验证

2026-07-14 在 `next` release 基线上复核：

- `pnpm run check:kernel` 通过。
- Core lowering 与 public API 定向回归通过：2 files / 16 tests。
- React unbuilder、public API 与相关 runtime 定向回归通过：5 files / 89 tests。
- 覆盖 Tier 1、顶层与嵌套 Tier 2、fixpoint、缺 definition、payload 非法、深度超限、错误 path 和 lowering 后 round-trip。

主 agent 对 ADR、changelog、README、双语 docs、实现与测试做 Contract Auditor，未发现 BLOCKING 偏差。

## 遗留边界

- 不恢复原始自定义 React composite 或 Sugar 组件。
- 不在 IR 中持久化 Definition、React component、datasets 或函数。
- 不改变 `compileToScene()` 对未注册 composite 的 warning + skip 策略。
- Vanilla 直接消费纯 JSON lowering 结果，不新增 JSX 类反向转换 API。
