<template>
  <div id="app">
    <!-- Navigation Bar -->
    <nav class="navbar">
      <div class="nav-container">
        <router-link to="/" class="nav-link" :class="{ active: $route.path === '/' }">
          <i class="fas fa-comment"></i> Free Chat
        </router-link>
        <router-link to="/contact" class="nav-link" :class="{ active: $route.path === '/contact' }">
          <i class="fas fa-phone-alt"></i> Contact Form
        </router-link>
      </div>
    </nav>

    <!-- Router View -->
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f0f2f5;
}

#app {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Navigation bar styles */
.navbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0.75rem 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.nav-container {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1.5rem;
  border-radius: 25px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
}

.nav-link:hover {
  background-color: rgba(255,255,255,0.2);
  transform: translateY(-1px);
}

.nav-link.active {
  background-color: rgba(255,255,255,0.3);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.nav-link i {
  font-size: 1.1rem;
}

/* Make room for fixed navbar */
.router-view {
  margin-top: 60px;
  flex: 1;
  display: flex;
}

/* Ensure all page content is below the navbar */
.panel, .contact-form-container {
  margin-top: 60px !important;
  height: calc(100vh - 60px) !important;
}

/* Original chat panel styles (保留原聊天界面的样式) */
.panel {
  width: 100%;
  max-width: 1000px;
  margin: 60px auto 0 !important;
  height: calc(100vh - 60px) !important;
  padding: 0;
  display: flex;
  flex-direction: column;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #fff;
  border-left: 1px solid #ddd;
  border-right: 1px solid #ddd;
}

.panel h2 {
  text-align: center;
  padding: 1.2rem 1.5rem;
  margin: 0;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-size: 1.3rem;
  letter-spacing: 0.5px;
}

.panel main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
  background: #f7f8fa;
}

.chat-message {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.chat-message.incoming {
  justify-content: flex-start;
}

.chat-message.outcoming {
  justify-content: flex-end;
}

.bubble {
  padding: 0.75rem 1.1rem;
  border-radius: 16px;
  max-width: 65%;
  word-break: break-word;
  font-size: 0.95rem;
  line-height: 1.5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.incoming .bubble {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-top-left-radius: 4px;
}

.outcoming .bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-top-right-radius: 4px;
}

.typing-dots {
  padding: 0.5rem 0;
}

.typing-dots span {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin: 0 3px;
  border-radius: 50%;
  background: #999;
  animation: blink 1s infinite alternate;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  from { opacity: 0.2; }
  to { opacity: 1; }
}

.flex-form {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: #fff;
  border-top: 1px solid #e8e8e8;
}

.form-control {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 24px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: #f7f8fa;
}

.form-control:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
  background: #fff;
}

.send-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.2s;
  flex-shrink: 0;
}

.send-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.send-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.fas {
  font-size: 1.3rem;
  color: #888;
  margin-top: 0.2rem;
}

.incoming .fas {
  color: #667eea;
}

.outcoming .fas {
  color: #764ba2;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 2rem;
  background: #fee;
  border-top: 1px solid #fcc;
  color: #c33;
  font-size: 0.9rem;
}

.error-banner i.fa-exclamation-circle {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.error-banner span {
  flex: 1;
}

.close-error {
  background: none;
  border: none;
  color: #c33;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.close-error:hover {
  opacity: 0.7;
}
</style>