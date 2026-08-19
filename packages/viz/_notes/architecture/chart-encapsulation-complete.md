# Chart 封装完备设计

> **状态：当前能力准入清单。** 本文判断一个 Chart type 或 Chart 基础能力是否在“精确 Source schema → 绑定 → Base 解析 → Plot lowering → presentation”主链上闭环。

## 1. 完备目标

Chart 封装完备要求：Base Chart 能承载完整 Plot；每个封装 type 有自己的精确 JSON-safe schema、配置与 recipe；所有 type 绑定后统一解析为 `IRBaseChart`；React、Vanilla 与 JSON 入口保持等价；Plot 扩展、诊断、Theme、identity 和 presentation 不因封装丢失。

## 2. 数据结构完备

- [ ] `BaseChartSchema` 使用精确 `type: 'base'`、完整 `PlotSchema`，且没有 `config`
- [ ] 每个封装 type 有独立 `XxxChartSchema` / `IRXxxChart`
- [ ] 根只保存 Chart-owned identity、theme token 与 presentation
- [ ] `plot` 只保存 Plot-owned 字段并组合复用 `PlotSchema`
- [ ] `config` 只保存该 type 独有的数据角色与专属配置
- [ ] 不公开 `ChartSchema` / `IRChart` union、family schema 或 family union
- [ ] 所有 schema strict、JSON-safe、可 round-trip，显式 `undefined` 归一后不残留

## 3. Dispatch 与解析完备

- [ ] 未知输入只先检查 `namespace + type`
- [ ] `type` 精确选择一个 schema 与 recipe；未知 type fail-loud
- [ ] 命中 schema 只 parse 一次，随后绑定为 `BoundChart`
- [ ] `resolveChart` 只消费 bound input 与 context，不重新解析 Source IR
- [ ] 所有 recipe 最终返回 `IRBaseChart`，Core 只消费 `chart.base`
- [ ] type-specific 错误路径以 `config` 开头，Plot-owned 路径以 `plot` 开头

## 4. Recipe 完备

每个 type 必须同时闭合：

- [ ] 必需数据角色和精确失败语义
- [ ] 主 mark、scale、coordinate/composition 等核心结构
- [ ] 稳定 recipe identity 与确定性 Plot 输出顺序
- [ ] Chart token / Plot palette 驱动的表现性默认
- [ ] `config` 与 recipe 核心结构直接组合
- [ ] `plot` transform、scale、guide、附加 mark、theme、size 与 meta 扩展
- [ ] 空数据、非法 channel、冲突 id、重复 scale 与空间根冲突诊断

相似视觉结构不能替代独立语义。Bubble 与 Scatter 即使共享 Point helper，也必须保持独立 schema、type、size 角色、错误和 round-trip intent。源码 family 只做组合式复用，不成为运行时 discriminator。

## 5. Presentation 与 Theme 完备

- [ ] presentation 恰好包含一个 Plot placeholder
- [ ] title、subtitle、note、source 各至多一次并保持 authored order
- [ ] marker/plain-record `position` 在 authoring 后消失
- [ ] presentation Input 与 normalize 只由 Chart Vanilla 拥有，React marker 映射到同一 Input
- [ ] 文本复用 Core TextBlock，布局复用 Layout Flex，外框复用 Standard Surface
- [ ] Chart 与 Plot token owner 分离，不复制 Plot theme resolver
- [ ] Core effective Theme、Chart definitions 与 Plot definitions 在 standalone/embedded 路径一致
- [ ] 缺失同名 Chart/Plot style definition fail-loud

## 6. Adapter 与入口完备

- [ ] 根只公开 `<Chart />` / `createChart()` 等 Base API
- [ ] family subpath 只增加具体 `<XxxChart />` / `createXxxChart()`，不转发 Base API
- [ ] 每个组件/工厂拥有精确 props/input，不接受通用 `type`
- [ ] Vanilla 根导出精确 `InputChart` / `normalizeChart`，family 只增加逐类型 Input/normalize，不导出 Point input union 或 Point 专属 adapter
- [ ] React 只构造 Vanilla Input 并调用同一 normalize；Source IR 绑定后由运行时共享唯一 Chart adapter
- [ ] datasets、Plot lower options、Chart/Plot/Core Theme definitions 和宿主 Scope 保真传递
- [ ] React、Vanilla、JSON 对等输入生成等价 `IRBaseChart` 与 IRPlot

## 7. Plot 与空间透明完备

- [ ] typed Chart 不裁剪 Plot 可达能力
- [ ] 显式附加 mark/guide/scale 使用 Plot 正式 schema 与 lowering
- [ ] coordinate 与 composition 保持唯一空间根
- [ ] recipe 生成的内部 id 不与显式扩展冲突
- [ ] Chart 外层 identity 与 Plot provenance/spatial handle 连续
- [ ] 无 presentation 时仍由同一 Chart Surface 路径承载 Plot

## 8. 文档与测试证据

- [ ] 中英文文档说明 exact schema、`plot`/`config` owner 与 Base 汇合点
- [ ] 文档明确 `/point` 是入口/归置边界，不是运行时 family
- [ ] 每个 type 页面说明数据角色、隐含核心、专属配置、Plot 扩展和不适用场景
- [ ] schema、dispatch、recipe 输出、error、identity、provider、adapter、SSR 测试齐全
- [ ] public-surface 与 package-boundary 测试证明根/子路径导出正确且旧 union 符号不存在

## 9. 反例

以下任一情况都表示封装未完备：

- 为方便 dispatch 建立公开 `ChartSchema` discriminated union
- 让 `PointChartSchema` 或 Point adapter 成为所有点图的必经层
- 把 data、scale、guide、mark extension 放回 Chart 根或 `config`
- adapter 根据任意 `type` 运行宽输入，再在内部探测字段结构
- recipe 生成 IRPlot 后丢弃 type 核心不变量
- 为封装类型发布逐类型 Core provider 或复制 Plot registry
- React、Vanilla 与 JSON 使用不同 schema、presentation 顺序或 Theme 解析

## 10. 准入结论

只有上述闭环都有源码与测试证据时，一个 Chart type 才能进入公开入口和文档。新增 type 只增加自己的精确 schema、recipe、组件、工厂、测试与页面；不得顺带扩大公开 union、family runtime 或通用配置层。
