// DeepSeek API 服务模块 — calls backend proxy, NOT DeepSeek directly
//const API_CHAT_URL = '/api/chat.php';
const API_CHAT_URL = '/api/chat';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;           // 1 s base
const REQUEST_TIMEOUT_MS = 60_000;  // 60 s per attempt
const MAX_CONTEXT_MESSAGES = 40;    // keep last N messages sent to proxy

/**
 * 延迟函数
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 判断 HTTP 状态码是否可重试
 * 401/403 → 不重试（认证/授权问题）
 * 429     → 可重试，尊重 Retry-After
 * 5xx     → 可重试
 */
function isRetryable(status) {
  if (status === 429) return true;
  return status >= 500;
}

/**
 * 裁剪消息列表，保留 system 消息 + 最近 N 条非 system 消息
 */
function trimMessages(messages, limit = MAX_CONTEXT_MESSAGES) {
  if (messages.length <= limit) return messages;
  const systemMsgs = messages.filter(m => m.role === 'system');
  const nonSystem  = messages.filter(m => m.role !== 'system');
  return [...systemMsgs, ...nonSystem.slice(-limit)];
}

/**
 * 发送消息到后端代理 /api/chat
 * @param {Array} messages - 对话历史消息数组
 * @param {Object} options - 可选配置
 * @returns {Promise<string>} - API 响应的消息内容
 */
export async function sendMessage(messages, options = {}) {
  const {
    model = 'deepseek-chat',
    temperature = 0.7,
    maxTokens = 2000,
    retries = MAX_RETRIES
  } = options;

  // 注入语言指令：用什么语言提问就用什么语言回答
  const LANG_SYSTEM_MSG = {
    role: 'system',
    content: 'Always respond in the same language as the user\'s message. If the user writes in Chinese, respond in Chinese. If the user writes in English, respond in English. Follow this rule strictly for every reply.'
  };
  const hasLangInstruction = messages.some(
    m => m.role === 'system' && m.content.includes('same language')
  );
  const messagesWithLang = hasLangInstruction
    ? messages
    : [LANG_SYSTEM_MSG, ...messages];

  const trimmed = trimMessages(messagesWithLang);
  let lastError;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(API_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: trimmed, model, temperature, maxTokens }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        const msg = errorData.error || `API 请求失败: ${status} ${response.statusText}`;

        // 不可重试的状态码 → 直接抛出
        if (!isRetryable(status)) {
          throw new Error(msg);
        }

        // 429 → 使用 Retry-After（如果有）
        if (status === 429) {
          const retryAfter = errorData.retryAfter
            ? parseInt(errorData.retryAfter, 10) * 1000
            : RETRY_DELAY * Math.pow(2, attempt);
          if (attempt < retries - 1) {
            console.warn(`429 速率限制，等待 ${retryAfter}ms 后重试...`);
            await delay(retryAfter);
            continue;
          }
        }

        // 5xx → 指数退避
        throw new Error(msg);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('API 响应格式错误');
      }

      return data.choices[0].message.content;

    } catch (error) {
      clearTimeout(timer);

      if (error.name === 'AbortError') {
        lastError = new Error('请求超时，请稍后重试');
      } else {
        lastError = error;
      }

      console.error(`尝试 ${attempt + 1}/${retries} 失败:`, lastError.message);

      // 如果不是最后一次尝试，等待后重试
      if (attempt < retries - 1) {
        const waitTime = RETRY_DELAY * Math.pow(2, attempt);
        console.log(`等待 ${waitTime}ms 后重试...`);
        await delay(waitTime);
      }
    }
  }

  throw new Error(`API 调用失败（已重试 ${retries} 次）: ${lastError.message}`);
}

/**
 * 创建聊天会话
 */
export class ChatSession {
  constructor() {
    this.messages = [];
  }

  /**
   * 从已有历史恢复会话上下文
   * @param {Array} uiMessages - UI 消息数组 [{role,message},...]
   */
  restoreFromHistory(uiMessages) {
    this.messages = [];
    for (const m of uiMessages) {
      this.messages.push({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.message
      });
    }
  }

  /**
   * 添加用户消息
   */
  addUserMessage(content) {
    this.messages.push({
      role: 'user',
      content
    });
  }

  /**
   * 添加助手消息
   */
  addAssistantMessage(content) {
    this.messages.push({
      role: 'assistant',
      content
    });
  }

  /**
   * 添加系统消息
   */
  addSystemMessage(content) {
    this.messages.push({
      role: 'system',
      content
    });
  }

  /**
   * 发送消息并获取回复
   */
  async sendMessage(userMessage, options = {}) {
    this.addUserMessage(userMessage);

    try {
      const response = await sendMessage(this.messages, options);
      this.addAssistantMessage(response);
      return response;
    } catch (error) {
      // 如果失败，移除刚添加的用户消息
      this.messages.pop();
      throw error;
    }
  }

  /**
   * 获取对话历史
   */
  getHistory() {
    return [...this.messages];
  }

  /**
   * 清空对话历史
   */
  clearHistory() {
    this.messages = [];
  }

  /**
   * 获取最后一条消息
   */
  getLastMessage() {
    return this.messages[this.messages.length - 1];
  }
}

export default {
  sendMessage,
  ChatSession
};
