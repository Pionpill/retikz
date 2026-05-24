# ADR-04：pattern / image 填充

- 状态：Accepted（实现期由 Deferred 提升——讨论后决定 alpha.7 一并做）
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.7 plan §第一部分](../../../plans/v0/v0.2-alpha.7.md) · [ADR-01 Paint 基础](./01-paint-basics.md)（复用 `PaintValue` / `SceneResource` / `<defs>` 物化）

> **从 Deferred 提升**：原计划占位顺延（控 alpha.7 体量）。Paint wiring（ADR-01）落地后，**管线成本归零**（registry 对任意 PaintSpec 去重 + ref、PaintDefs 物化），pattern / image 只需 ① schema 加分支 ② PaintDefs 加物化，**零 core compile 改动**。讨论后决定一并做（image 暂只支持 URL）。

## 背景

ADR-01 首批只做 gradient。pattern（斜线 / 网点 / 网格）与 image（图片填充）同样靠 `fill="url(#id)"` 引用 `<defs>`——pattern → `<pattern>`、image → `<pattern>` 套 `<image>`。复用 ADR-01 全部基建。

## 决策

`PaintSpecSchema` discriminatedUnion 加两个分支；PaintDefs 加两类物化。

### pattern（图案）

```ts
{ type: 'pattern',
  shape: 'lines' | 'dots' | 'grid',   // 受控词汇表（斜线 / 网点 / 网格）
  color?: string,        // motif 色，缺省 currentColor
  background?: string,   // tile 背景，缺省透明
  size?: number,         // tile 周期（user units），缺省 8
  lineWidth?: number,    // 线 / 网格描边宽；dots 用作半径。缺省 1（dots 缺省 size/5）
  rotation?: number }    // 整片旋转（度）
```

- 物化：`<pattern width=size height=size patternUnits="userSpaceOnUse" patternTransform="rotate(...)">` + 可选背景 rect + motif（lines = 一条横线 `M0 0 H{size}`；grid = 横竖两线；dots = `<circle r>`）。`userSpaceOnUse` 让 tile 尺寸恒定（不随形状缩放，符合 hatching 直觉）。
- `color: 'currentColor'` 天然生效（`<defs>` 内 motif stroke/fill 继承 svg color）。

### image（图片，暂只 URL）

```ts
{ type: 'image',
  href: string,                          // URL（http(s) / data URI）
  fit?: 'fill' | 'contain' | 'cover' }   // 缺省 cover
```

- 物化：`<pattern width=1 height=1 patternContentUnits="objectBoundingBox"><image href width=1 height=1 preserveAspectRatio=...></pattern>`。`fit` → `preserveAspectRatio`：`fill`=`none`（拉伸）/ `contain`=`xMidYMid meet` / `cover`=`xMidYMid slice`。
- objectBoundingBox 让图片随形状缩放铺满。

## 决策细节

1. **pattern 词汇表受控**：只 `lines` / `dots` / `grid` 三种 motif（够通用图表的 hatching / 网点需求）；更多图案要么后续加 enum、要么走自定义 paint 扩展。
2. **pattern tile 用 userSpaceOnUse**：tile 周期 `size` 是绝对 user units，hatching 密度不随节点大小变（视觉一致）。
3. **image 暂只 URL href（含 data URI）**：href 是字符串，dataURI 天然支持；**未做**：SSR / 导出 PNG 时外链图片内联、跨域处理、`tile`（平铺）fit。
4. **零 core compile 改动**：`createPaintRegistry`（ADR-01）按 JSON 去重任意 PaintSpec；pattern / image 自动进资源表 + 拿 resourceRef。仅 schema + react PaintDefs 改。

## 不在本 ADR 范围（仍 deferred）

- image 的 **SSR / PNG 导出内联**（外链在静态导出会丢）、跨域、`tile` fit。
- pattern 的更多 motif（zigzag / brick…）。
- 把 image 填充整体挪去 `@retikz/shape` / 专门扩展包（当前定为 core，URL-only 够轻）。

---

## 实现契约（必填）

### Level

`red`（动 `ir/paint.ts` schema）+ `yellow`（react render）；取最高 = red。

> compile 零改动——registry 已 spec 无关。

### Schema 改动

| 文件 | 操作 | 字段 | 类型 | describe 摘要 |
|---|---|---|---|---|
| `ir/paint.ts` | 加 union 分支 | pattern | `{ type:'pattern', shape:enum, color?, background?, size? finite+, lineWidth? finite+, rotation? finite }` | 图案 paint server（斜线 / 网点 / 网格） |
| `ir/paint.ts` | 加 union 分支 | image | `{ type:'image', href: string.min(1), fit?: enum }` | 图片 paint server（URL，fit 控制贴合） |

### 文件 scope

- `packages/core/src/ir/paint.ts`（PaintSpecSchema 加 pattern / image 分支）
- `packages/react/src/render/paintDefs.tsx`（renderPaint 加 pattern / image case）
- `packages/core/tests/ir/paint.test.ts`（扩 pattern / image schema）
- `packages/react/tests/render/paintDefs.test.tsx`（扩 pattern / image 物化）
- `apps/docs/src/contents/core/components/node/overview/`（node-pattern-image demo + mdx 段）

### 测试象限

#### Happy path（≥ 3）

- `pattern_lines_dots_grid`：三种 shape schema 接受
- `pattern_render`：→ `<pattern userSpaceOnUse>` + tile size + rotation patternTransform
- `image_href_fit`：`{ type:'image', href, fit }` 接受；render → `<pattern>` 套 `<image preserveAspectRatio>`
- `dedup_reuse`：同 pattern 多处 → 1 资源（复用 ADR-01 registry）

#### 边界（≥ 2）

- `pattern_defaults`：缺省 size 8 / color currentColor / dots 半径 size/5
- `image_fit_default_cover`：fit 缺省 → `xMidYMid slice`

#### 错误路径（≥ 2）

- `pattern_unknown_shape`：`shape:'zigzag'` → schema 拒
- `pattern_size_non_positive` / `image_empty_href`：schema 拒

#### 交互（≥ 2）

- `pattern_currentColor`：motif `currentColor` 跟随 svg color
- `mixed_gradient_pattern_image`：同场景三类共存于 resources、id 不撞

### 依赖的现有元素

- [ADR-01](./01-paint-basics.md) 的 `PaintSpecSchema` / `createPaintRegistry` / `PaintDefs` / `PaintValue` —— **扩展**：加分支 + 物化 case，零 compile 改动
