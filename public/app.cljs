(ns xlaton
  (:require [ajax.core :refer [POST]]
            [reagent.core :as r]
            [reagent.dom :as rdom]))

(defn load!
  ([name]
   (load! name nil))
  ([name default]
   (let [stored (try (js/localStorage.getItem name)
                  (catch js/Error _ nil))]
     (if stored stored default))))

(defn store! [name value]
  (assert (string? name))
  (js/localStorage.setItem name value))

(defonce messages (r/atom []))
(defonce ui-language (r/atom (keyword (load! "ui-language" "en"))))
(defonce target-language (r/atom (keyword (load! "target-language" "en"))))
(defonce input-text (r/atom ""))
(defonce menu-open? (r/atom false))
(defonce gemini-api-key (r/atom (load! "gemini-api-key")))

(declare LANG)
(declare set-gemini-key!)
(declare post-message!)
(declare scroll-to-bottom!)
(declare gemini-request)

(defn chat-header []
  (let [lang (LANG @ui-language)]
    [:div.card-header.bg-primary.text-white.text-center.chat-header
     [:h4.mb-0 "Xlaton"]
     [:button.main-menu-btn
      {:type "button"
       :aria-haspopup true
       :aria-expanded @menu-open?
       :aria-label (get-in lang [:menu :open-aria])
       :title (get-in lang [:menu :title])
       :on-click #(swap! menu-open? not)}
      [:i.bi.bi-list {:aria-hidden true}]]]))

(defn chat-messages []
  (let [lang (LANG @ui-language)
        msgs @messages]
    [:div#chat-messages.chat-messages
     (if (empty? msgs)
       [:div.empty-state
        [:h5 (:welcome-title lang)]
        [:p (:welcome-message lang)]]
       (for [{:keys [id text type]} msgs]
         ^{:key id}
         [:div.message {:class (name type)}
          [:div.message-bubble text]]))]))

(defn menu []
  (let [lang (LANG @ui-language)]
    [:div.main-menu-overlay {:on-click #(reset! menu-open? false)}
     [:div.main-menu-content {:on-click #(.stopPropagation %)}
      [:div.main-menu {:role "menu" :aria-label (get-in lang [:menu :aria])}
       [:div.px-2.pt-2.pb-1.text-muted.small {:aria-hidden true}
        (get-in lang [:menu :ui-lang])]
       (for [[code lang] LANG]
         ^{:key code}
         [:button.main-menu-item
          {:role "menuitemradio"
           :aria-checked (= @ui-language code)
           :on-click #(do (reset! ui-language code)
                          (store! "ui-language" (name code))
                          (reset! menu-open? false))}
          [:i.bi.bi-check2.me-2
           {:style {:visibility (if (= @ui-language code)
                                  "visible"
                                  "hidden")}}]
          (:lang-name lang)])
       [:button.main-menu-item
        {:role "menuitem"
         :on-click #(do (set-gemini-key! lang)
                        (reset! menu-open? false))}
        (if (seq @gemini-api-key)
          (get-in lang [:menu :update-gemini-key])
          (get-in lang [:menu :set-gemini-key]))]]]]))

(defn chat-input []
  (let [lang (LANG @ui-language)]
    [:div.card-footer.chat-input
     [:div.input-col
      [:textarea.form-control
       {:placeholder (:input-placeholder lang)
        :value @input-text
        :on-change #(reset! input-text (.. % -target -value))
        :on-key-down (fn [e]
                       (when (and (= "Enter" (.-key e))
                                  (not (.-shiftKey e))
                                  (seq (clojure.string/trim @input-text)))
                         (.preventDefault e)
                         (post-message! @input-text)))
        :maxLength 500}]]
     [:div.d-flex.justify-content-between.align-items-center.mt-2.controls-row
      [:div.language-select-col
       [:select.form-select
        {:value @target-language
         :on-change #(let [code (-> % .-target .-value)]
                       (store! "target-language" code)
                       (reset! target-language (keyword code)))}
        (for [[code lang] LANG]
          ^{:key code} [:option {:value (name code)} (:lang-name lang)])]]
      [:div.send-col.ms-2
       [:button.btn.btn-primary
        {:on-click #(post-message! @input-text)
         :disabled (clojure.string/blank? @input-text)}
        (:send lang)]]]]))

