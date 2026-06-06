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

## 待决策点 🔻

- **arc-arc fillet**：本期四形状无 arc-arc 接缝（sector 的内外弧不相邻），模块先不实现 arc-arc，遇到抛明确错；后续若有需要再补。
- **cornerRadius 过大语义**：逐角夹紧到最大可行值（不报错、不自交）。是否对「明显超界」给 onWarn 警告留待实现期定（倾向：夹紧即可，不警告，避免噪声）。

## DSL 表面

```tsx
// react —— Node 形状（params.cornerRadius）
<Node shape={{ type: 'polygon', params: { sides: 6, cornerRadius: 8 } }} />
<Node shape={{ type: 'star', params: { points: 5, innerRadius: 20, outerRadius: 50, cornerRadius: 6 } }} />
<Node shape={{ type: 'sector', params: { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90, cornerRadius: 5 } }} />
<Node shape={{ type: 'rectangle', params: { cornerRadius: 8 } }} />   // 原 roundedCorners 改名
// react —— path rectangle step / sugar（roundedCorners → cornerRadius 改名）
<Step kind="rectangle" from={[0, 0]} to={[40, 24]} cornerRadius={6} />
<Rectangle from={[0, 0]} to={[40, 24]} cornerRadius={6} />
```

```ts
// vanilla builder —— 同一份 IR，node config 的 shape.params.cornerRadius 对等
node('hex', { shape: { type: 'polygon', params: { sides: 6, cornerRadius: 8 } }, position: [0, 0] });
node('box', { shape: { type: 'rectangle', params: { cornerRadius: 8 } }, position: [0, 0] });
// vanilla draw —— path rectangle step 改名后的 way 写法（rectangle op 携 cornerRadius）
draw([{ rectangle: { to: [40, 24], cornerRadius: 6 } }]);
```
> vanilla `node` config 从 `IRNode` 派生 → `cornerRadius` 随 IR 自动跟随；`<Step kind="rectangle">` / way `rectangle` op 的字段名随 `step.ts` schema rename 同步。

## 测试设计

`packages/core/core/tests/geometry/rounded-contour.test.ts`（新建，模块单测）+ 各形状测试扩 + `tests/shapes/corner-rounding.test.ts`（新建，端到端）覆盖：

- **模块**：line-line fillet 切点 / 弧正确；line-arc fillet 切点在直边与弧上、半径正确；逐角夹紧（窄角 / 短边 r 自动缩）；ray∩轮廓取最近正交点；r=0 passthrough = 原段序列。
- **四形状 r=0 等价回归**：emit / boundaryPoint 逐字段同现状。
- **polygon/star/sector cornerRadius>0**：emit 出含 fillet 弧的 path；boundaryPoint 朝拐角方向落在 fillet 弧上（≠ 尖角）。
- **rectangle**：emit 仍 RectPrim（`cornerRadius` 字段，非 path）；boundaryPoint 朝角方向感知倒角。
- **circumscribe 不随 cornerRadius 变**（AABB = 尖角极值）。
- **命名锚点 / edgePoint 不随 cornerRadius 移**（star tip-0 仍在尖角逻辑点）。
- **rename 回归**：`roundedCorners` → `cornerRadius` 全仓无残留；Node 顶层 / ShapeStyle / rectangle params 改名后旧测试更新。
- **错误**：sector 窄角 + 大 cornerRadius 仍产合法闭合轮廓（夹紧）；arc-arc（构造一个）抛明确错。
- **scale / rotate × cornerRadius**：cornerRadius 随 scale 缩、rotate 下 fillet 正确。
- IR round-trip（cornerRadius 进 IR 自描述）。

## 影响

