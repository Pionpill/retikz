# ADR-07：统一圆角——`cornerRadius` 经 rounded-contour 模块给 rectangle/polygon/star/sector 倒角（emit + 连接均感知）

- 状态：Accepted
- 决策日期：2026-06-06
- 关联：[v0.3-alpha.4 roadmap](./roadmap.md) · **前置**：[ADR-01 shape 参数化泛化](./01-shape-params-generalization.md)（params 机制 + `ShapeDefinition` 四函数）· [ADR-04 rectangle/polygon](./04-rectangle-polygon.md)（rectangle `roundedCorners` 入 params、polygon 几何）· [ADR-05 star](./05-star.md) · [ADR-03 arc/sector](./03-arc-sector.md) · [ADR-06 连接面](./06-connection-surface.md)（`boundaryPoint` 即连接面，倒角需让它感知）

## 背景

圆角目前是 **rectangle 独有**（`roundedCorners` → `RectPrim.cornerRadius`，渲染 `<rect rx>`）；polygon / star / sector 全是硬角——它们的 `emit` 都是「顶点直线连接 + close」（polygon/star）或「直边 + 圆弧 + close」（sector），拐角处无倒角。环形图扇段圆角、圆角多边形/星形是常见诉求，现在做不了。

塑造决策的硬约束：

- **圆角是「角半径」概念，应单一词汇**——rectangle params / Node 顶层（迁移期兼容）/ ShapeStyle 现叫 `roundedCorners`，`RectPrim` 字段却叫 `cornerRadius`，emit 局部变量也叫 `cornerRadius`。命名分裂。
- **连接（boundaryPoint）须感知倒角**（[ADR-06](./06-connection-surface.md) 定 boundaryPoint = 连接面）——倒角后边连到拐角应停在 fillet 弧、而非已不存在的尖角。仅改视觉不够。
- **polygon/star 是纯折线轮廓，sector 是「直边+圆弧」混合轮廓**——要让「倒角 + 沿倒角轮廓求交」对四形状统一，需把轮廓抽象成段序列，否则每形状各写一套 fillet + boundary。

## 决策：`cornerRadius` 统一命名 + `rounded-contour` 几何模块（轮廓=段序列 → fillet → emit 命令 + ray∩轮廓 boundary）

### 模型

**轮廓 = 闭合有序段序列**，每段是 `Line(p0→p1)` 或 `Arc(center, radius, startAngle, endAngle, counterClockwise)`。相邻段的接缝即「角」。模块三职责：

1. **`filletContour(segments, cornerRadius)`**：每个接缝求与两侧段都相切、半径 r 的圆弧替换尖角。支持 **line-line / line-arc / arc-line**（arc-arc 预留，本期形状用不到）。**逐角夹紧** r——切点必须落在两侧段长度内（窄角 / 短边自动缩小该角 r），保证不自交、不overshoot；夹紧后某角 r→0 则该角不倒。
2. **→ emit 路径命令**：走 fillet 后的轮廓，输出 `move` + 缩短的 `line` + 裁剪的原 `arc` + fillet `arc`（复用现有 `kind:'arc'` PathCommand）。
3. **→ `boundaryFromContour(segments, cornerRadius, rayOrigin, toward)`**：从 **`rayOrigin`** 朝 toward 射线 ∩ fillet 后轮廓全部段（line / 原 arc / fillet arc），取最近正向交点。复用 ray∩segment（`geometry/segment.ts`）、ray∩arc（由 `sector.ts` 现有 `rayCircle` 提为 `geometry/arc.ts` 通用 helper + 角度区间过滤）。**`rayOrigin` 必须显式传**——多数形状传几何中心，**但 sector 传质心 `centroidOffset`**（sector.ts 现状从质心发射、非 AABB 中心 / 圆心）；helper 不得内部假设中心，否则 `cornerRadius:0` 也会破坏 sector 现有连接点（违反 r=0 等价回归）。

