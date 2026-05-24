# ADR-07：`_builder.ts` `as` cast 收敛到边界、`parseTargetSugar` 参数窄化

- 状态：Proposed
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-13](./roadmap.md) · [AGENTS.md "不允许 `as any`"](../../../../../../AGENTS.md)

## 背景

`packages/react/src/kernel/_builder.ts` 全文 grep 出 **60 处 `props.X as <Type>`** 类型 cast。根本原因：

- React `Children.forEach((child) => ...)` 给的 `child.props` 是 `unknown`
- 主 AI 在 builder 里需要按"this is a Node JSX child" / "this is a Path JSX child"约定 narrow 后读字段
- 当前写法等价 100% 信任调用方 props 类型正确，**IR 类型错位时 TS 编译期不报错，运行时到 zod 校验才暴露**

虽然 AGENTS.md 只禁 `as any` / `@ts-ignore`，没禁 `as <T>`，但 60 处 cast 累积起来：
- 任一字段 rename（如 alpha.6 加新字段、改默认值）TS 不抓
- 引入新 prop 时容易 cast 错（`props.foo as string` 写成 `props.foo as number` 不会报错）
- AI 子 Agent 改 builder 时极易顺手加新 cast 而非走类型化路径

同病：`parsers/parseTargetSugar.ts:10` `return input as IRTarget` —— 参数类型 `unknown`，cast 到 `IRTarget`，对非字符串非 relative 形态完全不验证。调用方传错类型零提示。

## 选项

### A. cast 一次性收敛到顶层 + 子函数走类型化签名（**推荐**）

```ts
// 旧
Children.forEach(children, (child) => {
  if (!isValidElement(child)) return;
  // child.props 类型是 unknown
  const id = child.props.id as string;      // cast 散布
  const shape = child.props.shape as NodeShape;
  ...
});

// 新
const buildNodeFromProps = (props: NodeProps): IRNode => {
  // 函数签名约束 props 类型，函数体内无 cast
  if (props.id !== undefined) ir.id = props.id;
  ...
};

Children.forEach(children, (child) => {
  if (!isValidElement(child)) return;
  const tag = (child.type as { displayName?: string }).displayName;
  if (tag === 'Node') {
    return buildNodeFromProps(child.props as NodeProps);  // cast 仅此一处（顶层）
  }
  if (tag === 'Path') {
    return buildPathFromProps(child.props as PathProps);
  }
  ...
});
```

每个 Kernel 组件一个 `buildXxxFromProps(props: XxxProps): IRChild` 入口函数。子函数内部走类型化签名，字段 rename 时 TS 帮抓所有点。

```ts
// parseTargetSugar 参数窄化
// 旧
export const parseTargetSugar = (input: unknown): IRTarget => { ... };

// 新
export const parseTargetSugar = (input: IRTarget | string): IRTarget => { ... };
// 调用方在边界 cast（typically buildXxxFromProps 内）
```

### B. 不动，保留 60 处 cast

代价：未来字段 rename / 加字段时漏改不报错；新 Agent 改 builder 易加更多 cast。

### C. 引入 zod parse 替代 cast（双重防御）

```ts
const props = NodePropsSchema.parse(child.props);
```

代价：运行时性能开销（zod parse 不便宜）；现状 builder 已假设 children 是合法 JSX、zod 单独在 `compileToScene` 入口跑一次足够，再加一道是重复防御。

## 决策：A

理由：
1. cast 是结构性必要（`Children.forEach` 给 `unknown`，需窄化）——目标是**控制 cast 个数与位置**，不是消灭
2. 顶层 cast 一处 + 子函数类型化签名是 TS 社区标准做法，可读 + 可维护
3. 不引入运行时开销（B 的 zod 方案有性能代价）
4. 同 ADR-06 配合——子函数类型化签名是字段表互锁的前提

## 决策细节

- ✓ **顶层 cast 不抽 helper**——只省 3-5 处样板、价值有限；保留每个组件分支显式 cast 一次
- ✓ **`parseTargetSugar` 参数类型 = `IRTarget | string`**——调用方传 `IRTarget` 对象直接返回、传字符串才走 sugar 解析
- ✓ **`_unbuilder.ts` 同步审计**——unbuilder 方向同样审查 cast，含在本 ADR scope
- ✓ **typed helper 命名约定**：`buildNodeFromProps` / `buildPathFromProps` / `buildStepFromProps` / `buildEdgeLabelFromProps` / `buildCoordinateFromProps` / `buildTextFromProps`（6 个 Kernel + Sugar 组件）

## DSL 表面

无变化（仅内部类型严谨度）。

## 测试设计

**类型守门（手动验证）**：
- 临时改 `NodeProps` 删一个字段、看 builder 编译报错（PR review 演示）
- 临时 cast 错类型（`props.shape as string` 写成 `props.shape as number`）—— 子函数签名约束下 TS 报错

**行为等价（既有）**：
- `_builder.test.tsx` / `Draw.test.tsx` / `_unbuilder.test.tsx` 全过
- ADR-04 补的 round-trip 测试一并守门

## 影响

- **代码量**：60 处 cast → ~6 处顶层 cast + 6 个 typed helper 函数；行数略增（typed 函数签名 + 显式 type narrowing）
- **未来体验**：字段 rename 时 TS 抓全部漏点
- **公开 API**：无变化
- **运行时**：无（cast 是编译期）

## 不在本 ADR 范围

- `parseTargetSugar` 之外的 parsers cast 审计（`parseWay.ts` 等）—— 单独审，但 parseWay 已是良好类型化签名（接 `WayDSL`、内部 narrow）
- 引入运行时 zod parse 双重防御（选项 C）—— 性价比不够

---

## 实现契约

### Level

`yellow`（动 `packages/react/src/kernel/` + `packages/core/src/parsers/parseTargetSugar.ts`，但仅类型严谨度收敛；零行为变化、零公开 API 变化）

### Schema 改动

无 zod schema 改动。

### 文件 scope

- `packages/react/src/kernel/_builder.ts` —— 抽 6 个 typed helper 函数，60 处 cast 收敛到 ~6 处顶层
- `packages/react/src/kernel/_unbuilder.ts` —— 同步审计 cast 数量（如有类似漂移一并收敛）
- `packages/core/src/parsers/parseTargetSugar.ts` —— 参数 `unknown` → `IRTarget | string`

### 测试象限

零行为变化，守门即可：

**守门（既有）**：
- `pnpm --filter @retikz/react test:run` 全过
- `tsc --noEmit` 全过
- ADR-04 补的 round-trip 测试一并守门

**类型审计（手动）**：
- builder / unbuilder 全文 grep `as <Type>` 出现次数 → 应该 ≤ 10（顶层 6 处 + 必要的 narrowing 几处）

不强凑测试象限。

### 依赖的现有元素

- `_builder.ts` 与 `_unbuilder.ts` —— **修改**
- `kernel/Node.tsx` / `kernel/Path.tsx` / `kernel/Step.tsx` / `kernel/Coordinate.tsx` / `kernel/Text.tsx` / `sugar/EdgeLabel.tsx` 各 props 类型 —— **引用**（buildXxxFromProps 签名基准）
