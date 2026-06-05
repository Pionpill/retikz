# ADR-01：shape 参数化泛化——shape 从 Rect-only 升为可注册「type + params」（对齐 path generator 擦除范式）

- 状态：Proposed
- 决策日期：2026-06-06
- 关联：[v0.3-alpha.4 roadmap](./roadmap.md) · [v0.3 roadmap §Alpha 切分](../roadmap.md) · [core-design.md §7 AI 友好](../../../../architecture/core-design.md) · **范式参照**：[v0.3-alpha.2 ADR-01 Tier 2 支撑](../v0.3-alpha.2/01-tier2-support.md)（passthrough + 注册表）、core path generator（`pathGenerators/types.ts` + `pathGenerators/define.ts` + `compile/path/index.ts` 双护栏，与本 ADR 同构问题的现成范式）· 消费方：[ADR-02 circle/ellipse](./02-circle-ellipse.md) · [ADR-03 arc/sector](./03-arc-sector.md) · [ADR-04 rectangle/polygon](./04-rectangle-polygon.md) · [ADR-05 star](./05-star.md) · 下游：[plot v0.1-alpha.4](../../../../plot/v0/v0.1/roadmap.md)

## 背景

塑造方案的硬约束：

- **`ShapeDefinition` 只认 `Rect`**——`circumscribe` / `boundaryPoint` / `anchor` / `edgePoint` / `emit` 唯一几何入参是 `Rect`（中心 + `width` + `height` + `rotate`），形状自由度仅三个。扇形需圆心 + 内外半径 + 起止角（≥4），装不下；`width/height` 已被 `circumscribe` 占用、`rotate` 已是整体旋转。
- **shape 专属参数散落 `Node` 顶层**——`roundedCorners`（「only effective on rectangle」）即不可扩展信号；每加一种形状就往 `Node` 塞「only effective on X」字段。
- **闭包方案违反 IR 铁律**——把参数存编译期闭包虽复用接口，但参数不进 IR、命名表随数据爆炸，IR 不再自描述（core-design §4.4）。
- **连接的本质是 `boundaryPoint`**——缺的不是算法（它返回任意 `Position`），是把 per-instance 参数喂进它的通道。

**core 已有同构范式：path generator。** 它解决的就是「异构注册表 + per-instance JSON params + 类型擦除」：`PathGeneratorDefinition`（`pathGenerators/types.ts:39`）用 `paramsSchema: ZodType<IRJsonObject>` + `generate(ctx)` 收 `params: Record<string, unknown>`（内部收窄）；registry 同构 `Record<string, Definition>`、**不泛型化**（避免逆变 / 落 any）；`definePathGenerator()` 做注册期元校验；`compile/path/index.ts:516-519` 跑**双护栏**——`paramsSchema.parse(params)` 后再 `JsonObjectSchema.parse(parsed)`，宽松 schema 也拦下 function/undefined。shape 泛化照抄这套，不另造。

## 决策：`Node.shape = string | {type, params?}`（nested）+ 擦除式注册表 + `defineShape<T>()` + 双护栏

**IR 侧（nested，参数进 IR、自描述）：**

```ts
// packages/core/core/src/ir/shape.ts（新建）
export const ShapeRefSchema = z
  .object({
    type: z
      .string()
      .min(1)
      .describe('Shape name; built-in or registered via CompileOptions.shapes. Unregistered names are rejected at compile time.'),
    params: JsonObjectSchema.optional().describe(
      'JSON-only parameter object for parametric shapes (e.g. sector { innerRadius, outerRadius, startAngle, endAngle }). Must be a plain JSON object (validated by JsonObjectSchema); the registered shape validates its own field shape via paramsSchema. Omitted for parameterless shapes.',
    ),
  })
  .describe('Shape reference: type name + optional JSON params, validated at compile time by the registered shape.');

// packages/core/core/src/ir/node.ts —— shape 字段：裸 string（无参，向后兼容）或 {type, params?}
shape: z
  .union([z.string().min(1), ShapeRefSchema])
  .optional()
  .describe(
    'Node visual shape: a bare name string (parameterless, e.g. "rectangle") or `{ type, params }` carrying a JSON params object (e.g. `{ type:"sector", params:{ innerRadius, outerRadius, startAngle, endAngle } }`). Built-in or registered via CompileOptions.shapes; unregistered type rejected at compile time. Defaults to "rectangle".',
  )
```

**注册侧（擦除注册表 + `defineShape<T>` 定义点类型安全）：**

