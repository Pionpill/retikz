# ADR-04：pattern / image 填充

- 状态：Accepted（已实现）
- 决策日期：2026-05-24
- 关联： · [ADR-01 Paint 基础](./01-paint-basics.md)（复用 `PaintValue` / `SceneResource` / `<defs>` 物化）

> **实现结果**：pattern / image 复用 Paint 资源表与物化契约；image 首版仅支持 URL，compile 不新增独立资源流程。

## 背景 / 约束

ADR-01 首批只做 gradient。pattern（斜线 / 网点 / 网格）与 image（图片填充）同样靠 `fill="url(#id)"` 引用 `<defs>`——pattern → `<pattern>`、image → `<pattern>` 套 `<image>`，复用 ADR-01 全部基建。

## 决策：`PaintSchema` 加 pattern / image 两分支 + PaintDefs 加两类物化

核心数据结构（字面即决策——受控词汇表 + 字段语义是关键，完整 schema + 英文 describe 见 ）：

```ts
// pattern（图案）
{ type: 'pattern',
  shape: 'lines' | 'dots' | 'grid',  // 受控词汇表（斜线 / 网点 / 网格）
  color?, background?, size?, lineWidth?, rotation? }

// image（图片，暂只 URL）
{ type: 'image',
  href: string,                      // URL（http(s) / data URI）
  fit?: 'fill' | 'contain' | 'cover' }  // 缺省 cover
```

设计细节（具体决策）：

1. **pattern 词汇表受控**：只 `lines` / `dots` / `grid` 三种 motif（够通用图表的 hatching / 网点需求）；更多图案后续加 enum 或走自定义 paint 扩展。
2. **pattern tile 用 `userSpaceOnUse`**：tile 周期 `size` 是绝对 user units，hatching 密度不随节点大小变（视觉一致，符合 hatching 直觉）；缺省 size 8、color `currentColor`（`<defs>` 内 motif stroke/fill 天然继承 svg color）、dots 半径 `size/5`。
3. **image 用 `objectBoundingBox`**：图片随形状缩放铺满；`fit` → `preserveAspectRatio`（`fill`=`none` 拉伸 / `contain`=`xMidYMid meet` / `cover`=`xMidYMid slice`）。
4. **零 core compile 改动**：`createPaintRegistry`（ADR-01）按 JSON 去重任意 `IRPaint`，pattern / image 自动进资源表 + 拿 `resourceRef`，仅 schema + react PaintDefs 改。

## 长期边界

- image 的 **SSR / PNG 导出内联**（外链在静态导出会丢）、跨域、`tile`（平铺）fit。
- pattern 的更多 motif（zigzag / brick…）。
- 把 image 填充整体挪去 `@retikz/shape` / 专门扩展包（当前定为 core，URL-only 够轻）。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：additive 非 breaking（`IRPaint` 加 union 分支），compile 零改动（registry 已 spec 无关）；其余默认行为、失败语义与公开契约以正文为准。
