# ADR-0002：Path 箭头的 IR 表示

- 状态：Proposed
- 决策日期：2026-05-08
- 关联：[v0-roadmap §v0.1.0-alpha.1](../plans/v0-roadmap.md) · [tikz-gap-analysis §2 P0](../analysis/2026-05-07-tikz-gap-analysis.md)

## 背景

TikZ 的箭头是流程图 / UML / 网络图的必需品。最常见 4 种状态：无箭头、终点箭头、起点箭头、双向箭头：

| TikZ 字面 | 含义 |
|---|---|
| `\draw` | 无箭头 |
| `\draw[->]` | 终点箭头 |
| `\draw[<-]` | 起点箭头 |
| `\draw[<->]` | 双向箭头 |

进阶语法（`>=Latex` / `>=Stealth` / `>={Triangle[scale=1.5]}`）控制箭头形状/大小，本 ADR **不解决进阶箭头形状**——只解决"是否有箭头 + 在哪一端"。

## 选项

### A. 单 prop 枚举（**推荐**）

```ts
{
  type: 'path',
  arrow?: 'none' | '->' | '<-' | '<->',  // 默认 'none'
  // ...
}
```

### B. 起末两个独立 prop

```ts
{
  type: 'path',
  startArrow?: 'normal' | 'none',
  endArrow?: 'normal' | 'none',
}
```

### C. 嵌套对象

```ts
{
  type: 'path',
  arrow?: { start?: ArrowSpec; end?: ArrowSpec; },
}
```

## 决策

选 **A**：`Path.arrow: 'none' | '->' | '<-' | '<->'`，默认 `'none'`。

进阶箭头形状（`>=Latex`、scale、color override）留给后续 ADR，预留独立字段 `arrowOptions`（v0.1 不实现）。

## 理由

1. **AI 友好 & TikZ 字面**：4 个枚举值就是 TikZ 字面写法，LLM 一秒理解
2. **常见用例最短**：`arrow: '->'` 比 `endArrow: 'normal'` 短，比嵌套对象简洁
3. **状态封闭**：4 个值已覆盖 95%+ 流程图场景，枚举有限
4. **演进路径清晰**：将来要支持自定义箭头形状，加可选 `arrowOptions: { kind?, scale?, color? }` 即可，与 `arrow` 字段正交不冲突
5. **B 方案分散语义**：用户写"箭头"概念时倾向作为单一属性，拆两个字段心智成本更高
6. **C 方案过度工程**：嵌套对象在 alpha.1 阶段没有足够多样性需求支撑

## 影响

### IR Schema

`packages/core/src/ir/path/path.ts`：

```ts
export const PathSchema = z.object({
  // ...
  arrow: z.enum(['none', '->', '<-', '<->']).optional()
    .describe('箭头方向：none = 无；-> = 终点；<- = 起点；<-> = 双向'),
  // ...
});
```

### Scene Primitive

`packages/core/src/primitive/path.ts` 加：

```ts
export type PathPrim = {
  // ...
  /** 起点箭头 marker 形状名；undefined = 无 */
  arrowStart?: 'normal';
  /** 终点箭头 marker 形状名；undefined = 无 */
  arrowEnd?: 'normal';
};
```

把 IR 的 `'->' | '<-' | '<->' | 'none'` 在 compile 阶段拆为 `arrowStart` / `arrowEnd` 字段——renderer 不再读 IR 字面值。

### Compile

`packages/core/src/compile/path.ts`：

```ts
const [arrowStart, arrowEnd] = arrowToMarkers(path.arrow);
// arrow === '->'  → ['none', 'normal']
// arrow === '<-'  → ['normal', 'none']
// arrow === '<->' → ['normal', 'normal']
// 默认或 'none'   → ['none', 'none']
```

### Renderer

`packages/react/src/render/renderPrim.tsx`：在 SVG 输出层追加 `<defs><marker id="retikz-arrow-...">...</marker></defs>`。

实现要点：
- marker 内嵌在每个 `<path>` 旁的 `<defs>` 还是顶层 Tikz 容器一份？**优选顶层 Tikz 一份**——同一 Scene 内 marker 形状相同，避免重复
- marker id 加上稳定前缀（如 `retikz-arrow-end`）；若 SSR 同页面多 retikz 图实例需要做 id 唯一化（v0.1 alpha.1 暂不处理，后续 ADR 解决）
- 颜色：marker 用 `context-stroke` 让箭头颜色随 path stroke 自动变化

### React DSL

- `packages/react/src/kernel/Path.tsx`：`PathProps` 加 `arrow?`
- `_builder.ts` / `_unbuilder.ts`：透传 `arrow`

## 等价性测试

- IR `arrow: '->'` → PathPrim `arrowEnd: 'normal'`、`arrowStart` undefined
- IR `arrow: '<-'` → PathPrim `arrowStart: 'normal'`、`arrowEnd` undefined
- IR `arrow: '<->'` → 两端都 `'normal'`
- IR 缺省 / `'none'` → 两端都 undefined
- Renderer 输出含 `<marker>` 定义 + path 上的 `marker-start` / `marker-end` 引用

## 备选方案 / 演进

| 阶段 | 计划 |
|---|---|
| v0.1 alpha.1（本 ADR） | `arrow` 单字段、形状写死 `'normal'` |
| v0.1 alpha.3 | 加 `arrowOptions: { kind?: 'normal' \| 'latex' \| 'stealth', scale? }`，对应 TikZ `>=Latex` |
| v0.2+ | 用户自定义 marker（注册新 kind） |

## 待办

- [ ] schema + primitive 字段
- [ ] compile 映射函数 `arrowToMarkers`
- [ ] renderPrim 实现 SVG marker 输出
- [ ] React props 透传
- [ ] 等价性测试 + SSR 一致性测试
