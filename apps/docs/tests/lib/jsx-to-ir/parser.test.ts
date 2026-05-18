import { type ReactElement, type ReactNode, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';
import { convertReactNodeToIR } from '@retikz/react';

import { parseRetikzJsx } from '@/lib/jsx-to-ir';

/** 测试便捷：解析成功返回 element，失败抛 — 让用例的 expect 自然定位失败原因 */
const parseOk = (source: string): ReactElement => {
  const result = parseRetikzJsx(source);
  if (!result.ok) throw new Error(`expected parse ok, got error: ${result.error}`);
  return result.element;
};

/** 测试便捷：解析失败返回 error；用 `parseErr(src)` 取 error 串做断言 */
const parseErr = (source: string): string => {
  const result = parseRetikzJsx(source);
  if (result.ok) throw new Error('expected parse error, but ok');
  return result.error;
};

/** 取 ReactElement 顶层 type 的短名（去掉 `@retikz/` 前缀），断言"确实是 retikz 真实组件" */
const typeName = (element: ReactElement): string | undefined => {
  const type = element.type as { displayName?: string; name?: string };
  const raw = type.displayName ?? type.name;
  if (raw === undefined) return undefined;
  return raw.startsWith('@retikz/') ? raw.slice('@retikz/'.length) : raw;
};

describe('parseRetikzJsx — happy path', () => {
  it('解析空 TikZ', () => {
    const element = parseOk('<TikZ />');
    expect(isValidElement(element)).toBe(true);
    expect(typeName(element)).toBe('TikZ');
  });

  it('解析带文本 child 的 Node', () => {
    const element = parseOk('<TikZ><Node>Hello</Node></TikZ>');
    expect(typeName(element)).toBe('TikZ');
    const props = element.props as { children?: ReactNode };
    // React 单 child 时 props.children 不裹数组
    const node = props.children as ReactElement;
    expect(typeName(node)).toBe('Node');
    const nodeProps = node.props as { children?: ReactNode };
    expect(nodeProps.children).toBe('Hello');
  });

  it('字面量 props：string / number / boolean / null / undefined', () => {
    const element = parseOk(
      '<TikZ a="x" b={1} c={true} d={false} e={null} f={undefined} g />',
    );
    const props = element.props as Record<string, unknown>;
    expect(props.a).toBe('x');
    expect(props.b).toBe(1);
    expect(props.c).toBe(true);
    expect(props.d).toBe(false);
    expect(props.e).toBeNull();
    expect(props.f).toBeUndefined();
    // 简写 attr 无 value → true
    expect(props.g).toBe(true);
  });

  it('一元 -/+ 数字字面量', () => {
    const element = parseOk('<TikZ a={-1.5} b={+0.5} />');
    const props = element.props as Record<string, unknown>;
    expect(props.a).toBe(-1.5);
    expect(props.b).toBe(0.5);
  });

  it('对象字面量 prop', () => {
    const element = parseOk('<TikZ position={{ x: 0, y: 0 }} />');
    const props = element.props as { position: unknown };
    expect(props.position).toEqual({ x: 0, y: 0 });
  });

  it('数组字面量 prop', () => {
    const element = parseOk('<TikZ values={[1, 2, "three"]} />');
    const props = element.props as { values: unknown };
    expect(props.values).toEqual([1, 2, 'three']);
  });

  it('模板字符串（无插值）当字符串处理', () => {
    const element = parseOk('<TikZ label={`hello world`} />');
    const props = element.props as { label: unknown };
    expect(props.label).toBe('hello world');
  });

  it('嵌套 children + 字面量插值', () => {
    const element = parseOk('<TikZ><Node>{1.5}</Node></TikZ>');
    const tikzProps = element.props as { children?: ReactNode };
    const node = tikzProps.children as ReactElement;
    const nodeProps = node.props as { children?: ReactNode };
    expect(nodeProps.children).toBe(1.5);
  });

  it('多 children 顺序保留', () => {
    const element = parseOk('<TikZ><Node>a</Node><Node>b</Node><Node>c</Node></TikZ>');
    const props = element.props as { children?: ReactNode };
    const children = props.children as Array<ReactElement>;
    expect(Array.isArray(children)).toBe(true);
    expect(children).toHaveLength(3);
    expect((children[0].props as { children: string }).children).toBe('a');
    expect((children[1].props as { children: string }).children).toBe('b');
    expect((children[2].props as { children: string }).children).toBe('c');
  });

  it('源码前后空白容忍', () => {
    const element = parseOk('   \n  <TikZ />  \n  ');
    expect(typeName(element)).toBe('TikZ');
  });

  it('与 convertReactNodeToIR 串联：能产出合法 IR', () => {
    const element = parseOk(
      '<TikZ><Node position={{ x: 0, y: 0 }}>A</Node><Node position={{ x: 50, y: 0 }}>B</Node></TikZ>',
    );
    const tikzProps = element.props as { children?: ReactNode };
    const ir = convertReactNodeToIR(tikzProps.children);
    // 不深究 IR 内部细节，但顶层应是 children 数组、长度 2 的 'node' kind
    expect(Array.isArray(ir.children)).toBe(true);
    expect(ir.children.length).toBe(2);
    expect(ir.children[0]?.type).toBe('node');
    expect(ir.children[1]?.type).toBe('node');
  });
});

describe('parseRetikzJsx — error cases', () => {
  it('空源码', () => {
    expect(parseErr('')).toMatch(/源码为空/);
    expect(parseErr('   \n  ')).toMatch(/源码为空/);
  });

  it('根节点非 JSX', () => {
    expect(parseErr('"hello"')).toMatch(/根节点必须是 JSX 元素/);
  });

  it('JSX 语法本身错误', () => {
    expect(parseErr('<TikZ><Node></TikZ>')).toMatch(/JSX 语法解析失败/);
  });

  it('白名单外的组件（原生 div）', () => {
    const err = parseErr('<div />');
    expect(err).toMatch(/不支持的组件：div/);
    expect(err).toMatch(/TikZ/);
  });

  it('白名单外的组件（自定义大写）', () => {
    expect(parseErr('<MyComponent />')).toMatch(/不支持的组件：MyComponent/);
  });

  it('成员组件名 <Foo.Bar/>', () => {
    expect(parseErr('<TikZ.Foo />')).toMatch(/不支持的组件名形式：JSXMemberExpression/);
  });

  it('表达式 prop：变量引用', () => {
    expect(parseErr('<TikZ a={foo} />')).toMatch(/不支持的表达式：标识符 foo/);
  });

  it('表达式 prop：函数调用', () => {
    const err = parseErr('<TikZ a={Math.cos(0)} />');
    expect(err).toMatch(/不支持的表达式类型：CallExpression/);
  });

  it('表达式 prop：二元算式', () => {
    const err = parseErr('<TikZ a={1 + 2} />');
    expect(err).toMatch(/不支持的表达式类型：BinaryExpression/);
  });

  it('children 含 .map 调用', () => {
    const err = parseErr('<TikZ>{nodes.map(n => <Node>{n}</Node>)}</TikZ>');
    expect(err).toMatch(/不支持的表达式类型：CallExpression/);
  });

  it('children 含变量引用', () => {
    expect(parseErr('<TikZ>{foo}</TikZ>')).toMatch(/不支持的表达式：标识符 foo/);
  });

  it('spread 属性 {...x}', () => {
    expect(parseErr('<TikZ {...props} />')).toMatch(/不支持的属性形式：\{\.\.\.spread\}/);
  });

  it('对象 spread 字段', () => {
    expect(parseErr('<TikZ a={{ ...other, x: 0 }} />')).toMatch(/不支持的对象形式：.*\{\.\.\.spread\}/);
  });

  it('对象 computed key', () => {
    expect(parseErr('<TikZ a={{ [k]: 1 }} />')).toMatch(/不支持的对象 key 形式：.*computed key/);
  });

  it('JSX Fragment 根节点', () => {
    expect(parseErr('<><Node /></>')).toMatch(/根节点必须是 JSX 元素/);
  });

  it('JSX Fragment 作为 child', () => {
    expect(parseErr('<TikZ><><Node /></></TikZ>')).toMatch(/不支持的 JSX Fragment/);
  });

  it('模板字符串含插值', () => {
    expect(parseErr('<TikZ label={`hi ${x}`} />')).toMatch(/含模板插值/);
  });
});
