const { useState, useEffect, useRef } = React;

function TranslationChat() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    try {
      return localStorage.getItem("geminiApiKey") || "";
    } catch (_) {
      return "";
    }
  });
  const [uiLanguage, setUiLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem("uiLanguage");
      if (saved && LANG[saved]) return saved;
    } catch (_) {}
    return "en";
  });
  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);

  const handleMenuClick = () => {
    setIsMenuOpen(prev => !prev);
  };

  const handleMenuItem = (key) => {
    console.log(`Menu item clicked: ${key}`);
    setIsMenuOpen(false);
  };

  const handleSetGeminiKey = () => {
    const input = window.prompt(i18n.menu.setGeminiApiKeyPrompt, "");
    if (input === null) return; // cancelled
    const trimmed = input.trim();
    try {
      if (trimmed) {
        localStorage.setItem("geminiApiKey", trimmed);
        setGeminiApiKey(trimmed);
        alert(i18n.menu.savedGeminiApiKey);
      } else {
        localStorage.removeItem("geminiApiKey");
        setGeminiApiKey("");
        alert(i18n.menu.clearedGeminiApiKey);
      }
    } catch (e) {
      console.error("Failed to persist API key", e);
    } finally {
      setIsMenuOpen(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem("uiLanguage", uiLanguage);
    } catch (_) {}
  }, [uiLanguage]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!isMenuOpen) return;
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target)
      ) {
        setIsMenuOpen(false);
      }
    };
    const handleKeydown = (e) => {
      if (!isMenuOpen) return;
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [isMenuOpen]);

  const mockTranslate = (text, language) => {
    return `${text} (translated to ${language})`;
  };

  const i18n = LANG[uiLanguage];
  const languages = Object.entries(LANG).map(([code, data]) => ({
    code,
    name: data.languageName || code,
  }));

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputText,
      type: "user"
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");

    // Simulate translation delay
    setTimeout(() => {
      const translatedText = mockTranslate(inputText, targetLanguage);
      const botMessage = {
        id: Date.now() + 1,
        text: translatedText,
        type: "bot"
      };
      setMessages(prev => [...prev, botMessage]);
    }, 500);
  };

  return (
    <div className="chat-container">
      <div className="card chat-card shadow">
        <div className="card-header bg-primary text-white text-center chat-header">
          <h4 className="mb-0">{i18n.title}</h4>
          <button
            type="button"
            className="chat-menu-btn"
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
            aria-label={i18n.openMenuAria}
            onClick={handleMenuClick}
            title={i18n.menuTitle}
            ref={menuButtonRef}>
            <i className="bi bi-list" aria-hidden="true"></i>
          </button>
          {isMenuOpen && (
            <div
              className="chat-menu"
              role="menu"
              aria-label={i18n.menuAria}
              ref={menuRef}>

              <div
                className="px-2 pt-2 pb-1 text-muted small"
                aria-hidden="true">
                {i18n.menu.uiLanguage}
              </div>

              {languages.map(({ code, name }) => (
                <button
                  key={code}
                  className="chat-menu-item"
                  role="menuitemradio"
                  aria-checked={uiLanguage === code}
                  onClick={() => {
                    setUiLanguage(code);
                    setIsMenuOpen(false);
                  }}>
                  <i
                    className="bi bi-check2 me-2"
                    style={{
                      visibility: uiLanguage === code
                        ? "visible"
                        : "hidden"
                    }}
                    aria-hidden="true"></i>
                  {name}
                </button>
              ))}

              <button
                className="chat-menu-item"
                role="menuitem"
                onClick={handleSetGeminiKey}>
                  {geminiApiKey
                    ? i18n.menu.updateGeminiApiKey
                    : i18n.menu.setGeminiApiKey}
              </button>
            </div>
          )}
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h5>{i18n.welcomeTitle}</h5>
              <p>{i18n.welcomeMessage}</p>
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
              placeholder={i18n.inputPlaceholder}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              maxLength={500}/>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-2 controls-row">
            <div className="language-select-col">
              <select
                className="form-select"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}>
                {languages.map(({ code, name }) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>

            <div className="send-col ms-2">
              <button
                className="btn btn-primary"
                onClick={handleSendMessage}
                disabled={!inputText.trim()}>
                {i18n.send}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Global i18n map. Extend with more languages as needed.
const LANG = {
  "en": {
    languageName: "English",
    title: "Translation Chat",
    welcomeTitle: "Welcome to Translation Chat",
    welcomeMessage:
      "Type a message below to get started. " +
      "Select your target language and start translating!",
    inputPlaceholder: "Type to translate...",
    send: "Send",
    menuAria: "Chat menu",
    openMenuAria: "Open menu",
    menuTitle: "Menu",
    menu: {
      uiLanguage: "UI Language",
      setGeminiApiKey: "Set Gemini API Key",
      updateGeminiApiKey: "Update Gemini API Key",
      setGeminiApiKeyPrompt:
        "Enter your Gemini API key. " +
        "It will be stored locally in this browser.",
      savedGeminiApiKey: "Gemini API key saved.",
      clearedGeminiApiKey: "Gemini API key cleared.",
    },
  },
  "zh-Hant": {
    languageName: "繁體中文",
    title: "翻譯聊天",
    welcomeTitle: "歡迎使用翻譯聊天",
    welcomeMessage: "在下方輸入訊息即可開始。選擇目標語言並開始翻譯！",
    inputPlaceholder: "輸入文字以翻譯…",
    send: "送出",
    menuAria: "聊天選單",
    openMenuAria: "開啟選單",
    menuTitle: "選單",
    menu: {
      uiLanguage: "介面語言",
      setGeminiApiKey: "設定 Gemini API 金鑰",
      updateGeminiApiKey: "更新 Gemini API 金鑰",
      setGeminiApiKeyPrompt:
        "輸入你的 Gemini API 金鑰。將儲存在此瀏覽器中。",
      savedGeminiApiKey: "已儲存 Gemini API 金鑰。",
      clearedGeminiApiKey: "已清除 Gemini API 金鑰。",
    },
  },
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<TranslationChat />);
