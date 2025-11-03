// Get chatbot elements
const chatbotToggleBtn = document.getElementById('chatbotToggleBtn');
const chatbotPanel = document.getElementById('chatbotPanel');

if (chatbotToggleBtn && chatbotPanel) {
  // Toggle chat open/closed when clicking the button
  chatbotToggleBtn.addEventListener('click', () => {
    chatbotPanel.classList.toggle('open');
  });

  // Close chat when clicking anywhere except the chat panel or button
  document.addEventListener('click', (e) => {
    // If chat is open AND user clicked outside chat area, close it
    if (chatbotPanel.classList.contains('open') && 
        !chatbotPanel.contains(e.target) && 
        !chatbotToggleBtn.contains(e.target)) {
      chatbotPanel.classList.remove('open');
    }
  });
}

// Get chat UI elements
const chatbotMessages = document.getElementById('chatbotMessages');
const chatbotInput = document.getElementById('chatbotInput');
const chatbotSendBtn = document.getElementById('chatbotSendBtn');

// Conversation history array so the assistant can remember past messages.
// Each item is an object with { role: 'user'|'assistant'|'system', content: '...' }
const messages = [
  {
    role: 'system',
    content: `You are WayChat, Waymark’s friendly creative assistant.

Waymark is a video ad creation platform that helps people turn ideas, products, or messages into high-quality, ready-to-run videos. The platform is used by small businesses, agencies, and marketers to create broadcast-   ads with minimal friction.

Your job is to help users shape raw input — whether it’s a business name, a tagline, a product, a vibe, or a rough idea — into a short-form video concept.

Your responses may include suggested video structures, voiceover lines, tone and visual direction, music suggestions, and clarifying follow-up questions.

If the user's input is unclear, ask 1–2 short questions to help sharpen the direction before offering creative suggestions.

Only respond to questions related to Waymark, its tools, its platform, or the creative process of making short-form video ads. If a question is unrelated, politely explain that you're focused on helping users create video ads with Waymark.

Keep your replies concise, collaborative, and focused on helping users express their message clearly. Always align with modern marketing best practices — and stay supportive and friendly.`
  }
];

// Helper to add a message to the chat window
// role: 'user' or 'assistant'
function appendMessage(role, text) {
  const msg = document.createElement('div');
  msg.className = `chat-message ${role}`; // simple classes for styling

  // If this is an assistant message, format into readable sections:
  // - Split on double newlines to create sections (script, tone, CTA, etc.)
  // - Preserve single newlines as line breaks within a section
  if (role === 'assistant') {
    const formatted = formatAssistantContent(text);
    // Insert the formatted HTML into the message container
    msg.innerHTML = `<div class="message-content assistant-content">${formatted}</div>`;
  } else {
    // For user messages keep a simple single-block message
    msg.innerHTML = `<div class="message-content">${text}</div>`;
  }

  chatbotMessages.appendChild(msg);
  // Scroll to the newest message
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Format assistant text into HTML with sections and spacing
function formatAssistantContent(content) {
  // Split by double newline to separate logical sections
  const sections = content.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);

  // For each section, preserve single newlines as <br> and wrap in a section div
  const htmlSections = sections.map(section => {
    const withLineBreaks = section.replace(/\n/g, '<br>');
    return `<div class="assistant-section">${withLineBreaks}</div>`;
  });

  // Join sections together; they will be styled by CSS for spacing
  return htmlSections.join('');
}

// Async function to call OpenAI Chat Completions API
async function fetchAssistantReply() {
  try {
    // Build the request body using the Chat Completions format and include
    // the full conversation history in `messages` so the assistant remembers.
    const body = {
      model: 'gpt-4o',
      messages: messages,
      // Make assistant more creative and limit reply length
      temperature: 0.8,
      max_completion_tokens: 300
    };

    // Use fetch with async/await and the OPENAI_API_KEY from secrets.js
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    // Access the assistant's reply from the response
    const assistantText = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : 'Sorry, no response from the assistant.';

    // Save the assistant reply into the conversation history so next calls see it
    messages.push({ role: 'assistant', content: assistantText });

    return assistantText;
  } catch (err) {
    console.error(err);
    return `Error: ${err.message}`;
  }
}

// Send the user's message, get assistant reply, and display both
async function sendMessage() {
  const userText = chatbotInput.value.trim();
  if (!userText) return;

  // Show user's message
  appendMessage('user', userText);
  chatbotInput.value = '';

  // Save the user's message to conversation history before calling the API
  messages.push({ role: 'user', content: userText });

  // Add a temporary "Thinking..." animated dots message; we'll replace it later
  const thinkingEl = document.createElement('div');
  thinkingEl.className = 'chat-message assistant thinking';
  // animated dots -- CSS will animate the spans
  thinkingEl.innerHTML = `<div class="message-content"><span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span></div>`;
  chatbotMessages.appendChild(thinkingEl);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;

  // Fetch assistant reply using the full messages array
  const reply = await fetchAssistantReply();

  // Replace the thinking element with the assistant reply
  thinkingEl.remove();
  appendMessage('assistant', reply);
}

// Wire up UI events: click send button and press Enter to send
if (chatbotSendBtn && chatbotInput) {
  chatbotSendBtn.addEventListener('click', sendMessage);
  chatbotInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });
}
