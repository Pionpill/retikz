# ADR-0003：相对坐标的 IR 表达

- 状态：Accepted（2026-05-10 完工）
- 决策日期：2026-05-09
- 关联：[v0-roadmap §v0.1.0-alpha.3](../plans/v0-roadmap.md) · [tikz-gap-analysis §2 P1](../analysis/2026-05-07-tikz-gap-analysis.md)

## 背景

TikZ 提供两种相对坐标语法，避免反复写绝对位置：

- `(+1, 0)`：相对**当前画笔位置**（最近一个 step 的终点）偏移，**不更新**画笔位置——下一段还是从原点出发
- `(++1, 0)`：相对**当前画笔位置**偏移，**更新**画笔位置——下一段从新点出发

注：实际 TikZ 的 `+` / `++` 语义略复杂（`+` 不更新 vs `++` 累积）。retikz alpha.3 简化为常用语义，避免一上来就把"不更新"这个少用 corner case 放出来。

alpha.1/alpha.2 的 `Target` 类型只支持：

```ts
type Target = Position | PolarPosition | string;  // string = node id / anchor / 角度
```

无任何相对坐标支持。alpha.3 必须补上，否则用户得手动算每个绝对坐标。

## 选项

### A. 嵌套对象（**推荐**）

```ts
type Target =
  | Position           // { x, y }
  | PolarPosition      // { angle, radius }
  | string             // node id / anchor / 角度
  | { rel: [number, number] }            // 相对前段 prevEnd
  | { relAccumulate: [number, number] }; // 相对前段 prevEnd，更新 prevEnd
```

### B. 字符串前缀

```ts
type Target = Position | PolarPosition | string;
// 字符串新增前缀语法：'+1,0' / '++1,0'
```

需要在 `parseTarget` 里加 prefix parser。

### C. Position 加 mode 字段

```ts
type Position = { x: number; y: number; mode?: 'abs' | 'rel' | 'relAccumulate' };
```

## 决策

选 **A：IR 用嵌套对象 `{ rel }` / `{ relAccumulate }`**。

sugar 层提供两套等价写法（**对象优先**，字符串兼容），都在 React adapter / parseWay 内就地翻译到 IR 对象：

- **TS-friendly 对象**（推荐）：`{ position: [dx, dy], type: DrawWay.Relative | DrawWay.Accumulate }`，在 way 数组里使用
- **贴 TikZ 字面**：`'+dx,dy'` / `'++dx,dy'`，可用于 `<Step to>` 与 way 数组

> 落地节奏（2026-05-09 ~ 2026-05-10，commits `3a87819` → `5334d60`）：
> - **step.1**：扩 IR Target union，加 `RelTargetSchema` / `RelAccumulateTargetSchema`
> - **step.2**：compile 把 `{ rel }` / `{ relAccumulate }` 解析为绝对坐标，prevEnd 推进按 TikZ `+` / `++` 语义区分
> - **step.3**：sugar 字符串 `'+1,0'` / `'++1,0'` 在 React 层 `parseTargetSugar` 就地翻译
> - **step.4**：补 sugar 对象形态 `WayRelItem`，配合 `DrawWay.Relative` / `DrawWay.Accumulate` 常量；`DrawWay` 全部成员统一 PascalCase（`cycle`/`hv`/`vh` → `Cycle`/`Hv`/`Vh`）

step.4 是落地中追加的决定：原 ADR 只规划了字符串 sugar，但发现 way 数组里裸字符串无法被 TS 校验（既不能查元组形态，也容易和节点 id 混），所以追加对象形态作为推荐写法；字符串保留作 TikZ 原味简记。

## 理由

1. **IR 是 AI 友好的持久化层，应避免任何字符串语法解析**：alpha.0 起架构原则就是"IR 持久化形式 = 可序列化 JSON 对象"，让 LLM 能直接读写。字符串前缀 `'+1,0'` 强迫 IR 消费者实现 parser，违背架构总目标
2. **discriminator 让 zod schema 自描述**：嵌套对象有自己的 `describe`：`'Relative offset from the previous step end point'` / `'Accumulated relative offset, advances prevEnd'`——LLM 看到 IR 能立刻知道每种 Target 的语义。字符串前缀方案这些语义只能塞进顶层字段的 description
3. **类型可收窄**：`if ('rel' in target)` 直接在 TS 里收窄到 `[number, number]` 元组，无需 runtime instanceof / regex
4. **B 方案的 prefix parsing 与既有 string 语义冲突**：当前字符串 Target 已经承载了 `'A'` / `'A.north'` / `'A.30'` 三种语法（alpha.1 ADR-0004），再叠 `+1,0` / `++1,0`，parser 优先级与歧义会爆炸——是用户名包含 `+` 还是相对坐标？
5. **C 方案的 mode 字段是状态污染**：absolute 与 relative 的几何意义不同（绝对坐标的 (x, y) vs 相对偏移的 (dx, dy)），混在同一个 Position 里会让消费侧每次都得 `if (mode === 'rel')`，没有任何收益
6. **sugar 层字符串支持**保留用户体验：JSX 里仍能写 `to="+1,0"`，sugar builder 翻译到对象 IR；这跟 alpha.1 的"sugar way 字符串 → DrawWay"模式一致
7. **Sugar 对象形态补 TS 校验**（step.4 追加）：way item 里裸字符串没法让 TS 检查元组形态，且与节点 id 共享 string 通道、易撞名。`{ position, type: DrawWay.Relative | DrawWay.Accumulate }` 对象形态能让 IDE 全程补全 + 校验；`DrawWay.Relative` / `Accumulate` 底层值刻意丑（`'retikz-keyword_relative'` / `'..._accumulate'`），保证不撞结构