- **`packages/core/core/src/geometry/roundedContour.ts`**（新建）：contour 类型 + `filletContour` + emit 命令生成 + `boundaryFromContour`。
- **`packages/core/core/src/geometry/arc.ts`**（修改）：提 `rayArc`（通用 ray∩arc + 角度区间，泛化 sector 的 `rayCircle`）。
- **`packages/core/core/src/geometry/segment.ts`**（复用 / 必要时补 ray∩segment）。
- **`packages/core/core/src/shapes/{polygon,star,sector}.ts`**（修改）：params 加 `cornerRadius`；emit / boundaryPoint 改走 contour 模块；scaleParams 缩 cornerRadius。
- **`packages/core/core/src/shapes/rectangle.ts`**（修改）：`roundedCorners` → `cornerRadius`；boundaryPoint 改走 contour（4-line）；emit 保留 RectPrim（`cornerRadius` 直通）。
- **`packages/core/core/src/shapes/types.ts`**（修改）：`ShapeStyle.roundedCorners` → `cornerRadius`。
- **`packages/core/core/src/ir/node.ts`**（修改）：Node 顶层 `roundedCorners` → `cornerRadius`。
- **`packages/core/core/src/compile/node.ts`**（修改）：`NodeLayout.roundedCorners` 字段 + 透传 rename。
- **path rectangle step / `<Rectangle>` sugar 子系统（纯 rename，rectOutline 圆角不变）**：`ir/path/step.ts`（rectangle step `roundedCorners`→`cornerRadius`）、`compile/path/index.ts`（`rectOutline(..., step.cornerRadius)`）、`geometry/rect.ts`（`rectOutline` 形参 rename）、`@retikz/react` 的 `<Rectangle>` / `<Step kind="rectangle">` prop rename。
- **对外 API**：**BREAKING（rename）**——`roundedCorners` → `cornerRadius`，覆盖**两子系统**：Node 形状（顶层 prop + rectangle params）+ path rectangle step（`<Step kind="rectangle">` / `<Rectangle>` 的 `roundedCorners`，也是已发布字段）。alpha 期可接受、changelog 注明迁移。polygon/star/sector 新增 `cornerRadius`（additive）。r=0 / 省略 = 现状。
- **render**：rectangle 形状仍 RectPrim、path rectangle step 仍走 rectOutline → 渲染零改动；polygon/star/sector 的 path 含 arc 命令（renderer 已支持 arc）→ 无新 primitive。
- **`@retikz/react` / `@retikz/vanilla`**：`<Node roundedCorners>` + `<Rectangle roundedCorners>` / `<Step kind="rectangle" roundedCorners>` → `cornerRadius` prop rename（react `NodeProps` + `NODE_FIELDS` + sugar/Step；vanilla 从 IR 派生自动跟随）。
- **文档**：rectangle / polygon / star / sector reference 页加 `cornerRadius` + demo；Node 页 `roundedCorners`→`cornerRadius` 改名。

## 不在本 ADR 范围

- **arc-arc fillet**（无相邻 arc 接缝场景）→ 遇到抛错，按需另补。
- **非均匀逐角 cornerRadius**（每角不同半径）→ 单一 `cornerRadius` 够用，YAGNI。
- **rectangle emit 改 path**（彻底弃 RectPrim）→ 已定保留 RectPrim，不动渲染产物。

---

## 实现契约（必填）🔻

### Level

`red`

判级：动 `packages/core/core/src/ir/**`（node 顶层 cornerRadius rename）+ `src/shapes/**`（params + emit + boundary）+ 新 `geometry/**`，跨 `@retikz/react`（NodeProps/_fields rename）→ red。

### Schema 改动

| 文件 | 操作 | 字段 | 类型 | 默认 | describe 摘要 |
|---|---|---|---|---|---|
| `shapes/rectangle.ts` | 改名 | `roundedCorners`→`cornerRadius` | `z.number().finite().nonnegative().optional()` | 省略=直角 | 角半径，逐角夹紧 |
| `shapes/{polygon,star,sector}.ts` | 加字段 | `cornerRadius` | 同上 | 省略=直角 | 角半径，逐角夹紧 |
| `ir/node.ts` | 改名 | 顶层 `roundedCorners`→`cornerRadius` | 同现状 | — | 迁移期顶层角半径（建议形状 params 内写） |
| `shapes/types.ts` | 改名 | `ShapeStyle.roundedCorners`→`cornerRadius` | `number?` | — | emit 角半径（顶层迁移回退） |

### 文件 scope