```ts
// packages/core/core/src/shapes/types.ts —— params 暴露给所有计算函数；registry 同构（无泛型）
type ShapeDefinitionInput<TParams extends IRJsonObject> = {
  /** params 的 zod schema；类型约束输出 JSON-safe（双 parse 才是真护栏，见编译期） */
  paramsSchema: z.ZodType<TParams>;
  circumscribe: (innerHalfWidth: number, innerHalfHeight: number, params: TParams) => { halfWidth: number; halfHeight: number };
  boundaryPoint: (rect: Rect, toward: Position, params: TParams) => Position;
  anchor: (rect: Rect, name: string, params: TParams) => Position | undefined;
  edgePoint?: (rect: Rect, side: 'north' | 'south' | 'east' | 'west', t: number, params: TParams) => Position;
  emit: (rect: Rect, style: ShapeStyle, round: (n: number) => number, params: TParams) => Iterable<ScenePrimitive>;
};
/** 擦除形态：registry 存这个，所有函数收 IRJsonObject（实际类型由 paramsSchema.parse 保证） */
export type ShapeDefinition = ShapeDefinitionInput<IRJsonObject>;

// packages/core/core/src/shapes/define.ts（新建）—— 定义点 typed，返回擦除形态进 registry（唯一受控 cast）
export const defineShape = <TParams extends IRJsonObject>(
  def: ShapeDefinitionInput<TParams>,
): ShapeDefinition => def as unknown as ShapeDefinition;
```

registry 同构 `Record<string, ShapeDefinition>`，无逆变；类型安全在 `defineShape<SectorParams>({...})` 的定义点（函数签名 typed），擦除的单点 cast 封在 `defineShape` 内，**形状实现者不 cast**。

**编译期桥接（`compile/node.ts`，抄 path generator 双护栏）：**

```ts
// shape: string → 规范化为 { type, params: {} }；object → 原样
const { type, params = {} } = normalizeShape(node.shape);   // 'rectangle' ≡ { type:'rectangle', params:{} }
const def = lookupShape(type, options.shapes);              // 未注册 → throw（沿用 unregistered shape 语义）
const parsed = def.paramsSchema.parse(params);             // 第一道：形状字段校验
JsonObjectSchema.parse(parsed);                            // 第二道：JSON-safe 护栏（拦 function/undefined）
// 喂进 circumscribe / boundaryPoint / anchor / emit（参数现可信任）
```

**`circumscribe` 契约强化（关键）**：`circumscribe(...)` 必须返回**包含完整 shape 的精确 AABB 半轴**，且 `Node.position` = 该 AABB 中心。原因：compile 的 viewBox / scope.id bbox **只累积 `layout.rect` 四角**（`compile.ts:487-493`），不看 emit 的真实路径。参数化形状（sector / polygon / star）据 params 算 AABB；文本形状据内框算（现状）。`emit` / `anchor` / `boundaryPoint` 与 `circumscribe` 共用同一局部坐标系，圆心 / 质心等降为命名 anchor、不作 position。

**本 ADR 边界 = 纯机制**：建接口 + schema + 桥接 + 迁移框架，把现有 4 形状迁到新签名、**行为等价回归**（它们 `paramsSchema = z.strictObject({})`、忽略 `params`、emit/anchor 输出逐字段同现状）。各形状参数化归 [ADR-02~05](./roadmap.md)。

理由：

1. **直接复用 core 已验证的 path generator 范式**——擦除注册表（无逆变）+ 双 parse 护栏（JSON-safe）+ `define*` 包装器，不发明新机制。
2. **nested params 让 strict + JSON 护栏可做**——`params` 单独一层，整体跑 `paramsSchema`（strict）+ `JsonObjectSchema`；无参 = `params` 省略 = `{}`，无 `z.void()` 与对象形态的冲突。
3. **连接能力解锁**——`boundaryPoint` / `anchor` 拿到 params，任意注册形状一等可连接，无专用 primitive 旁路。
4. **向后兼容**——裸 string = 无参；现有 IR / DSL / vanilla 零改动，现有 4 形状等价回归。

## 待决策点 🔻

- **顶层 shape 专属参数迁移**：`roundedCorners`（rectangle 专属）随 [ADR-04](./04-rectangle-polygon.md) 迁入 rectangle params；本 ADR 只定划界规则——**通用布局参数**（`minimumWidth/Height` / `scale` / `padding`）留顶层、**形状专属参数**进 `params`。迁移期顶层兼容由 04 处理。
- **无参形状 paramsSchema**：用 `z.strictObject({})`（拒多余字段），而非 `JsonObjectSchema`（宽松）；让误传 `{type:'rectangle', params:{foo:1}}` 在第一道 parse 即报错。

