# ADR-11：Domain padding 的比例与 range 单位

- 状态：Accepted（2026-09-01 人工确认 range 默认与显式 ratio 契约）
- 决策日期：2026-09-01
- 关联：[plot v0.2-alpha.1 roadmap](./roadmap.md) · [plot v0.1 ADR-01 Axis domain padding](../../v0.1/alpha.15/01-axis-domain-tick-strategy.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md)

## 背景与目标

连续位置 scale 现有 `domainPadding` 只把数值解释为 source domain span 的比例。同一个比例用于宽高不同的 plot area 时，会产生不同的视觉留白；上层即使知道 mark 的实际半径，也无法直接声明对应的 range 空间距离

Plot 拥有连续 position scale 的 domain、range 与 scale-family 变换，应同时支持数据比例和 range 单位两种明确语义。调用方必须能够直接按 plot 输出空间预留距离，同时保留按数据跨度扩展 domain 的能力；两种含义不能再由数值大小隐式猜测

## 决策：`kind` 显式选择单位，省略时使用 `range`

`domainPadding` 保留数字简写，并将对象形态扩展为带可选 `kind` 的两端配置：

```ts
type IRPlotDomainPadding =
  | number
  | {
      kind?: 'range' | 'ratio';
      lower?: number;
      upper?: number;
    };
```

数字形态等价于 `{ kind: 'range', lower: value, upper: value }`。对象省略 `kind` 时同样使用 `range`；对象必须至少提供 `lower` 或 `upper`，未提供的一端使用 `0`

理由：

1. range 留白直接对应 mark 半径、线宽或其它已经解析为输出单位的几何量，不再随画布宽高改变实际距离
2. `ratio` 仍适合需要随数据跨度扩张的统计或探索场景，但必须显式命名，避免与长度值混淆
3. scale 已拥有 domain、range 与 family transform，能够在同一 resolver 中完成反算并守住 log、sqrt、radial 与 pow 的不变量
4. 省略 `kind` 选择更常用的视觉距离语义；不根据数值是否小于 `1` 自动切换，避免同一配置因数值变化而改变单位

## 基础数据结构与公开契约

`kind: 'ratio'` 的每端值必须满足 `0 <= value < 1`，表示在该端增加 source domain span 的给定比例。ratio 的 `lower` / `upper` 分别作用于 domain 两端，解析行为保持 ADR-01 的 scale-family 规则

`kind: 'range'` 的每端值是有限非负的 scale range 单位。resolver 使用当前 position scale 的有效 range 长度，把 source domain 两端反算到 range 内侧指定距离的位置；range 方向反转不改变 `lower` / `upper` 对 domain 两端的归属。只要任一端为正，两端 range padding 之和就必须严格小于非零有效 range 长度，否则 fail-loud；两端都为 `0` 时保持 no-op，不因折叠 range 新增失败

range 反算在对应 scale family 的连续变换空间中完成：linear 与 time 使用线性空间，log 使用对数空间，pow / sqrt / radial 使用幂变换空间，symlog 使用其对称对数变换空间。完成反算后再恢复 domain 值，并继续执行该 family 的合法值约束。若正 range padding 必须把 constrained family 扩到非法 domain 才能满足指定距离，则 fail-loud，不通过 clamp 静默缩小请求距离；`ratio` 继续保持 ADR-01 已接受的 family padding 行为

解析顺序保持：

```text
source extent
  -> validate source domain
  -> expand single-value extent
  -> apply ratio or range domainPadding
  -> validate padded domain
  -> nice
```

`nice` 可以在 padding 之后继续向外扩展 domain，因此 range padding 是 nice 之前的确定距离，不承诺 nice 后仍恰好等于该值。省略 `domainPadding` 继续表示不扩展 domain

## 行为、失败语义与兼容性

- 默认行为：`domainPadding` 省略时仍为 `0`；声明数字或无 `kind` 对象时按 `range` 解释
- 失败与诊断：ratio 端值达到 `1`、正 range padding 的两端之和不小于有效 range 长度、range 非有限、无法形成非零有效长度或无法在 family invariant 内满足请求距离时 fail-loud；错误必须定位到对应 scale 与 `domainPadding`
- scale invariant：log 仍要求严格正 domain；sqrt / radial 与非整数 pow 仍要求非负 domain。padding 不把非法 source 修复为合法输入，也不绕过 padded-domain 校验
- 兼容性 / breaking：既有非零数字和 `{ lower?, upper? }` 从比例语义改为 range 语义；需要旧比例行为的 Source 必须显式增加 `kind: 'ratio'`。数值 `0` 的行为不变，不保留旧语义 fallback
- React / Vanilla 等价性：JSON IR、Vanilla Input 与 React props 表达同一个 schema-derived contract；adapter 只传递值，不解析 kind、range 或 scale family

## 最终结果

内置连续位置 scale 已统一按本 ADR 解析 range 与 ratio，并在各自变换空间中保留 scale-family invariant。自定义 position scale 继续由其 Definition 拥有 operation 解析，不被内置 resolver 隐式改写；当前不保留旧比例语义或其它兼容分支