- `packages/core/core/src/geometry/roundedContour.ts`（新建）
- `packages/core/core/src/geometry/arc.ts`（修改：`rayArc`）
- `packages/core/core/src/geometry/segment.ts`（复用 / 必要时补）
- `packages/core/core/src/geometry/index.ts`（导出新模块）
- `packages/core/core/src/shapes/{rectangle,polygon,star,sector}.ts`（修改）
- `packages/core/core/src/shapes/types.ts`（修改：ShapeStyle rename）
- `packages/core/core/src/ir/node.ts` + `src/compile/node.ts`（修改：顶层 + NodeLayout rename）
- `packages/core/react/src/kernel/Node.tsx` + `src/kernel/_fields.ts`（修改：Node prop rename）
- **path rectangle step 子系统（rename）**：`packages/core/core/src/ir/path/step.ts` + `src/compile/path/index.ts` + `src/geometry/rect.ts`（rectOutline 形参）+ `packages/core/react/src/sugar/Rectangle.tsx` + Step rectangle 相关
- `packages/core/core/tests/geometry/rounded-contour.test.ts`（新建）
- `packages/core/core/tests/shapes/corner-rounding.test.ts`（新建）
- 各形状现有测试 + `node-shape` / rectangle roundedCorners 测试（改名适配）
- `apps/docs/**`（shape reference 页 + Node 页 + demo）

### 测试象限

**Happy（≥3）**：`line_line_fillet_geometry`（polygon 顶点切点/弧）；`line_arc_fillet_geometry`（sector radial↔弧）；`emit_has_fillet_arcs`（polygon cornerRadius>0 path 含 arc）；`rect_emit_stays_rectprim`（rectangle emit 仍 RectPrim + cornerRadius）。

**边界（≥2）**：`r0_passthrough_equiv`（四形状 r=0 emit/boundary 逐字段同现状）；**`sector_r0_boundary_centroid`（sector r=0 时 boundaryPoint 仍从质心发射、与现状逐字相等——验 `boundaryFromContour` 收 rayOrigin 而非内部假设中心）**；`clamp_narrow_corner`（窄角/短边 r 自动夹紧、轮廓仍闭合不自交）；`circumscribe_unchanged_by_cornerRadius`。

**错误（≥2）**：`negative_cornerRadius_rejected`（schema）；`arc_arc_fillet_throws`（构造 arc-arc 接缝抛明确错）；`rename_no_residual`（`git grep roundedCorners` 全仓应空——含 Node 形状**与** path rectangle step 两子系统；旧字段被拒）。

**交互（≥2）**：`boundary_aware_at_corner`（朝拐角方向 boundaryPoint 落 fillet 弧 ≠ 尖角；rectangle/polygon/star/sector 各一）；**`star_notch_fillet`（star 凹角专测：notch 的 emit fillet arc sweep 方向正确、boundaryPoint 朝 notch 方向落 fillet 弧、circumscribe 不变——非凸轮廓「视觉对一角、boundary 反另一角」防回归）**；**`rect_params_over_toplevel`（rectangle `params.cornerRadius` 优先于顶层 `cornerRadius`，= 现状 `?? style` 改名后逐字保留）**；**`path_rectangle_step_rename`（`<Step kind="rectangle" cornerRadius>` / way `rectangle` op 改名后圆角仍 = rectOutline 现状）**；`named_anchor_unmoved`（star tip-0 不随 cornerRadius 移）；`scale_rotate_x_cornerRadius`；`roundtrip_self_describing`。

### 依赖的现有元素

- `ShapeDefinition` 四函数 / `defineShape`（`shapes/types.ts`、[ADR-01](./01-shape-params-generalization.md)）—— 形状契约不变，emit/boundaryPoint 内部改委托。
- `RectPrim.cornerRadius`（`primitive/rect.ts:30`）—— rename 后 params 同名直通。
- `arc` PathCommand（`primitive/path.ts:46`）—— fillet 弧 / 原弧 emit 复用。
- sector `rayCircle`（`shapes/sector.ts:193`）—— 提为 `geometry/arc.ts` 的 `rayArc`。
- sector `centroidOffset` / 质心发射（`shapes/_shared.ts` sectorGeometry + `sector.ts:68-73`）—— sector 调 `boundaryFromContour` 时的 `rayOrigin`（非中心），r=0 等价回归依赖此。
- `rectOutline`（`geometry/rect.ts`，含 `roundedCorners` 形参 + clamp）—— path rectangle step 圆角实现，本 ADR 仅 rename 形参、几何不变。
- `geometry/segment.ts` / `geometry/arc.ts` / `_transform.ts`（worldToLocal / localToWorld）—— ray 求交 + 局部系。
- `boundaryPointOf`（`compile/node.ts`，[ADR-06](./06-connection-surface.md)）—— 签名不变，rounding 在各 shape.boundaryPoint 内。
- 内置 4 形状现有 emit/boundary/测试 —— r=0 等价回归基线。
