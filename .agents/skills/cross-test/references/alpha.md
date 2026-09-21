# Alpha 实现后自测

前提：ADR 已 Accepted，Architecture/Plan Gate 与实施授权有效，受影响实现测试、lint 和类型检查通过。Accepted 只表示设计获批，不免除本轮验证。

red/yellow 从 TEST_CONTRACT 的不变量与反例攻击实现；green 可跳过。不重复 happy path，重点查 JSON 往返、schema/discriminator 诊断、adapter 对等、registry/compile/renderer 组合和 docs 用户路径。

Bug Hunter 默认由主 agent 执行；已授权 reviewer 时按计划调用，不自动新增角色。先只写 tests/_scratch 探索，不修产品代码或改既有测试。确认 BLOCKING 后将证据交回实施阶段，转正式回归并修复，再重跑自测。

同一 BLOCKING 最多三轮修复，计划上限更小时取更小值；仍不收敛交人工。无 BLOCKING、WARNING 已处置、正式守卫和受影响验证通过后进入文档/收尾。不要把审计任务解释成自动修复授权。
