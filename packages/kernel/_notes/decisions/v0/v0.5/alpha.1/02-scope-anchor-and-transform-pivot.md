# ADR-02：Scope 自身锚点与变换基点

- 状态：Accepted
- 决策日期：2026-07-23
- 关联：[ADR-01](./01-node-anchor-position.md)

## 背景

Scope 需要按自身内容包络的中心、边或角对齐外部 target，并让 rotate / scale 绑定最终包络；该语义必须在 Core 中统一处理固有布局、self point、transform 和 placement，不能由 parser 或 renderer 补丁实现

## 决策

公开结构为：

```ts
type IRScopeSelfPoint = 'origin' | IRAnchorRef | IRPosition;
type IRScopePlacementTarget = IRPosition | IRNodeTarget;
type IRScopePlacement = { target: IRScopePlacementTarget; selfAnchor?: IRScopeSelfPoint };
type IRScope = { placement?: IRScopePlacement };
type IRRotateTransform = { kind: 'rotate'; degrees: number; pivot?: IRScopeSelfPoint };
type IRScaleTransform = { kind: 'scale'; x: number; y?: number; pivot?: IRScopeSelfPoint };
```

`placement.selfAnchor` 缺省 center，pivot 缺省 origin，`scale.y` 缺省 x。Target 只接受父坐标系 position 或 traversal 之前完成的 Node / Coordinate / Scope；target anchor 缺省 center，offset 保持世界 user-units。Polar、relative、between、path-relative target 被拒绝。Self point schema strict，Scope 与 Transform 共享同一 owner

Pivot 只能引用当前 Scope 的 self point；Scene rotate 的 `cx/cy` 是 lowering 结果，非原点 scale pivot lower 为 translate / scale 组合，不扩展 Scene。React 与 Vanilla 暴露同一 IR，不提供 adapter shorthand

### 包络与求值顺序

Rectangle 使用包含 Node margin 的 children outerRect 角点 AABB；circle 使用同一角点的最小外接圆。空 Scope 的 origin、center、边、角和数字角度退化到 `[0, 0]`，`{ side, fraction }` 仍对零尺寸 fail-loud

1. 在 parent frame 冻结 target，登记 Scope placeholder，建立不含自身 placement / transform 的 intrinsic frame
2. 编译 children 并形成局部 snapshot，计算包络和 self points
3. 解析所有 pivot，按 transform 数组语义 lower own chain
4. 在 transformed envelope 上解析 placement self anchor，计算 parent-frame delta，并把 placement translate 放到 chain 最外层
5. 组合 ancestor chain，只发布最终 Group、namespace、observer、target、bbox 和 viewBox 几何；intrinsic snapshot 不注册，children 不重复应用 own chain

### 失败与兼容性

Forward、self、descendant、未完成 placeholder、cycle、非 finite point 和未注册 boundary / anchor 同步 fail-loud，不拓扑排序或 fallback。Uniform、non-uniform、negative scale 合法；zero scale 可作纯视觉 transform，但需要跨该 chain 反投影时抛 non-invertible scope transform。无 placement / pivot 的 Scope 保持原点变换语义，空 Scope 仍是合法 resolved target

`IRScope.placement`、`ScopeProps.placement` 和 transform `pivot` 是 additive API；IR rotate / scale 统一使用 pivot，Scene contract 不变

## 最终结果与遗留边界

Scope 的固有包络、pivot、最终 placement、namespace、bbox、observer 与 auto viewBox 已共享同一几何真源。不提供自动布局、碰撞避让、通用约束求解、forward-reference 拓扑排序；非均匀 scale + rotate 继续受 projected Rect 精度边界限制
