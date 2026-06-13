# ADR-01：shape 参数化泛化——shape 从 Rect-only 升为可注册「type + params」（对齐 path generator 擦除范式）

- 状态：Accepted
- 决策日期：2026-06-06
- 关联：[v0.3-alpha.4 roadmap](./roadmap.md) · [v0.3 roadmap §Alpha 切分](../roadmap.md) · [core-design.md §7 AI 友好](../../../../architecture/core-design.md) · **范式参照**：[v0.3-alpha.2 ADR-01 Tier 2 支撑](../alpha.2/01-tier2-support.md)（passthrough + 注册表）、core path generator（`pathGenerators/types.ts` + `pathGenerators/define.ts` + `compile/path/index.ts` 双护栏，与本 ADR 同构问题的现成范式）· 消费方：[ADR-02 circle/ellipse](./02-circle-ellipse.md) · [ADR-03 arc/sector](./03-arc-sector.md) · [ADR-04 rectangle/polygon](./04-rectangle-polygon.md) · [ADR-05 star](./05-star.md) · 下游：[plot v0.1-alpha.4](../../../../plot/v0/v0.1/roadmap.md)

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

- **⚠️ BREAKING（注册侧）**：`ShapeDefinition` 签名变化——外部 `CompileOptions.shapes` 实现者须改用 `defineShape({ paramsSchema, ... })`、5 函数加末位 `params`。迁移：无参形状填 `paramsSchema: z.strictObject({})`、忽略 `params`。`NodeSchema.shape` 本身是 additive union（裸 string 仍合法）、render 零改动。

## 不在本 ADR 范围

- 各形状 params 与几何：circle→ellipse（[ADR-02](./02-circle-ellipse.md)）、arc/sector（[ADR-03](./03-arc-sector.md)）、rectangle `roundedCorners` 迁移 + polygon（[ADR-04](./04-rectangle-polygon.md)）、star（[ADR-05](./05-star.md)）。
- 非中心对称布局深度适配（圆心偏移形状的相对定位 / 精确 scope bbox）：`circumscribe` 返回精确 AABB 已满足现有 bbox / 裁剪机制；深度适配超出则另开。
- 时间轴动画：顺延 v0.3-alpha.5。

> 实现指针：最终 schema / 类型 / 行为以代码为准；完整施工契约（Level / Schema 改动 / 文件 scope / 测试象限 / 依赖现有元素）+ DSL 示例 + 影响清单见本文件封板前全文。
> 🔖 本文件压缩前完整施工蓝图 = `git show 62562f1d:notes/decisions/core/v0/v0.3/alpha.4/01-shape-params-generalization.md`（封板全文）。
