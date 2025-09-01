const { useState, useEffect, useRef } = React;

function TranslationChat() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const mockTranslate = (text, language) => {
    return `${text} (translated to ${language})`;
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputText,
      type: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate translation delay
    setTimeout(() => {
      const translatedText = mockTranslate(inputText, targetLanguage);
      const botMessage = {
        id: Date.now() + 1,
        text: translatedText,
        type: 'bot'
      };
      setMessages(prev => [...prev, botMessage]);
    }, 500);
  };

  return (
    <div className="chat-container">
      <div className="card chat-card shadow">
        <div className="card-header bg-primary text-white text-center chat-header">
          <h4 className="mb-0">Translation Chat</h4>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h5>Welcome to Translation Chat</h5>
              <p>
                Type a message below to get started.
                Select your target language and start translating!
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-bubble">
                  {message.text}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="card-footer chat-input">
          <div className="input-col">
            <textarea
              className="form-control"
              placeholder="Type to translate..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="d-flex justify-content-between align-items-center mt-2 controls-row">
            <div className="language-select-col">
              <select
                className="form-select"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}>
                <option value="English">EN</option>
                <option value="Traditional Chinese">中文</option>
              </select>
            </div>

            <div className="send-col ms-2">
              <button
                className="btn btn-primary"
                onClick={handleSendMessage}
                disabled={!inputText.trim()}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<TranslationChat />);
