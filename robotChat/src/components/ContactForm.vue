<template>
  <div class="contact-form-container">
    <!-- Header -->
    <div class="form-header">
      <h2>📋 Intelligent Contact Form</h2>
      <p>Please follow the prompts to provide your information. Our customer service will contact you soon.</p>
      <div class="progress-bar" v-if="!isFinished">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        <span class="progress-text">{{ progress.current }}/{{ progress.total }}</span>
      </div>
    </div>

    <!-- Chat Window -->
    <div class="chat-window" ref="chatWindow">
      <div v-for="(msg, index) in messages" :key="index" 
           class="message" 
           :class="msg.role === 'user' ? 'user-message' : 'bot-message'">
        <div class="avatar">
          <i :class="msg.role === 'user' ? 'fas fa-user' : 'fas fa-robot'"></i>
        </div>
        <div class="bubble" v-html="renderMd(msg.content)"></div>
      </div>
      
      <div v-if="isTyping" class="message bot-message">
        <div class="avatar"><i class="fas fa-robot"></i></div>
        <div class="bubble typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="input-area" v-if="!isFinished">
      <input
        type="text"
        v-model="currentMessage"
        @keyup.enter="sendMessage"
        :placeholder="inputPlaceholder"
        :disabled="isWaiting || isTyping"
        class="form-input"
        autofocus
      />
      <button @click="sendMessage" 
              :disabled="!currentMessage || isWaiting || isTyping"
              class="send-btn">
        <i class="fas fa-paper-plane"></i>
      </button>
    </div>

    <!-- Completion Area -->
    <div v-if="isFinished" class="completed-area">
      <div class="success-icon">
        <i class="fas fa-check-circle"></i>
      </div>
      <h3>Submission Successful!</h3>
      <p>Thank you for your cooperation. Our customer service will contact you soon.</p>
      <button @click="restartConversation" class="restart-btn">
        <i class="fas fa-redo"></i> Start Over
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

// Configure Markdown
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
});

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const i = tokens[idx].attrIndex('target');
  if (i < 0) tokens[idx].attrPush(['target', '_blank']);
  else tokens[idx].attrs[i][1] = '_blank';
  return self.renderToken(tokens, idx, options);
};

const renderMd = (text) => DOMPurify.sanitize(md.render(text || ''));

// State management
const messages = ref([]);
const currentMessage = ref('');
const isWaiting = ref(false);
const isTyping = ref(false);
const isFinished = ref(false);
const error = ref('');
const sessionId = ref(null);
const chatWindow = ref(null);
const progress = ref({ current: 0, total: 3 });

const progressPercent = computed(() => {
  return (progress.value.current / progress.value.total) * 100;
});

const inputPlaceholder = computed(() => {
  if (isFinished.value) return 'Conversation ended';
  if (isWaiting.value || isTyping.value) return 'Waiting for bot response...';
  return 'Type your answer here...';
});

// Scroll to bottom
const scrollToBottom = () => {
  nextTick(() => {
    if (chatWindow.value) {
      chatWindow.value.scrollTop = chatWindow.value.scrollHeight;
    }
  });
};

watch([messages, isTyping], scrollToBottom, { deep: true });

// Start conversation - USING NODE.JS BACKEND (no .php extension)
const startConversation = async () => {
  isWaiting.value = true;
  error.value = '';
  
  try {
    // ✅ USING NODE.JS ENDPOINT - no .php extension
    const response = await fetch('/api/contact-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' })
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const data = await response.json();
    
    messages.value = [{
      role: 'bot',
      content: data.reply
    }];
    
    sessionId.value = data.sessionId;
    isFinished.value = false;
    
    if (data.progress) {
      progress.value = data.progress;
    }
    
  } catch (err) {
    error.value = 'Failed to connect to server. Please make sure the backend is running (npm run dev:server)';
    console.error('Connection error:', err);
  } finally {
    isWaiting.value = false;
  }
};

// Send message - USING NODE.JS BACKEND (no .php extension)
const sendMessage = async () => {
  if (!currentMessage.value.trim() || isWaiting.value || isTyping.value || isFinished.value) return;
  
  const userMsg = currentMessage.value;
  messages.value.push({ role: 'user', content: userMsg });
  currentMessage.value = '';
  isTyping.value = true;
  
  try {
    // ✅ USING NODE.JS ENDPOINT - no .php extension
    const response = await fetch('/api/contact-bot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId.value
      },
      body: JSON.stringify({ message: userMsg })
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const data = await response.json();
    
    setTimeout(() => {
      messages.value.push({ role: 'bot', content: data.reply });
      isTyping.value = false;
      
      if (data.progress) {
        progress.value = data.progress;
      }
      
      if (data.finished) {
        isFinished.value = true;
        sessionId.value = null;
      }
      
      if (data.sessionId) {
        sessionId.value = data.sessionId;
      }
      
      if (data.error) {
        error.value = data.reply;
      }
    }, 800);
    
  } catch (err) {
    isTyping.value = false;
    error.value = 'Failed to send message. Please check if backend is running.';
    console.error('Send error:', err);
  }
};

// Restart conversation
const restartConversation = () => {
  messages.value = [];
  isFinished.value = false;
  error.value = '';
  progress.value = { current: 0, total: 3 };
  startConversation();
};

// Mount component
onMounted(() => {
  startConversation();
});
</script>

<style scoped>
.contact-form-container {
  max-width: 800px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1px solid #ddd;
  border-right: 1px solid #ddd;
}

.form-header {
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  position: relative;
}

.form-header h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.form-header p {
  margin: 0 0 1rem 0;
  opacity: 0.9;
  font-size: 0.95rem;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  position: relative;
  margin-top: 10px;
}

.progress-fill {
  height: 100%;
  background: #fff;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  right: 0;
  top: -20px;
  font-size: 0.85rem;
  opacity: 0.9;
}

.chat-window {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background: #f7f8fa;
}

.message {
  display: flex;
  margin-bottom: 1rem;
  animation: fadeIn 0.3s ease;
}

.bot-message {
  justify-content: flex-start;
}

.user-message {
  justify-content: flex-end;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0.5rem;
}

.bot-message .avatar {
  background: #667eea;
  color: white;
}

.user-message .avatar {
  background: #764ba2;
  color: white;
}

.bubble {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 18px;
  font-size: 0.95rem;
  line-height: 1.5;
  word-break: break-word;
}

.bot-message .bubble {
  background: white;
  border: 1px solid #e8e8e8;
  border-top-left-radius: 4px;
}

.user-message .bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-top-right-radius: 4px;
}

.typing-indicator {
  padding: 0.75rem 1rem !important;
}

.typing-indicator span {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin: 0 2px;
  border-radius: 50%;
  background: #999;
  animation: blink 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 60%, 100% { opacity: 0.2; }
  30% { opacity: 1; }
}

.input-area {
  display: flex;
  padding: 1rem;
  background: white;
  border-top: 1px solid #e8e8e8;
  gap: 0.5rem;
}

.form-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 24px;
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.send-btn {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.completed-area {
  padding: 2rem;
  text-align: center;
  background: white;
  border-top: 1px solid #e8e8e8;
}

.success-icon {
  font-size: 4rem;
  color: #4caf50;
  margin-bottom: 1rem;
}

.completed-area h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.completed-area p {
  margin: 0 0 1.5rem 0;
  color: #666;
}

.restart-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 24px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.restart-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.error-message {
  padding: 0.75rem;
  margin: 1rem;
  background: #fee;
  border: 1px solid #fcc;
  color: #c33;
  border-radius: 8px;
  text-align: center;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>