(defn app []
  [:div.chat-container
   [:div.card.chat-card.shadow
    [chat-header]
    [chat-messages]
    [chat-input]]
   (when @menu-open? [menu])])

(defn set-gemini-key! [lang]
  (let [input (js/window.prompt (get-in lang [:menu :enter-gemini-key]) "")]
    (when (some? input)
      (let [trimmed (clojure.string/trim input)]
        (if (seq trimmed)
          (do (store! "gemini-api-key" trimmed)
              (reset! gemini-api-key trimmed)
              (js/alert (get-in lang [:menu :gemini-key-saved])))
          (do (js/localStorage.removeItem "gemini-api-key")
              (reset! gemini-api-key nil)
              (js/alert (get-in lang [:menu :gemini-key-cleared]))))))))

(defn post-message! [text]
  (assert (keyword? @target-language))
  (swap! messages conj {:id (.now js/Date)
                        :type :user
                        :text text})
  (js/setTimeout scroll-to-bottom! 50)
  (reset! input-text "")
  (gemini-request
   {:model "gemini-2.5-flash-lite"
    :key @gemini-api-key}
   [{:role :user
     :text (str "Translate the following text to "
                (get-in LANG [@target-language :lang-name]) ". "
                "Only provide the translated text, "
                "without any additional commentary. "
                "\n\nHere is the text to translate:\n\n"
                text)}]
   (fn [response]
     (swap! messages conj {:id (inc (.now js/Date))
                           :type :bot
                           :text (:text response)})
     (js/setTimeout scroll-to-bottom! 50))))

(defn scroll-to-bottom! []
  (let [el (js/document.getElementById "chat-messages")]
    (when el
      (set! (.-scrollTop el) (.-scrollHeight el)))))

(defn gemini-request [opts messages handler]
  (assert (contains? opts :model))
  (assert (contains? opts :key))
  (assert (fn? handler))
  (POST (str "https://generativelanguage.googleapis.com/v1beta/models/"
             (:model opts)
             ":generateContent")
    (let [body {:contents (for [msg messages]
                            (do (assert (some? (:role msg)))
                                {:role (name (:role msg))
                                 :parts [{:text (:text msg)}]}))}]
      {:headers {"x-goog-api-key" (:key opts)
                 "Content-Type" "application/json"}
       :body (js/JSON.stringify (clj->js body))
       :response-format :json
       :keywords? true
       :handler #(handler
                   {:text (get-in % [:candidates 0
                                     :content
                                     :parts 0
                                     :text])})})))

(def LANG
  {:en
   {:lang-name "English"
    :welcome-title "Welcome to Xlaton"
    :welcome-message (str "Type a message below to get started. Select "
                          "your target language and start translating!")
    :input-placeholder "Type to translate..."
    :send "Send"
    :menu {:title "Menu"
           :aria "Chat menu"
           :open-aria "Open menu"
           :ui-lang "UI Language"
           :set-gemini-key "Set Gemini API Key"
           :update-gemini-key "Update Gemini API Key"
           :enter-gemini-key (str "Enter your Gemini API key. It will "
                                  "be stored locally in this browser.")
           :gemini-key-saved "Gemini API key saved."
           :gemini-key-cleared "Gemini API key cleared."}}

   :zh-Hant
   {:lang-name "繁體中文"
    :welcome-title "歡迎使用 Xlaton"
    :welcome-message "在下方輸入訊息即可開始。選擇目標語言並開始翻譯！"
    :input-placeholder "輸入文字以翻譯…"
    :send "送出"
    :menu {:title "選單"
           :aria "聊天選單"
           :open-aria "開啟選單"
           :ui-lang "介面語言"
           :set-gemini-key "設定 Gemini API 金鑰"
           :update-gemini-key "更新 Gemini API 金鑰"
           :enter-gemini-key (str "輸入你的 Gemini API 金鑰。"
                                  "將儲存在此瀏覽器中。")
           :gemini-key-saved "已儲存 Gemini API 金鑰。"
           :gemini-key-cleared "已清除 Gemini API 金鑰。"}}})

(rdom/render [app] (.getElementById js/document "root"))