## DSL 表面（react + vanilla 双示例）

```tsx
// react —— 无参裸 string（现状不变）
<Node shape="rectangle" />
// react —— 带参 nested
<Node shape={{ type: 'sector', params: { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 } }} />
// 连接：扇形可被 path 连（boundaryPoint 拿到 params 后求边界）
<Path from={{ id: 'wedge', anchor: 'outer-arc-mid' }} to={[120, 0]} />
```

```ts
// vanilla builder —— 同一份 IR，node config 的 shape 字段对等
node('wedge', { shape: { type: 'sector', params: { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 } }, position: [0, 0] });
node('box', { shape: 'rectangle' });   // 裸 string 等价
```

## 测试设计

`packages/core/core/tests/shapes/shape-params.test.ts`（新建）+ `tests/shapes/shape-definition.test.ts`（扩）+ `tests/compile/node-shape.test.ts`（扩）覆盖：string / nested 两写法解析；裸 string ≡ `{type, params:{}}`；`defineShape<T>` 注册后擦除取出、params 经双护栏喂函数；未注册 type compile throw；paramsSchema 违例 reject；非 JSON params 被第二道 `JsonObjectSchema.parse` 拦；4 形状迁移等价回归；`circumscribe` 返回 AABB 驱动 bbox；nested shape × rotate / scale；IR round-trip 自描述。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/core/core/src/shapes/types.ts`**（修改）：`ShapeDefinition` → 擦除式（`ShapeDefinitionInput<TParams>` + 别名 `ShapeDefinition = Input<IRJsonObject>`）、5 函数加 `params`、加 `paramsSchema`。⚠️ 触动所有实现者（内置随本 ADR 迁移）。
- **`packages/core/core/src/shapes/define.ts`**（新建）：`defineShape<T>`。
- **`packages/core/core/src/ir/shape.ts`**（新建）：`ShapeRefSchema`（nested params）。
- **`packages/core/core/src/ir/node.ts`**（修改）：`shape` → `union(string, ShapeRefSchema)`。
- **`packages/core/core/src/compile/node.ts`**（修改）：normalize + 双护栏 + params 透传。
- **`packages/core/core/src/shapes/{rectangle,circle,ellipse,diamond}.ts`**（修改）：经 `defineShape`、`paramsSchema: z.strictObject({})`、忽略 params、等价。
- **对外 API**：`NodeSchema.shape` additive union（裸 string 仍合法）；`ShapeDefinition` 签名变化。⚠️ **BREAKING（注册侧）**：外部 `CompileOptions.shapes` 实现者改用 `defineShape({ paramsSchema, ... })`、函数加末位 `params`。迁移：无参填 `paramsSchema: z.strictObject({})`、忽略 `params`。
- **render**：现有 4 形状 emit 不变 → 渲染零改动。
- **文档**：reference shape 页补「带参 shape（nested params）」+ vanilla node 写法。

## 不在本 ADR 范围

- 各形状 params 与几何：circle→ellipse（[ADR-02](./02-circle-ellipse.md)）、arc/sector（[ADR-03](./03-arc-sector.md)）、rectangle `roundedCorners` 迁移 + polygon（[ADR-04](./04-rectangle-polygon.md)）、star（[ADR-05](./05-star.md)）。
- 非中心对称布局深度适配（圆心偏移形状的相对定位 / 精确 scope bbox）：`circumscribe` 返回精确 AABB 已满足现有 bbox / 裁剪机制；深度适配超出则另开。
- 时间轴动画：顺延 v0.3-alpha.5。

---

## 实现契约（必填）🔻

### Level

`red`

判级：动 `packages/core/core/src/ir/**`（shape / node schema）+ `src/compile/**`（桥接）→ red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `src/ir/shape.ts` | 新建 schema | `ShapeRefSchema` | `z.object({ type: z.string().min(1), params: JsonObjectSchema.optional() })` | — | shape 引用：type + nested JSON params |
| `src/ir/node.ts` | 改字段 | `shape` | `z.union([z.string().min(1), ShapeRefSchema]).optional()` | `'rectangle'`（编译期） | shape：裸 name 或 `{type, params?}` |
| `src/shapes/types.ts` | 改类型 | `ShapeDefinition` | 擦除别名 = `ShapeDefinitionInput<IRJsonObject>`；`paramsSchema: ZodType<IRJsonObject>` + 5 函数加 `params` | — | shape 定义擦除式、params 暴露给计算逻辑 |
| `src/shapes/define.ts` | 新建函数 | `defineShape` | `<T extends IRJsonObject>(def: Input<T>) => ShapeDefinition` | — | 定义点 typed、擦除进 registry |

### 文件 scope

- `packages/core/core/src/ir/shape.ts`（新建）
- `packages/core/core/src/ir/node.ts`（修改：shape union）
- `packages/core/core/src/ir/index.ts`（修改：导出 ShapeRefSchema）
- `packages/core/core/src/shapes/types.ts`（修改：擦除式 ShapeDefinition）
- `packages/core/core/src/shapes/define.ts`（新建：defineShape）
- `packages/core/core/src/shapes/{rectangle,circle,ellipse,diamond}.ts`（修改：经 defineShape、strictObject 空 params、等价）
- `packages/core/core/src/shapes/index.ts`（修改：BUILTIN_SHAPES 经 defineShape）
- `packages/core/core/src/compile/node.ts`（修改：normalize + 双护栏 + 透传）
- `packages/core/core/src/index.ts`（修改：导出 defineShape / ShapeRefSchema）
- `packages/core/core/tests/shapes/shape-params.test.ts`（新建）
- `packages/core/core/tests/shapes/shape-definition.test.ts`（扩）
- `packages/core/core/tests/compile/node-shape.test.ts`（扩）

### 测试象限

**Happy path（≥ 3）**：

- `shape_string_form_parses`：`shape: 'rectangle'` → 合法、编译等价 `{type:'rectangle', params:{}}`
- `shape_nested_object_parses`：`{type:'rectangle'}` 与 `{type:'x', params:{...}}` → 合法解析
- `defineShape_typed_erased_roundtrip`：`defineShape<{r:number}>({...})` 注册 → registry 取出 → params 经双护栏喂 boundaryPoint
- `builtin_four_equivalent`：rectangle/circle/ellipse/diamond 迁移后 emit 与迁移前逐字段一致（快照回归）

**边界（≥ 2）**：

- `no_params_empty_object`：`{type:'rectangle'}`（无 params）→ `z.strictObject({})` 通过、行为同裸 string
- `string_equals_nested`：`'rectangle'` 与 `{type:'rectangle'}` 编译产物逐字段相等

**错误路径（≥ 2）**：

- `unregistered_type_throws`：`{type:'nope'}` → 编译期 throw
- `params_schema_violation_rejected`：paramsSchema 要 `innerRadius:number`，给 `{innerRadius:'a'}` → 第一道 parse reject
- `non_json_params_caught_by_second_guard`：宽松 paramsSchema（如放过 `undefined`）→ 第二道 `JsonObjectSchema.parse` 拦下
- `strict_params_reject_extra_field`：无参形状给 `{type:'rectangle', params:{foo:1}}` → strictObject reject
- `shape_neither_string_nor_object`：`shape: 42` → schema reject

**交互（≥ 2）**：

- `nested_shape_with_rotate`：`{type:'rectangle'}` + Node `rotate:30` → boundaryPoint/anchor 经 rotate 的 Rect 正确
- `nested_shape_with_scale`：带 `scale` 的 Node × nested shape → 尺寸协同
- `circumscribe_aabb_drives_bbox`：参数化测试形状 circumscribe 返回 AABB → viewBox/scope bbox 用它（对齐 `compile.ts:487`）
- `roundtrip_self_describing`：含 nested shape 的 IR → JSON → parse → 等价（params 全在 IR、无信息丢失）

### 依赖的现有元素

- `PathGeneratorDefinition` / `definePathGenerator` / `compile/path/index.ts` 双护栏（`src/pathGenerators/**` / `src/compile/path/index.ts:516-519`）—— **范式参照**：擦除注册表 + 双 parse + define 包装器照抄。
- `JsonObjectSchema` / `JsonValueSchema`（`src/ir/json.ts`，`src/index.ts` 已导出）—— **复用**：nested params 类型 + 第二道护栏。
- `CompositeNodeSchema` / `.passthrough()`（`src/ir/composite.ts`）—— **参照**：「路由层放行 + 编译期强校验」分层（本 ADR 改用 nested + JsonObjectSchema，比 passthrough 更严）。
- `ShapeDefinition`（`src/shapes/types.ts`）—— **修改**：擦除式 + paramsSchema + 函数加 params。
- 内置 4 形状（`src/shapes/{rectangle,circle,ellipse,diamond}.ts`）—— **修改**：经 defineShape、等价回归。
- `Node.shape` 编译路径（`src/compile/node.ts`）—— **修改**：normalize + 双护栏 + 透传。
- bbox 累积（`src/compile/compile.ts:487-493`，只用 `layout.rect` 四角）—— **依赖**：circumscribe 必返回精确 AABB 的约束来源。
