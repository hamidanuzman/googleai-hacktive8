document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');
  const submitButton = chatForm.querySelector('button[type="submit"]');

  // Stores multi-turn conversation history according to the backend schema:
  // [ { role: 'user', text: '...' }, { role: 'model', text: '...' } ]
  const conversation = [];

  /**
   * Helper function to append message elements to the chat box.
   * Uses textContent to safely render text and avoid XSS attacks.
   */
  function appendMessage(sender, text, isThinking = false) {
    const messageEl = document.createElement('div');
    messageEl.classList.add('chat-message', sender);
    messageEl.textContent = text;

    if (isThinking) {
      messageEl.classList.add('thinking');
    }

    chatBox.appendChild(messageEl);
    chatBox.scrollTop = chatBox.scrollHeight;
    return messageEl;
  }

  // Handle form submission
  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const messageText = userInput.value.trim();
    if (!messageText) return;

    // 1. Add user message to UI and history
    appendMessage('user', messageText);
    conversation.push({ role: 'user', text: messageText });

    // Clear input & disable form controls while waiting for response
    userInput.value = '';
    userInput.disabled = true;
    if (submitButton) submitButton.disabled = true;

    // 2. Display temporary "Thinking..." bot message
    const botMessageEl = appendMessage('model', 'Thinking...', true);

    try {
      // 3. Send POST request to /api/chat with the full conversation history
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();

      // 4. Update the bot message with AI response
      if (data && data.result) {
        botMessageEl.textContent = data.result;
        botMessageEl.classList.remove('thinking');

        // Append Gemini's response to history for subsequent turns
        conversation.push({ role: 'model', text: data.result });
      } else {
        botMessageEl.textContent = 'Sorry, no response received.';
        botMessageEl.classList.remove('thinking');
        // Remove the unanswered user message so subsequent calls don't send orphaned context
        conversation.pop();
      }
    } catch (error) {
      console.error('Chat API Error:', error);
      botMessageEl.textContent = 'Failed to get response from server.';
      botMessageEl.classList.remove('thinking');
      // Remove unanswered user message on failure
      conversation.pop();
    } finally {
      // Re-enable form controls and refocus input
      userInput.disabled = false;
      if (submitButton) submitButton.disabled = false;
      userInput.focus();
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  });
});