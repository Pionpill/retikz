import { describe, expect, it } from 'vitest';

import type { NodeEvalCase } from '../suite';
import { gradeNodeAnswer, nodeEvalCases } from '../suite';

/** 用于证明字段选择、零值和省略语义的固定需求 */
const fillCase: NodeEvalCase = {
  id: 'fill-only',
  task: '只把填充不透明度因子设为 0，整体和描边继续继承',
  expected: { type: 'node', style: { opacity: { fill: 0 } } },
  mustOmit: ['style.opacity.overall', 'style.opacity.stroke'],
};

describe('节点回答的确定性判分', () => {
  it('对正确输入同时给出结构、字段、值及联合结果', () => {
    expect(gradeNodeAnswer(fillCase, JSON.stringify(fillCase.expected))).toMatchObject({
      eligible: true,
      jsonValid: true,
      schemaValid: true,
      fieldSelectionCorrect: true,
      valuesCorrect: true,
      success: true,
    });
  });

  it('拒绝结构合法但误将仅填充透明写为整体透明的输入', () => {
    expect(gradeNodeAnswer(fillCase, '{"type":"node","style":{"opacity":0}}')).toMatchObject({
      schemaValid: true,
      fieldSelectionCorrect: false,
      valuesCorrect: false,
      success: false,
    });
  });

  it('原始字段省略不能被解析默认值或显式重置掩盖', () => {
    const score = gradeNodeAnswer(fillCase, '{"type":"node","style":{"opacity":{"fill":0,"overall":1}}}');
    expect(score).toMatchObject({ schemaValid: true, fieldSelectionCorrect: false, success: false });
    expect(score.checks).toContainEqual(expect.objectContaining({ path: '$.style.opacity.overall', passed: false }));
  });

  it('接受声明的标量整体透明度和稀疏整体因子等价', () => {
    const testCase: NodeEvalCase = { ...fillCase, expected: { type: 'node', style: { opacity: 0.4 } }, mustOmit: [] };
    expect(gradeNodeAnswer(testCase, '{"style":{"opacity":{"overall":0.4}},"type":"node"}').success).toBe(true);
  });

  it('拒绝不相关的合法视觉改动和被宽松子对象剥离的字段', () => {
    for (const extra of [
      { style: { opacity: { fill: 0 }, color: 'red' } },
      { style: { opacity: { fill: 0 } }, position: { angle: 0, radius: 2, invented: 7 } },
    ]) {
      expect(gradeNodeAnswer(fillCase, JSON.stringify({ type: 'node', ...extra })).success).toBe(false);
    }
  });

  it('拒绝非 JSON、Markdown 包装及语义无关的 JSON 值', () => {
    for (const answer of ['no answer', '```json\n{"type":"node"}\n```', 'null', '[]', '1']) {
      const score = gradeNodeAnswer(fillCase, answer);
      expect(score.success).toBe(false);
      expect(score.valuesCorrect).toBe(false);
    }
  });

  it('不让不计分的契约诊断题产生成功样本', () => {
    expect(
      gradeNodeAnswer({ ...fillCase, diagnostic: 'host contract mismatch' }, JSON.stringify(fillCase.expected)),
    ).toMatchObject({
      eligible: false,
      success: false,
    });
  });

  it('单标签/数组、字体行表示、颜色与静态默认的同义输入仍可通过', () => {
    const variants = [
      { id: 'NA004', answer: { type: 'node', shape: { type: 'circle' } } },
      { id: 'NA002', answer: { type: 'node', id: 'source', aliasIds: ['origin', 'upstream'] } },
      { id: 'NB003', answer: { type: 'node', scale: { default: 1.5 } } },
      { id: 'NG002', answer: { type: 'node', layout: { minimumSize: { width: 50, height: 50 } } } },
      { id: 'NG004', answer: { type: 'node', layout: { padding: { default: 6 }, margin: { x: 10, y: 10 } } } },
      { id: 'ND001', answer: { type: 'node', text: ['第一行', '第二行'] } },
      { id: 'NH001', answer: { type: 'node', label: [{ text: '注释' }] } },
      { id: 'NE014', answer: { type: 'node', style: { dotted: true, dashed: false } } },
      { id: 'NE008', answer: { type: 'node', style: { stroke: '#0000ff', strokeWidth: 0 } } },
    ];
    for (const { id, answer } of variants) {
      const testCase = nodeEvalCases.find(candidate => candidate.id === id)!;
      expect(gradeNodeAnswer(testCase, JSON.stringify(answer)).success, id).toBe(true);
    }
  });

  it('数组标签也不能绕过原始省略检查', () => {
    const testCase = nodeEvalCases.find(candidate => candidate.id === 'NH004')!;
    const answer = { type: 'node', label: [{ text: 'M', position: { side: 'bottom', fraction: 0.5 } }] };
    expect(gradeNodeAnswer(testCase, JSON.stringify(answer))).toMatchObject({
      schemaValid: true,
      fieldSelectionCorrect: false,
      success: false,
    });
  });

  it('行内公式接受省略已声明的 false 默认值，块级公式仍不等价', () => {
    const testCase: NodeEvalCase = {
      id: 'inline-tex-default',
      task: '只生成行内公式 x',
      expected: { type: 'node', text: [{ segments: [{ tex: 'x', displayMode: false }] }] },
    };
    expect(gradeNodeAnswer(testCase, '{"type":"node","text":[{"segments":[{"tex":"x"}]}]}').success).toBe(true);
    expect(
      gradeNodeAnswer(testCase, '{"type":"node","text":[{"segments":[{"tex":"x","displayMode":true}]}]}'),
    ).toMatchObject({
      schemaValid: true,
      valuesCorrect: false,
      success: false,
    });
  });

  it('不能把未请求的描边默认值当作无害填充覆盖继承', () => {
    const answer = { type: 'node', style: { opacity: { fill: 0 }, lineJoin: 'miter' } };
    expect(gradeNodeAnswer(fillCase, JSON.stringify(answer)).success).toBe(false);
  });
});