**`cornerRadius` 省略 / 0 → 不 fillet，直接走原始尖角轮廓**——四形状现状 emit / boundaryPoint 逐字等价回归。

四个形状只负责「描述自己的轮廓段」，emit / boundaryPoint 委托此模块（rectangle 例外，见下 emit）。

### IR / 命名（统一 `cornerRadius`）

**`roundedCorners` 在两个独立子系统都改名，全仓单一词汇 `cornerRadius`（故「无残留」成立）：**

```ts
// 子系统 A — Node rectangle 形状（重命名 roundedCorners → cornerRadius）：
//   packages/core/core/src/ir/node.ts            —— Node 顶层迁移期 prop
//   packages/core/core/src/shapes/types.ts       —— ShapeStyle.roundedCorners
//   packages/core/core/src/shapes/rectangle.ts   —— params.roundedCorners（+ emit/scaleParams 内引用）
//   packages/core/core/src/compile/node.ts       —— NodeLayout.roundedCorners + 透传
// 子系统 B — path rectangle step / <Rectangle> sugar（纯改名，rectOutline 圆角实现不变）：
//   packages/core/core/src/ir/path/step.ts       —— rectangle step 的 roundedCorners 字段
//   packages/core/core/src/compile/path/index.ts —— rectOutline(..., step.roundedCorners) 调用
//   packages/core/core/src/geometry/rect.ts      —— rectOutline 的 roundedCorners 形参
//   packages/core/react/src/sugar/Rectangle.tsx + Step 相关 —— prop 名
// 新增 cornerRadius 到 Node 形状 params：
//   shapes/polygon.ts · shapes/star.ts · shapes/sector.ts
cornerRadius: z
  .number()
  .finite()
  .nonnegative()
  .optional()
  .describe('Corner radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.'),
```

`RectPrim.cornerRadius`（`primitive/rect.ts:30`）字段名不变——rename 后 `params.cornerRadius → RectPrim.cornerRadius` 同名直通。

### 各形状轮廓

| 形状 | 轮廓段 | 接缝类型 |
|---|---|---|
| rectangle | 4 × Line | line-line ×4 |
| polygon | `sides` × Line | line-line × sides |
| star | `2×points` × Line（凸尖 + 凹角都倒） | line-line × 2points |
| sector（环楔） | innerArc + radial Line + outerArc + radial Line | line-arc ×4 |
| sector（pie，inner=0） | radial Line + outerArc + radial Line（交于 apex） | apex line-line ×1 + line-arc ×2 |

**轮廓方向 + 凹凸角 fillet（star 非凸，最易翻车）**：所有形状轮廓**统一按固定绕向构造**（约定 CW，与各形状现有 emit 顶点顺序一致），fillet 据此判内外——

- **fillet 圆心恒在轮廓内侧**：在接缝处，沿两侧段的内法向（指向轮廓内部，由统一绕向确定）退 r 定圆心；切点 = 圆心到两段的垂足。
- **凸角（star tip / polygon 顶点）**：fillet 弧 sweep 与轮廓绕向**同向**，外凸尖被磨圆、弧在尖角内侧。
- **凹角（star notch）**：转角方向相反，fillet 弧 sweep **反向**，凹槽被磨圆、弧朝轮廓外侧鼓——`emit` 的 arc `counterClockwise` 与凸角相反，`boundaryPoint` 的 ray∩fillet-arc 同一段几何，两者**用同一份 fillet 结果**，杜绝「视觉对一个角、boundary 反另一个角」。
- **逐角夹紧**对凹角同样适用（notch 两侧短边限制 r）。
- 实现上 fillet 不区分"形状语义的凸/凹"，只看**两段在接缝处的转向符号**（叉积正负）决定圆心侧 + 弧 sweep——polygon（全凸）、star（凸凹交替）、sector（line-arc）统一一套判定。

### emit 接法

