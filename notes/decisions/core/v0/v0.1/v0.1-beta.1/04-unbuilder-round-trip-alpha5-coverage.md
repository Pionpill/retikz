# ADR-04：unbuilder round-trip 补 alpha.5 新增形态测试覆盖

- 状态：Proposed
- 决策日期:2026-05-13
- 关联：[v0.1-beta.1 plan TODO-10](./roadmap.md) · [alpha.5 ADR-03 arrowDetail](../v0.1-alpha.5/03-path-arrow-detail.md) · [alpha.5 ADR-04 OffsetPosition](../v0.1-alpha.5/04-position-offset.md) · [alpha.5 ADR-02 StepLabel position](../v0.1-alpha.5/02-step-label-position-t.md)

## 背景

`packages/react/tests/kernel/_unbuilder.test.tsx` 当前覆盖到 alpha.3 时代的字段（`Node shape` / `arrow` / `label` / `fillRule` / `lineCap` / `thickness` / `opacity` 等）的 IR → React → IR round-trip。alpha.4 与 alpha.5 加进 IR 的若干新形态**已经在 `_unbuilder.ts` 中透传**，但**未有 react-layer round-trip 测试**。

具体缺口：

| 来源 | 新形态 | 当前测试覆盖 |
|---|---|---|
| alpha.4 ADR-01 | `Node.position = { direction, of, distance }`（`AtPosition`）| IR 单向 compile 测试有，round-trip 无 |
| alpha.5 ADR-04 | `Node.position = { of, offset }`（`OffsetPosition`）| 同上 |
| alpha.5 ADR-04 | `Step.to = { of, offset }`（OffsetPosition 进 IRTarget）| 同上 |
| alpha.5 ADR-03 | `Path.arrowDetail` 顶层 + `start` / `end` 子对象 merge | 0 round-trip 测试 |
| alpha.5 ADR-02 | `StepLabel.position` 7 keyword + 任意 `[0, 1]` 数值 | IR / compile 单向测试有，round-trip 无 |

`_unbuilder.ts` 已经透传这些字段（不是 missing implementation），但 **round-trip 等价性未守门**——一旦 unbuilder bug 把 `arrowDetail.start.color` 误传成 `arrowDetail.color` 或漏 `OffsetPosition.of` 嵌套，没有测试会失败。这是 alpha.5 遗留的测试 gap。

## 选项

### A. 在 `_unbuilder.test.tsx` 补 5 组 round-trip 用例（**推荐**）

每组用例的形态：

```ts
const irOriginal: IRPath = { ... };  // 含本组特定的 alpha.5 字段
const reactTree = convertIRToReactNode(irOriginal);
const irRebuilt = buildIR(reactTree);
expect(irRebuilt).toEqual(irOriginal);  // 深比较
```

5 组：
1. **AtPosition Node**：`{ direction: 'right', of: 'A', distance: 50 }` round-trip
2. **OffsetPosition Node**：`{ of: 'A', offset: [10, 5] }` round-trip
3. **OffsetPosition Step.to**：path 内 step 的 `to: { of, offset }` round-trip
4. **arrowDetail 起末异形**：顶层 + start + end 三 spec 字段集 round-trip（含 `start.color` / `end.shape` 等子字段 override）
5. **StepLabel.position 7 keyword + 数值**：每 keyword 一个最小 IR + `position: 0.3` 一个数值用例

### B. 把 round-trip 测试散落到各自单测文件

不集中：测试找起来麻烦。`_unbuilder.test.tsx` 已经是 round-trip 测试的归口，散落破坏一致性。

## 决策：A

理由：
1. 不需要改实现（`_unbuilder.ts` 已透传字段），纯补测
2. 一次性把 alpha.5 的 react-layer 守门补齐
3. 集中在 `_unbuilder.test.tsx` 维持单文件归口，未来 alpha.6 加新字段照此格式追加即可

## 决策细节

- ✓ **若 round-trip 不等价 → 算 alpha.5 遗留 bug**，本 ADR scope 扩展到修 `_unbuilder.ts`（含可能新加的 helper）
- ✓ **测试命名约定**：`it("round-trips AtPosition Node ...")` / `it("round-trips arrowDetail with start/end overrides")` 等 round-trips 前缀
- ✓ **不加 e2e SVG 输出比较**——本 ADR 只测 IR 等价性，SVG 输出由 compile / render 单测各自守

## DSL 表面

无变化（仅补测）。

## 测试设计

新增测试组 in `packages/react/tests/kernel/_unbuilder.test.tsx`：

```tsx
describe('alpha.4/5 新增形态 round-trip', () => {
  it('AtPosition Node.position');
  it('OffsetPosition Node.position');
  it('OffsetPosition Step.to');
  it('arrowDetail 顶层 + start + end merge');
  it.each([7 keyword + 数值])('StepLabel.position = %s');
});
```

≥ 5 组，按上述 5 个形态展开。

## 影响

- **测试数**：~10 个新测试（含 keyword 7 + 数值组合）
- **可能触发 alpha.5 遗留 bug**：若 unbuilder 实际不能 round-trip 某形态 → 本 ADR scope 扩展到修 `_unbuilder.ts`
- **公开 API**：无
- **运行时**：无

## 不在本 ADR 范围

- AtPosition / OffsetPosition / arrowDetail 字段本身的 compile resolve 测试 —— 已在 alpha.5 ADR 各自的测试象限覆盖
- builder 端的 round-trip（buildIR ← React JSX）—— 假设 builder 透传等价（既有测试已覆盖），本 ADR 关注 unbuilder 方向

---

## 实现契约

### Level

`green`（仅测试文件 + 可能修 `packages/react/src/kernel/_unbuilder.ts`，无 zod schema 改动、无公开 API 变化）

### Schema 改动

无。

### 文件 scope

- `packages/react/tests/kernel/_unbuilder.test.tsx`（修改：新增 5 组 round-trip describe）
- `packages/react/src/kernel/_unbuilder.ts`（**仅当测试暴露遗留 bug 时**修改）

### 测试象限

**Happy path（5）**：
- AtPosition Node round-trip
- OffsetPosition Node round-trip
- OffsetPosition Step.to round-trip
- arrowDetail 起末异形 round-trip
- StepLabel.position 7 keyword 全覆盖（it.each）+ 1 数值 case

**边界 / 错误路径**：不强凑——round-trip 等价测试本质是 happy path 守门，错误路径由 schema 单测覆盖

### 依赖的现有元素

- `_unbuilder.ts` `convertIRToReactNode` —— 引用
- `_builder.ts` `buildIR` —— 引用（compose round-trip 等式）
- alpha.4/5 各 ADR 涉及的 IR 字段 —— 引用（IR 构造时使用）
