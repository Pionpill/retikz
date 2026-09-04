# ADR-14：Point family 按最大点半径预留 domain range

- 状态：Accepted（2026-09-01 人工确认 Point 最大半径 range 留白契约）
- 决策日期：2026-09-01
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-04 Scatter](./04-scatter.md) · [ADR-13 Bubble](./13-bubble.md) · [Plot ADR-11 Domain padding 单位](../../../../plot/v0/v0.2/alpha.1/11-domain-padding-units.md) · [Chart 封装完备设计](../../../../../architecture/chart-encapsulation-complete.md)

## 背景与目标

Point family 当前用固定 domain 比例为位置 scale 留白：Bubble 使用 `0.04`，其余 Point chartType 使用 `0.02`。比例值既随 plot area 宽高产生不同的视觉距离，也无法随 Point size 字段、常量半径或 authored Chart mark 的最终配置变化。小点可能得到过多空间，大点仍可能贴近边界或被裁切

Chart 拥有具体 chartType、semantic group、Chart mark 继承与 Point 几何意图，因此应根据当前 Chart 实际生成的 Point 半径选择默认留白。Plot 继续拥有 domain / range 反算、scale invariant 与 lowering；Chart 不实现第二套 scale 算法

## 决策：Point chartType 默认使用最大 Point 半径作为 range padding

Scatter、Bubble、Regression、Connected Scatter 与 Ranged Dot 的连续位置 scale，在作者没有显式声明 `domainPadding` 时，默认使用当前 Chart-owned semantic marks 中最大的 Point `size` 半径，并以 Plot `kind: 'range'` 传递

理由：

1. Point 的 `size` 是最终半径，Chart 可以从 resolved semantic mark 与 size scale 契约确定最大值
2. 使用最大半径可以让同一图在不同宽高下保持一致的边界距离，并覆盖 Bubble、复合 Point group 与 Relation endpoints
3. 自动策略只补 recipe-owned 连续 position scale 的缺省值，不改写作者显式 scale 或 Plot extension 的所有权
4. Point family 在共享层形成一个几何默认，不需要每个 chartType 继续维护固定比例常量

## 基础数据结构与公开契约

Point recipe 的 `domainPadding` 复用 Core 四边 spacing 原子，并增加 Plot 的单位判别：

```ts
type IRPointPositionDomainPadding =
  | number
  | (IRBoxSpacing & {
      kind?: 'range' | 'ratio';
    });
```

数字简写与对象省略 `kind` 时使用 `range`；对象必须至少提供一个 spacing 字段，不能只声明 `kind`。对象字段按 Core spacing 规则解析：具体 side 高于 `x` / `y`，轴向值高于 `default`。range 对象未覆盖的边使用 recipe 自动最大半径；ratio 对象未覆盖的边使用 `0`，需要共享 ratio 时由 `default` 显式声明。`kind: 'ratio'` 的各 spacing 值必须满足 `0 <= value < 1`

Cartesian 接受 `default`、`x`、`y`、`top`、`right`、`bottom` 与 `left`。视觉四边根据 position scale 的有效 range 方向映射到 Plot domain 的两端，不能把 `top`、`right` 固定等同于 domain upper。Polar 接受 `default`、`x` 与 `y`，其中 x / y 分别表示 angle / radius position role；具体四边在 Polar 与其它非 Cartesian coordinate 下没有稳定含义，必须 fail-loud

最大半径按最终 Chart semantic group 计算：

- Point 常量 `size` 使用该半径；省略 size 时使用 Plot Point 的默认半径 `5`
- Point 字段 size 使用所引用 sqrt scale 的有效 range 最大值；省略显式 range 时使用 Plot 默认最大半径 `20`，range 反向时仍取两个端值的数值最大值
- encoding 与 properties 同时作用于同一 Point size slot 时，沿现有优先级只计算最终胜出的 size
- Regression 与 Connected Scatter 计算 group 中 Point member；Ranged Dot 计算 shared point 与 start / end 覆盖后的两个 Relation endpoint 半径；普通与 override Chart marks 按最终 semantic group 结果参与
- `plotExtension.marks` 保持纯 Plot 内容，不参与 Chart 默认值推导；需要其几何留白时由作者显式配置 position scale

本策略只以 Point `size` 半径作为默认，不额外加入 strokeWidth、padding、minimumSize、scale、旋转后包围盒或 renderer stroke 扩张。需要覆盖这些表现性扩张时，作者显式增加 `domainPadding`

## 行为、失败语义与兼容性

- 默认行为：五个 Point chartType 不再使用固定 `0.02` / `0.04` ratio；recipe-owned 连续 position scale 使用 `{ kind: 'range', ... }`，每端缺省值为当前最大 Point 半径。分类 position scale 不应用 domain padding
- 显式优先级：Point Properties 的 `domainPadding` 覆盖自动半径；encoding scale operation 显式提供的 `domainPadding`（包括 `0`）继续胜出；`plotExtension` 显式提供或替换的 position scale 不被 Chart 自动改写
- authored mark：普通 Chart mark 增加的 Point 以及命中 override 后保留的 Point 都参与最大值；被 override 移除的内建 group 不参与
- 失败与诊断：空 spacing 对象、非 Cartesian coordinate 出现具体四边、ratio 值达到 `1`、无法从 Chart-owned Point size 或兼容 sqrt scale 确定有限非负半径时，在 Chart owner 边界 fail-loud，不静默回退固定比例
- 兼容性 / breaking：既有数字与 `{ x?, y? }` 改按 range 解释；旧比例配置需要增加 `kind: 'ratio'`。新增 Core spacing 字段，不保留固定比例默认或旧解析双轨
- React / Vanilla 等价性：具体 Chart 根配置、declaration、Vanilla Input 与 JSON Source 共享同一 Point `domainPadding` shape；adapter 不计算半径、不扫描 rows，也不生成 Plot domain

## 最终结果

五个 Point chartType 已统一从最终 Chart-owned Point marks 推导最大半径，并只为缺少显式配置的 recipe-owned 连续位置 scale 提供 range 默认。Properties、encoding scale operation 与 Plot extension 的所有权优先级保持不变；`plotExtension.marks` 的额外几何留白仍由作者显式配置
