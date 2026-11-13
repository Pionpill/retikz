# 代码范式 reviewer

中大型任务默认纳入计划，经用户批准后执行；授权、快照和循环遵循 [常规评审](review-cycle.md)。默认由独立 Sol 实例以 high 执行，不承担功能正确性审查。

- 读取 [standard-name](../../standard-name/SKILL.md)、[standard-structure](../../standard-structure/SKILL.md) 及适用 references、就近 AGENTS；不复制或自创另一套标准。
- 围绕受影响 owner 检查完整文件结构、职责集中度、阶段输入输出、命名一致性、依赖方向、barrel 和公开导出。移动或拆分须同时检查原 owner、新 owner、入口与消费者，不只看 diff。
- 为判断职责与导出必要性，可读取类型签名和实际调用关系；内部复用、测试引用或零直接引用都不能单独决定公开 API 的保留与删除。声明依赖闭包按 imports 规范检查。
- finding 写明规则依据、位置、事实、影响和最小调整建议；不把个人风格偏好或未测量的性能猜测列为缺陷。
- 规范缺口单列为建议，由主 agent 提请用户决定是否沉淀；不自行修改规则、业务代码或扩大重构范围。
