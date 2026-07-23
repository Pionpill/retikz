# ADR-02：Scope 自身锚点与变换基点

- 状态：Proposed
- 决策日期：2026-07-23
- 关联：[alpha.1 roadmap](./roadmap.md) · [v0.5 roadmap](../roadmap.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md) · [ADR-01 Node 锚点定位](./01-node-anchor-position.md)

> 本 ADR 冻结设计，不授权实现。进入实现前仍需 Architecture Gate PASS 与人工确认。

## 背景

Scope 只能绕局部原点变换，上层必须知道子图原点与尺寸，才能把其中心、边或角对齐外部目标；rotate / scale 也无法绑定最终内容包络。该能力需要在 Core 中统一处理固有布局、self point、transform 与最终 placement，不能由 parser 或 renderer 补丁实现。

## 决策

### 公开契约

```ts
type IRScopeSelfPoint = 'origin' | IRAnchorRef | IRPosition;
type IRScopePlacementTarget = IRPosition | IRNodeTarget;

type IRScopePlacement = {
  target: IRScopePlacementTarget;
  selfAnchor?: IRScopeSelfPoint;
};

type IRScope = {
  placement?: IRScopePlacement;
};

type IRRotateTransform = {
  kind: 'rotate';
  degrees: number;
  pivot?: IRScopeSelfPoint;
};

type IRScaleTransform = {
  kind: 'scale';
  x: number;
  y?: number;
  pivot?: IRScopeSelfPoint;
};
```

- `IRScopeSelfPoint` 的 `'origin'` 是固有局部 `[0, 0]`；`IRAnchorRef` 覆盖标准 anchor、数字角度和 `{ side, fraction }`；`IRPosition` 是显式局部坐标。
- `placement.selfAnchor` 缺省 `center`；`pivot` 缺省 `origin`；`scale.y` 缺省 `x`。
- `placement.target` 只接受父坐标系 `IRPosition` 或此前完成的 Node / Coordinate / Scope `IRNodeTarget`。target anchor 缺省 `center`，offset 保持世界 user-units；Polar、Offset、Between 和 path-relative target 被 schema 拒绝。
- `ScopePlacementSchema`、`ScopeSelfPointSchema` 和 Scope 字段均为 strict / 闭合契约。`schemas/scope-point` 是 self point 的无环 owner，由 Scope 与 Transform 单向复用。
- pivot 只能引用当前 Scope 的 self point，不能引用外部 id。v0.5 移除 IR rotate 的 `cx` / `cy`，不保留别名；Scene rotate 的 `cx` / `cy` 仍是 lowering 产物。非原点 scale pivot lower 为既有 translate / scale 组合，不扩展 Scene。
- React `ScopeProps` 等价暴露该契约；Vanilla `scope()` 直接接收 `IRScope`，不增加平行 helper 或物化默认值。

### 包络

- rectangle 使用 children `outerRect` 在固有局部坐标系中的角点 AABB，包含 Node margin；`boundingShape: 'circle'` 使用同一组角点的最小外接圆，不重复测量。
- 空 Scope 的 origin、center、边、角和数字角度均退化为 `[0, 0]`；`{ side, fraction }` 保持零尺寸 fail-loud。
- shape-specific anchor 继续走现有 shape / boundary resolver；不新增 bbox、anchor 或 transform registry。

### 求值顺序

1. 在 parent frame 冻结 `placement.target`，只读取 traversal 当前点以前已完成且可见的实体；建立当前 Scope placeholder 与固有局部帧，own placement / transforms 不进入该帧。
2. children 完成局部布局与 descendant transforms，形成只供当前 Scope 收尾的 intrinsic snapshot；Scene children 不烘焙 own transform。
3. 从 child outerRect 计算固有 rectangle / circle envelope，并在其上解析所有 pivot。
4. lower own transforms。数组第 0 项最外层、最后一项最先作用；rotate pivot lower 为 Scene `cx/cy`，scale pivot `[px, py]` 展开为 `[translate(px,py), scale, translate(-px,-py)]`。
5. 把 own chain 应用于固有包络，在 transformed envelope 上解析 `placement.selfAnchor`；target 投影到 parent frame 后求 delta，并把 placement translate prepend 到 chain 第 0 项。无 placement 时不生成该项。
6. own chain 与 ancestor chain 组合后，只发布最终 Group、namespace、observer、target 与 auto viewBox 几何；intrinsic snapshot 不注册，children 不重复应用 own chain。

