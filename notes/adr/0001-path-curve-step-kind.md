# ADR-0001：Path 曲线 step kind（curve / cubic / bend）

- 状态：Accepted（2026-05-09 完工）
- 决策日期：2026-05-09
- 关联：[v0-roadmap §v0.1.0-alpha.3](../plans/v0-roadmap.md) · [tikz-gap-analysis §2 P0](../analysis/2026-05-07-tikz-gap-analysis.md)

## 背景

alpha.1 的 `IRStep` 只有 `'move'` / `'line'` / `'step'`（折角）/ `'cycle'`——全是直线段或闭合，没有任何曲线表达力。TikZ 的常用曲线写法包括：

- `\draw (A) .. controls (B) .. (C)`：二次贝塞尔（一个控制点）
- `\draw (A) .. controls (B) and (C) .. (D)`：三次贝塞尔（两个控制点）
- `\draw (A) to[bend left=30] (B)`：弧形连接，简化记法

alpha.3 的 Path 增强必须把这三类一次性补上，让"两点间连线"的视觉表达跟 Node 拉齐。

## 选项

### A. 三个独立 step kind（**推荐**）

```ts
type IRStep =
  | { kind: 'move'; to: Target }
  | { kind: 'line'; to: Target }
  | { kind: 'step'; to: Target; via: '-|' | '|-' }
  | { kind: 'cycle' }
  | { kind: 'curve'; to: Target; control: Position }
  | { kind: 'cubic'; to: Target; control1: Position; control2: Position }
  | { kind: 'bend'; to: Target; bendDirection: 'left' | 'right'; bendAngle?: number };
```

### B. 单一 `'curve'` kind 带 type discriminator

```ts
type IRStep =
  | ...
  | {
      kind: 'curve';
      to: Target;
      type: 'quadratic' | 'cubic' | 'bend';
      control?: Position;          // type='quadratic' 时
      control1?: Position; control2?: Position;  // type='cubic' 时
      bendDirection?: 'left' | 'right'; bendAngle?: number;  // type='bend' 时
    };
```

### C. bend 并入 curve（A 的折中：曲线统一一种 kind，bend 当 curve 的 option）

```ts
type IRStep =
  | { kind: 'curve'; to: Target;
      control?: Position;          // 二次
      control1?: Position; control2?: Position;  // 三次
      bend?: { direction: 'left' | 'right'; angle?: number };  // bend 简记
    }
  | ...
```

## 决策

选 **A：三个独立 kind（curve / cubic / bend），bend 不并入 curve**。

## 理由

1. **kind 对应 SVG path command 直接**：`curve` → `Q`（quadratic），`cubic` → `C`，`bend` 编译期算控制点退到 `C`。一一对应、无 if-else 分支判断字段是否同时存在
2. **discriminated union 利于类型收敛**：用户写 `step.kind === 'curve'` 时 TS 自动收窄到只有 `control` 字段，不会出现 quadratic step 上挂着 `control1`/`control2` 的非法状态
3. **bend 与 cubic 语义不同**：cubic 是用户给两控制点（精确控制曲线形态）；bend 是给方向 + 角度（编译期推算控制点）。两者输入 schema 不重叠，强行并入会让 zod schema 互斥字段太多
4. **AI 友好**：每个 kind 有自己的 zod `describe`，LLM 看到 `kind: 'bend'` 立刻知道该填 `bendDirection` 与可选 `bendAngle`；联合后用户得读完 `type` 字段才知道哪些字段有效
5. **B 方案的 type 二级 discriminator 是反模式**：discriminator 应放在 union 顶层，套两层后 TS 收窄能力下降、IDE 提示也变差
6. **C 方案 `curve.bend` 是状态污染**：合法 curve（user 给 control）+ bend（编译期算 control）共用一个对象时，`bend !== undefined` ⇒ 必须忽略 user 给的 control。这种 mutual exclusion 用类型表达不出来，只能 runtime 检验，是 alpha.1 ADR-0001（step kind 扩展）极力避免的

## 影响

### IR Schema

`packages/core/src/ir/path/step.ts`：扩展 union，加 3 个 step kind 的 `z.discriminatedUnion('kind', ...)` 分支。`bendAngle` 缺省 `30`（与 TikZ 一致）。

### Compile

`packages/core/src/compile/path.ts`：

- `curve` → SVG `Q cx,cy x,y`
- `cubic` → SVG `C c1x,c1y c2x,c2y x,y`
- `bend` → 几何模块算两控制点，emit 为 cubic（即 `C ...`）。算法：取 `from → to` 直线中点，沿 path 法向（左 / 右）偏移 `chord × tan(bendAngle / 2)`，用 1/3 + 2/3 处控制点拟合圆弧

### React DSL

`packages/react/src/kernel/Step.tsx`：透传所有新字段。考虑 sugar 层是否给 `<Bend>` / `<Curve>` 组件——本 ADR 不强制，由 alpha.3 实现期决定。

### 测试

- core：每条新 kind ≥ 3 case（最小 / 与 line 混用 / cycle 收尾混用）
- core：bend 角度边界（0° / 180° / 负值）的几何正确性
- core：等价性——`curve` 编译输出跟手写 `Q` 命令字节对齐

## 等价性测试

新加的 step kind 必须保证：

- IR ↔ JSON ↔ IR 序列化无损
- builder（react JSX → IR）↔ unbuilder（IR → JSX）双向
- 多 step path 中曲线段与直线段的 boundary clip 正确
