# 报告

## 报告

报告写入 ignored 路径：

```text
notes/reports/test-review-YYYY-MM-DD-<scope>.md
```

```md
# Test Review Report: <scope>

日期：
范围：
基准快照：
测试与实现读取范围：

## 结论概览

## 保留

| 测试 | 保护的当前契约 | 保留证据 |

## 合并

| 测试 | 重复证据 | 保留目标 | 最小保留断言 |

## 删除

| 测试 | 分类 | 过期或耦合证据 | 替代覆盖 / 风险承担 |

## 临时测试

| 测试 | 验证结论 | 删除或转正动作 |

## 建议实施顺序
```

没有某类时写“无”。报告不得 stage 或 commit。