## 影响

### IR Schema

`packages/core/src/ir/path/target.ts` ✅ 已实装：`RelTargetSchema` 与 `RelAccumulateTargetSchema` 两个 z.object，加入 `TargetSchema` discriminated union。

```ts
export const TargetSchema = z.union([
  PositionSchema,
  PolarPositionSchema,
  z.string().min(1),
  RelTargetSchema,            // { rel: [dx, dy] }
  RelAccumulateTargetSchema,  // { relAccumulate: [dx, dy] }
]);
```

### Compile

`packages/core/src/compile/path.ts` ✅ 已实装 `normalizeRelativeTargets`：

- `'rel' in target` → `prevEnd + (dx, dy)`，**不**更新 prevEnd（保持 TikZ `+` 语义）
- `'relAccumulate' in target` → `prevEnd + (dx, dy)`，**更新** prevEnd（TikZ `++` 累积）

> ⚠️ **修正**：原 ADR 在 §影响 段写 `relAccumulate` 是"基于 path 起点（pathStart）"。落地时按 TikZ `++` 实际语义（"链式累积，每段从前一段终点继续"）改成基于 `prevEnd`——这与背景段 + 决策段表述一致，影响段是手误。compile 注释里也标注了这一点。

prevEnd 跨 step kind 的推进：

- 有 `to` 的 kind（move / line / step / curve / cubic / bend）：`prevEnd = refPointOfTarget(to)`
- `arc`：`prevEnd = arcEndPoint(prevEnd, radius, endAngle)`
- `circlePath` / `ellipsePath`：`prevEnd` 不变（笔位回圆心）
- `cycle`：`prevEnd` 不变

prevEnd 为 `null`（首步是 rel）时回退到 `[0, 0]`。

### React DSL（sugar）

`<Step to>` ✅ 通过 `packages/core/src/parsers/parseTargetSugar.ts` 支持字符串：

- `to="+1,0"` → `{ rel: [1, 0] }`
- `to="++1,0"` → `{ relAccumulate: [1, 0] }`
- `to="A.north"` 等节点 ref 不受影响（首字符为字母时不撞 `+` 前缀）

`<Draw way>` ✅ 通过 `packages/core/src/parsers/parseWay.ts` 同时支持两种形态：

- 字符串：`'+dx,dy'` / `'++dx,dy'`（同 `<Step to>` 字符串走同一 parser）
- 对象：`{ position: [dx, dy], type: DrawWay.Relative | DrawWay.Accumulate }`（way item 专有，TS 全程校验）

两者编译期都 desugar 为 IR `{ rel }` / `{ relAccumulate }`；IR 持久化形态保持纯净。

### 文档

- `apps/docs/.../draw/overview/index.{en,zh}.mdx` 与 `draw/step/index.{en,zh}.mdx` 补"相对坐标"章节，展示对象形态 + 字符串两种写法
- `draw-rel.demo.tsx`（way 对象形态）+ `step-rel.demo.tsx`（IR `{ rel }` / `{ relAccumulate }` 直写）两个 demo 对照展示 L 形 vs 阶梯形几何

## 等价性测试

- IR ↔ JSON：`{ rel: [1, 0] }` / `{ relAccumulate: [1, 0] }` 序列化无损
- builder ↔ unbuilder：JSX `<Step to="+1,0">` ↔ IR `{ rel: [1, 0] }` 双向；JSX way 对象形态 ↔ IR `{ rel }` / `{ relAccumulate }` 双向
- 跨 step 几何：
  - `(0,0) line (3,4) curve(rel: [1,0]) ...` 的曲线 from = (3,4)，曲线终点 = (4,4)（rel 不更新）
  - `(0,0) line (3,4) line(relAccumulate: [1,0]) line(relAccumulate: [1,0])` 的两次 line 终点 = (4,4) → (5,4)（每段累积）
- sugar 字符串解析：`'+1,0'` / `'++1,0'` / `'+1.5,-2.5'` / `'++ -3, 4'` 全部覆盖；非字符串 / 退化串原样返回
- sugar 对象形态：与字符串形态在 way 任意位置（首项 / line / 折角 next / 曲线 next）产出一致 IR
