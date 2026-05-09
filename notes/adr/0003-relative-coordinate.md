# ADR-0003：相对坐标的 IR 表达

- 状态：Proposed
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
  | { rel: [number, number] }       // 相对当前 step 终点
  | { relAccum: [number, number] }; // 相对 path 起点累积
```

### B. 字符串前缀

```ts
type Target = Position | PolarPosition | string;
// 字符串新增前缀语法：'+1,0' / '++1,0'
```

需要在 `parseTarget` 里加 prefix parser。

### C. Position 加 mode 字段

```ts
type Position = { x: number; y: number; mode?: 'abs' | 'rel' | 'relAccum' };
```

## 决策

选 **A：IR 用嵌套对象 `{ rel }` / `{ relAccum }`**。

sugar 层另开支持字符串简记 `'+1,0'` / `'++1,0'`（在 react adapter 的 builder 里 parse 并产出对象 IR），让 JSX 写起来跟 TikZ 风格更接近，但 IR 持久化形式始终是对象。

## 理由

1. **IR 是 AI 友好的持久化层，应避免任何字符串语法解析**：alpha.0 起架构原则就是"IR 持久化形式 = 可序列化 JSON 对象"，让 LLM 能直接读写。字符串前缀 `'+1,0'` 强迫 IR 消费者实现 parser，违背架构总目标
2. **discriminator 让 zod schema 自描述**：嵌套对象有自己的 `describe`：`'Relative offset from the previous step end point'` / `'Accumulated relative offset from the path start'`——LLM 看到 IR 能立刻知道每种 Target 的语义。字符串前缀方案这些语义只能塞进顶层字段的 description
3. **类型可收窄**：`if ('rel' in target)` 直接在 TS 里收窄到 `[number, number]` 元组，无需 runtime instanceof / regex
4. **B 方案的 prefix parsing 与既有 string 语义冲突**：当前字符串 Target 已经承载了 `'A'` / `'A.north'` / `'A.30'` 三种语法（alpha.1 ADR-0004），再叠 `+1,0` / `++1,0`，parser 优先级与歧义会爆炸——是用户名包含 `+` 还是相对坐标？
5. **C 方案的 mode 字段是状态污染**：absolute 与 relative 的几何意义不同（绝对坐标的 (x, y) vs 相对偏移的 (dx, dy)），混在同一个 Position 里会让消费侧每次都得 `if (mode === 'rel')`，没有任何收益
6. **sugar 层字符串支持**保留用户体验：JSX 里仍能写 `to="+1,0"`，sugar builder 翻译到对象 IR；这跟 alpha.1 的"sugar way 字符串 → DrawWay"模式一致

## 影响

### IR Schema

`packages/core/src/ir/path/target.ts`：

```ts
export const TargetSchema = z.union([
  PositionSchema,
  PolarPositionSchema,
  z.string(),
  z.object({
    rel: z.tuple([z.number(), z.number()])
      .describe('Offset (dx, dy) relative to the previous step end point. Does not accumulate.'),
  }),
  z.object({
    relAccum: z.tuple([z.number(), z.number()])
      .describe('Offset (dx, dy) accumulated from the path start point.'),
  }),
]);
```

### Compile

`packages/core/src/compile/parseTarget.ts`：

- 既有 `parsePosition(target, ctx)` 入参 ctx 已有 `prevEnd: Point | null`
- 新增分支：
  - `'rel' in target` → `prevEnd + (dx, dy)`，**不**更新 prevEnd（保持 TikZ `+` 语义）
  - `'relAccum' in target` → `pathStart + (dx, dy)`，更新 prevEnd

### React DSL（sugar 字符串）

`packages/react/src/sugar/Draw.tsx` 与 way parser：

- `to="+1,0"` → `{ rel: [1, 0] }`
- `to="++1,0"` → `{ relAccum: [1, 0] }`
- 现有 `to="A.north"` 不受影响（首字符是字母走 string 分支）

### 测试

- core：`rel` 与绝对坐标混用（line → curve(rel) → line）
- core：`rel` 接 `rel` 链式（验证 prevEnd 不变）
- core：`relAccum` 在 cycle path 里的几何（pathStart 是首个 step 的 to 还是 move 的起点？—— **决策：path 第一个 step 的解析后绝对坐标**）
- react：sugar 字符串 `'+1,0'` / `'++1,0'` 解析正确

## 等价性测试

- IR ↔ JSON：`{ rel: [1, 0] }` 序列化无损
- builder ↔ unbuilder：JSX `to="+1,0"` ↔ IR `{ rel: [1, 0] }` 双向
- 跨 step 几何：`(0,0) line (3,4) curve(rel: [1,0]) ...` 的曲线 from 应是 (3,4)，曲线终点是 (4,4)（rel 不更新）