- **polygon / star / sector**：emit 改为「构造轮廓段 → `filletContour` → 路径命令」，出 **path** primitive（sector 本就出 path；polygon/star 从顶点 path 改为含 fillet 弧的 path）。
- **rectangle**：emit **保留 `RectPrim`**（`cornerRadius` 直通 → SVG `<rect rx>`，渲染语义/体积不变、render 层零改动）；**仅 boundaryPoint 改走 contour**（4-line 轮廓 fillet 后求交，连接感知倒角）。

### 语义裁定

1. **boundary-aware**：四形状 `boundaryPoint` 都走倒角轮廓 ∩ 射线。
2. **circumscribe / AABB = 用尖角轮廓**（不随 cornerRadius 变）——fillet 在尖角内侧，AABB 取尖角极值是安全偏大界；footprint / 布局 / [ADR-06](./06-connection-surface.md) 借用面的 AABB 稳定，不受 cornerRadius 影响。
3. **形状专属命名锚点恒在原尖角逻辑位置**（star `tip-N` / `notch-N`、sector `apex` / `*-arc-mid` 等）——点名要的是逻辑顶点，不随倒角内移。
4. **`edgePoint {side,t}` 走原始边**（不随 fillet 缩短）。
5. **compass 锚点**走 [ADR-06](./06-connection-surface.md) 的 AABB，与 cornerRadius 无关。
6. **`scaleParams`**：cornerRadius 是长度，随 node scale 用几何均值因子缩（与 rectangle 现状一致）。
7. **rectangle params 优先于顶层**：emit / boundary 取 `params.cornerRadius ?? style.cornerRadius`（params 优先、顶层迁移期回退），即现状 `params.roundedCorners ?? style.roundedCorners` 改名后的逐字保留。polygon/star/sector 无顶层迁移包袱，只读各自 `params.cornerRadius`。

理由：

1. **单一词汇 `cornerRadius`**——消除 roundedCorners/cornerRadius 分裂，与 `RectPrim.cornerRadius` 对齐。
2. **一个 contour 模块统管 fillet + emit + boundary**——四形状共享，未来新 polyline/arc 形状直接复用；避免 4 套 fillet + 4 套 boundary。
3. **rectangle emit 保 RectPrim**——最常用形状渲染产物不动，render 层零冲击；连接感知倒角的收益（boundary 走 contour）仍拿到。
4. **r=0 passthrough**——现状零行为变更，倒角是纯增量。

- **⚠️ BREAKING（rename）**：`roundedCorners` → `cornerRadius` 跨**两子系统**改名——Node 形状（顶层 prop + rectangle params）+ path rectangle step（`<Step kind="rectangle">` / `<Rectangle>` 的 `roundedCorners`，已发布字段）。alpha 期可接受、changelog 注明迁移；polygon/star/sector 新增 `cornerRadius` 为 additive；r=0 / 省略 = 现状。rename 跨 `@retikz/core` + `@retikz/react`（NodeProps / NODE_FIELDS / sugar Step）+ `@retikz/vanilla`（从 IR 派生自动跟随），属基础设施层 lockstep 同改同发。

## 不在本 ADR 范围

- **arc-arc fillet**（无相邻 arc 接缝场景）→ 遇到抛错，按需另补。
- **非均匀逐角 cornerRadius**（每角不同半径）→ 单一 `cornerRadius` 够用，YAGNI。
- **rectangle emit 改 path**（彻底弃 RectPrim）→ 已定保留 RectPrim，不动渲染产物。

> 实现指针：最终 schema / 类型 / 行为以代码为准；完整施工契约（Level / Schema 改动 / 文件 scope / 测试象限 / 依赖现有元素）+ DSL 示例 + 影响清单见本文件封板前全文。
> 🔖 本文件压缩前完整施工蓝图 = `git show 62562f1d:notes/decisions/core/v0/v0.3/v0.3-alpha.4/07-corner-rounding.md`（封板全文）。
