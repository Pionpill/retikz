import type { FC, ReactElement, ReactNode } from 'react';

import {
  Arc,
  Circle,
  Coordinate,
  Draw,
  EdgeLabel,
  Ellipse,
  Layout,
  Node,
  Path,
  Rectangle,
  RegularPolygon,
  Scope,
  Sector,
  Star,
  Step,
  Text,
} from '@retikz/react';
import { Axes, Frame, FrameDescription, FrameTitle, Grid } from '@retikz/standard-react';
import { Parser } from 'acorn';
import jsx from 'acorn-jsx';
import { createElement } from 'react';

const JsxParser = Parser.extend(jsx());

const COMPONENT_REGISTRY: Record<string, FC<Record<string, unknown>> | undefined> = {
  Layout,
  Node: Node as unknown as FC<Record<string, unknown>>,
  Path,
  Step: Step as unknown as FC<Record<string, unknown>>,
  Text: Text as unknown as FC<Record<string, unknown>>,
  Coordinate: Coordinate as unknown as FC<Record<string, unknown>>,
  Draw: Draw as unknown as FC<Record<string, unknown>>,
  EdgeLabel: EdgeLabel as unknown as FC<Record<string, unknown>>,
  Scope,
  Circle: Circle as unknown as FC<Record<string, unknown>>,
  Ellipse: Ellipse as unknown as FC<Record<string, unknown>>,
  Arc: Arc as unknown as FC<Record<string, unknown>>,
  Sector: Sector as unknown as FC<Record<string, unknown>>,
  Rectangle: Rectangle as unknown as FC<Record<string, unknown>>,
  Grid: Grid as unknown as FC<Record<string, unknown>>,
  Axes: Axes as unknown as FC<Record<string, unknown>>,
  Frame: Frame as unknown as FC<Record<string, unknown>>,
  FrameTitle,
  FrameDescription,
  RegularPolygon: RegularPolygon as unknown as FC<Record<string, unknown>>,
  Star: Star as unknown as FC<Record<string, unknown>>,
};

const componentNames = Object.keys(COMPONENT_REGISTRY).join(', ');

export type ParseRetikzJsxResult = { ok: true; element: ReactElement } | { ok: false; error: string };

type AstNode = { type: string; [key: string]: unknown };

