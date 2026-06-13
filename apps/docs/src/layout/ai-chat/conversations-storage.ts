import { createStore, del, entries, set as idbSet } from 'idb-keyval';

import type { CurrentPage } from '@/layout/ai-chat/context';
import type { ChatMessage } from '@/layout/ai-chat/providers/types';

/**
 * AI 聊天会话的持久化模型
 * @description 一条 Conversation 对应一个聊天 thread；存进 IDB key=id。
 *   schemaVersion 用于以后改 shape 时做向后兼容迁移；未识别 / 解析失败的记录在 loadAll 阶段跳过
 */
export type Conversation = {
  schemaVersion: 1;
  id: string;
  /** 标题——默认取首条 user 消息前 40 字；后续可让用户改名 */
  title: string;
  messages: Array<ChatMessage>;
  usage: { input: number; output: number; cacheRead: number };
  /** 创建会话时记录的当前页（便于以后按页面过滤）；可空 */
  pageContext: CurrentPage | null;
  createdAt: number;
  updatedAt: number;
};

/** 当前持久化 schema 版本；新建 / 保存时强制写入 */
export const CONVERSATION_SCHEMA_VERSION = 1 as const;

/**
 * 独立 IDB DB + store —— 不和未来其他用途的 IDB 数据混在同一个 store
 * @description DB 名 `retikz-ai-chat`，object store 名 `conversations`。key = conversation.id
 */
const idbStore = createStore('retikz-ai-chat', 'conversations');

const isConversation = (raw: unknown): raw is Conversation => {
  if (!raw || typeof raw !== 'object') return false;
  const c = raw as Partial<Conversation>;
  return (
    typeof c.id === 'string' &&
    typeof c.title === 'string' &&
    Array.isArray(c.messages) &&
    typeof c.createdAt === 'number' &&
    typeof c.updatedAt === 'number'
  );
};

/** 一次性把所有会话读进内存；schema 不匹配的记录跳过（不抛错，让 panel 仍可启动） */
export const loadAllConversations = async (): Promise<Record<string, Conversation>> => {
  const result: Record<string, Conversation> = {};
  try {
    const all = await entries<string, unknown>(idbStore);
    for (const [key, value] of all) {
      if (isConversation(value) && value.id === key) result[key] = value;
    }
  } catch (e) {
    // IDB 在隐私模式 / 老浏览器可能 reject；面板降级到无历史模式
    console.warn('[ai-chat] failed to load conversations from IDB:', e);
  }
  return result;
};

/** upsert 一条会话；调用方负责把 updatedAt 设最新 */
export const saveConversation = async (conversation: Conversation): Promise<void> => {
  try {
    await idbSet(conversation.id, conversation, idbStore);
  } catch (e) {
    console.warn('[ai-chat] failed to save conversation to IDB:', e);
  }
};

export const deleteConversationFromStorage = async (id: string): Promise<void> => {
  try {
    await del(id, idbStore);
  } catch (e) {
    console.warn('[ai-chat] failed to delete conversation from IDB:', e);
  }
};

/** 从首条 user 消息切前 40 字做标题；空内容返回 fallback */
export const deriveTitleFromMessages = (messages: ReadonlyArray<ChatMessage>, fallback: string): string => {
  const firstUser = messages.find(m => m.role === 'user' && !m.autoSent);
  if (!firstUser) return fallback;
  const trimmed = firstUser.content.trim();
  if (!trimmed) return fallback;
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
};
