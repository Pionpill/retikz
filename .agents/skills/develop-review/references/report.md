# 报告

## 报告

写入：

```text
notes/reports/develop-review-YYYY-MM-DD-<module>.md
```

该目录被 `.gitignore` 忽略，报告不 stage、不 commit。

报告结构：

```md
# Develop Review Report: <module>

日期：
审查范围：
基准快照：
所属分组 / 版本通道：
覆盖率声明：

## 结论概览

## BLOCKING

| # | 位置 | 维度 | 问题 | 建议改法 | 预估 Level | 坐实出口 |

## WARNING

| # | 位置 | 维度 | 观察 | 建议改法 | 预估 Level | 坐实出口 |

## INFO

| # | 位置 | 维度 | 观察 |

## 横向发现

## 建议 triage
```

无某档时写“无”。