/** 把 retikz-tsx 源码解析成可渲染的 React element。 */
export const parseRetikzJsx = (source: string): ParseRetikzJsxResult => {
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: '源码为空' };
  }
  let ast: AstNode;
  try {
    ast = JsxParser.parseExpressionAt(trimmed, 0, { ecmaVersion: 2022 }) as unknown as AstNode;
  } catch (err) {
    return { ok: false, error: `JSX 语法解析失败：${err instanceof Error ? err.message : String(err)}` };
  }
  if (ast.type !== 'JSXElement') {
    return { ok: false, error: `根节点必须是 JSX 元素（例如 <Layout>...</Layout>），实际：${ast.type}` };
  }
  try {
    return { ok: true, element: walkJsxElement(ast) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};

const walkJsxElement = (node: AstNode, key?: number): ReactElement => {
  const opening = node.openingElement as AstNode;
  const nameNode = opening.name as AstNode;
  if (nameNode.type !== 'JSXIdentifier') {
    throw new Error(`不支持的组件名形式：${nameNode.type}（仅支持简单标识符，例如 Layout / Node）`);
  }
  const componentName = nameNode.name as string;
  const Component = COMPONENT_REGISTRY[componentName];
  if (!Component) {
    throw new Error(`不支持的组件：${componentName}（白名单：${componentNames}）`);
  }
  const attrs = opening.attributes as Array<AstNode>;
  const props = walkAttributes(attrs);
  if (key !== undefined) props.key = key;
  const childNodes = node.children as Array<AstNode>;
  const children = childNodes
    .map((child, index) => walkChild(child, index))
    .filter((child): child is ReactNode => child !== null);
  return createElement(Component, props, ...children);
};

const walkAttributes = (attrs: Array<AstNode>): Record<string, unknown> => {
  const props: Record<string, unknown> = {};
  for (const attr of attrs) {
    if (attr.type === 'JSXSpreadAttribute') {
      throw new Error('不支持的属性形式：{...spread}（请逐个列出 props）');
    }
    if (attr.type !== 'JSXAttribute') {
      throw new Error(`不支持的属性形式：${attr.type}`);
    }
    const attrName = (attr.name as AstNode).name as string;
    if (attr.value === null || attr.value === undefined) {
      props[attrName] = true;
      continue;
    }
    const valueNode = attr.value as AstNode;
    if (valueNode.type === 'Literal') {
      props[attrName] = valueNode.value;
      continue;
    }
    if (valueNode.type === 'JSXExpressionContainer') {
      props[attrName] = evalLiteralExpression(valueNode.expression as AstNode, attrName);
      continue;
    }
    throw new Error(`不支持的属性值类型：${valueNode.type}（仅支持字面量与 {字面量表达式}）`);
  }
  return props;
};

const evalLiteralExpression = (node: AstNode, contextName: string): unknown => {
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'TemplateLiteral': {
      const expressions = node.expressions as Array<unknown>;
      if (expressions.length > 0) {
        throw new Error(`不支持的属性值：${contextName} 含模板插值（仅允许字面量字符串）`);
      }
      const quasis = node.quasis as Array<AstNode>;
      return quasis.map(q => (q.value as { cooked: string }).cooked).join('');
    }
    case 'UnaryExpression': {
      const operator = node.operator as string;
      const argument = node.argument as AstNode;
      if ((operator === '-' || operator === '+') && argument.type === 'Literal' && typeof argument.value === 'number') {
        return operator === '-' ? -argument.value : argument.value;
      }
      throw new Error(`不支持的表达式：${operator}${describeNode(argument)}（仅允许字面量与一元 -/+ 数字）`);
    }
    case 'ArrayExpression': {
      const elements = node.elements as Array<AstNode | null>;
      return elements.map((el, index) => {
        if (el === null) {
          throw new Error(`不支持的属性值：${contextName} 含空槽数组（位置 ${index}）`);
        }
        return evalLiteralExpression(el, `${contextName}[${index}]`);
      });
    }
    case 'ObjectExpression': {
      const obj: Record<string, unknown> = {};
      const properties = node.properties as Array<AstNode>;
      for (const prop of properties) {
        if (prop.type === 'SpreadElement') {
          throw new Error(`不支持的对象形式：${contextName} 含 {...spread}（请逐个列出字段）`);
        }
        if (prop.type !== 'Property') {
          throw new Error(`不支持的对象成员形式：${prop.type}`);
        }
        if (prop.computed === true) {
          throw new Error(`不支持的对象 key 形式：${contextName} 含 computed key（不允许 [expr]: ...）`);
        }
        if (prop.kind !== 'init') {
          throw new Error(`不支持的对象成员形式：${prop.kind}（仅允许字面量 init）`);
        }
        const keyNode = prop.key as AstNode;
        let propKey: string;
        if (keyNode.type === 'Identifier') {
          propKey = keyNode.name as string;
        } else if (
          keyNode.type === 'Literal' &&
          (typeof keyNode.value === 'string' || typeof keyNode.value === 'number')
        ) {
          propKey = String(keyNode.value);
        } else {
          throw new Error(`不支持的对象 key 形式：${keyNode.type}`);
        }
        obj[propKey] = evalLiteralExpression(prop.value as AstNode, `${contextName}.${propKey}`);
      }
      return obj;
    }
    case 'Identifier': {
      const name = node.name as string;
      if (name === 'undefined') return undefined;
      throw new Error(`不支持的表达式：标识符 ${name}（仅允许字面量，不允许变量引用）`);
    }
    default:
      throw new Error(`不支持的表达式类型：${node.type}（仅允许字面量 / 数组 / 对象 / 一元 -/+ 数字）`);
  }
};

const walkChild = (node: AstNode, index: number): ReactNode | null => {
  switch (node.type) {
    case 'JSXText': {
      const value = node.value as string;
      if (value.trim() === '') return null;
      return value;
    }
    case 'JSXElement':
      return walkJsxElement(node, index);
    case 'JSXExpressionContainer': {
      const inner = node.expression as AstNode;
      if (inner.type === 'JSXEmptyExpression') return null;
      return evalLiteralExpression(inner, 'children') as ReactNode;
    }
    case 'JSXFragment':
      throw new Error('不支持的 JSX Fragment <>...</>，请用具名根组件 <Layout>...</Layout>');
    default:
      throw new Error(`不支持的 child 类型：${node.type}`);
  }
};

const describeNode = (node: AstNode): string => {
  if (node.type === 'Literal') return JSON.stringify(node.value);
  if (node.type === 'Identifier') return node.name as string;
  return node.type;
};