placement 不反向改变 pivot。既有 Scope placeholder + pending path 仍可让 children 引用最终 Scope bbox。

### 错误契约

- forward、self、descendant、未完成 placeholder 和引用 cycle 同步抛错，不拓扑排序或 fallback。
- 非 finite pivot、target、placement 结果同步抛错；未定义 target、未注册 boundary 和不支持的 anchor 沿用现有诊断。
- uniform、non-uniform、negative scale 均合法，rotate 沿用屏幕 y-down 角度约定。zero scale 可作纯视觉 transform；需要跨该 chain 反投影时抛 `non-invertible scope transform`。

## DSL

```tsx
<Scope
  id="legend"
  placement={{
    target: { id: 'panel', anchor: 'top-right' },
    selfAnchor: 'top-left',
  }}
  transforms={[
    { kind: 'scale', x: 1.2, pivot: 'center' },
    { kind: 'rotate', degrees: 12, pivot: [8, 12] },
  ]}
>
  {children}
</Scope>
```

## 被否决的方案

- 保留 rotate `cx/cy` 再增加 self pivot：形成两套重叠语义。
- 把 self anchor 塞进 `polar-translate.origin`：混淆自身点与外部 target，且拿不到最终包络。
- renderer 重算 pivot：会分裂 SVG / Canvas、namespace 与 viewBox 的几何真源。
- 允许 pivot 引用任意 id 或新增 self-anchor registry：前者引入循环求解，后者重复现有 anchor / shape / boundary 扩展链。

## 公开影响与兼容性

- `IRScope.placement`、`ScopeProps.placement` 与 transform `pivot` 是 additive API。
- IR rotate `cx/cy` → `pivot: [cx, cy]` 是 v0.5 breaking change；Scene contract 不变。
- 无 placement / pivot 的 Scope 保持原点变换语义；空 Scope 仍是合法 resolved target。
- transform array 顺序不变；pivot 展开和 placement prepend 由数值测试锁定。
- zero scale 仅在需要反投影时从静默退化改为 fail-loud。

## 验证与完备性

详细矩阵见 ignored `notes/plans/kernel-v0.5-alpha.1-scope/TEST_CONTRACT_ADR_02.md`，至少覆盖：

- strict schema、默认值、旧 rotate 拒绝、JSON round-trip 与 React / Vanilla 等价。
- rectangle / circle、margin、空 Scope、各类 self point、pivot / placement 数值顺序和嵌套 Scope。
- Node / Coordinate / Scope target、offset、不可逆 chain、引用错误，以及 Group / namespace / observer / viewBox 单一最终几何。

`@retikz/core` 拥有 schema、固有布局、包络、lowering 与 target layout；React / Vanilla 只负责等价 authoring，render 只执行既有 transforms。实现复用 synthetic layout、anchor resolver 和 transform chain，不建立平行 bbox 或 registry。

## 不在范围

- 自动布局、碰撞避让、通用约束求解或 forward-reference 拓扑排序。
- 重新定义 Node anchor-to-anchor。
- 修复 non-uniform scale + rotate 的 projected Rect 精度边界。

## 实现契约

- Level：`red`
- Schema：新增 `schemas/scope-point`；Scope 新增 strict `placement` / `IRScopePlacement` / `IRScopePlacementTarget`；Transform 复用 self point，删除 rotate `cx/cy` 并增加 pivot。
- Core：`compile/{scope,transform}.ts`、`compile/orchestration/{traversal,types}.ts`、`compile/node/synthetic.ts`。
- Adapters：React `Scope.tsx` / `adapter/fields.ts`；Vanilla 仅需 plain-spec 等价测试。
- 同步 Core / React / Vanilla tests 与 Kernel Scope / placement 中英文文档。
- 依赖 ADR-01 namespace lifecycle、Scope synthetic bbox / `boundingShape`、`IRNodeTarget`、anchor / boundary resolver、transform projection / inverse 与 GroupPrim。
