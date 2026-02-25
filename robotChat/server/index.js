import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// 导入联系表单处理器
import contactBotHandler from './contact-bot.js';

// Загружаем .env вручную (чтобы не добавлять зависимость dotenv; оставляем просто)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

function loadEnv(filePath) {
  try {
    const text = readFileSync(filePath, 'utf-8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* .env may not exist in production */ }
}

loadEnv(envPath);

// Конфигурация
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const PORT = process.env.PORT || 3001;
const REQUEST_TIMEOUT_MS = 60_000; // 60 секунд
const MAX_CONTEXT_MESSAGES = 40;   // хранить последние N сообщений, отправляемых модели

if (!DEEPSEEK_API_KEY) {
  console.error('❌  DEEPSEEK_API_KEY is not set. Create a .env file in the project root.');
  process.exit(1);
}

// Express приложение
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// POST /api/chat - 原有的聊天API
app.post('/api/chat', async (req, res) => {
  try {
    let { messages, model, temperature, maxTokens } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // ---- обрезаем контекст до MAX_CONTEXT_MESSAGES (сохраняем системные промпты, если есть) --
    if (messages.length > MAX_CONTEXT_MESSAGES) {
      const systemMsgs = messages.filter(m => m.role === 'system');
      const nonSystem  = messages.filter(m => m.role !== 'system');
      messages = [
        ...systemMsgs,
        ...nonSystem.slice(-MAX_CONTEXT_MESSAGES)
      ];
    }

    // ---- вызываем DeepSeek с таймаутом через AbortController ------------------
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const apiRes = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 2000
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    // ---- передаём статус и тело ответа ------------------------------------------
    const body = await apiRes.json().catch(() => ({}));

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({
        error: body.error?.message || `DeepSeek API error: ${apiRes.status}`,
        status: apiRes.status,
        retryAfter: apiRes.headers.get('retry-after') || null
      });
    }

    return res.json(body);

  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'DeepSeek API request timed out' });
    }
    console.error('Proxy error:', err);
    return res.status(502).json({ error: 'Failed to reach DeepSeek API' });
  }
});

// POST /api/contact-bot - 智能联系表单API (添加的代码)
app.post('/api/contact-bot', async (req, res) => {
  try {
    await contactBotHandler(req, res);
  } catch (err) {
    console.error('Contact bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Проверка здоровья
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Запуск сервера
app.listen(PORT, () => {
  console.log(`✅  Backend proxy running on http://localhost:${PORT}`);
});