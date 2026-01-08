console.log("main.js loaded");

const roomID = window.ROOM_ID;
const ALERT_WORD = "麹町中学校内申書事件";
const ANSWER_URL = "https://example.com/answer";


const socket = new WebSocket(
    (location.protocol === "https:" ? "wss://" : "ws://")
    + location.host
    + "/ws/chat/"
    + roomID
    + "/"
);

const chatBox = document.getElementById("chat-box");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const currentUsername = document.getElementById("current-username").value;

let messageCount = 20;

function displayMessage(data) {
    messageCount++;

    const div = document.createElement("div");
    div.className = "message";

    const meta = document.createElement("div");
    meta.className = "meta";

    const date = data.timestamp ? new Date(data.timestamp) : new Date();
    const time =
        date.getFullYear() + "/" +
        (date.getMonth() + 1) + "/" +
        date.getDate() + " " +
        date.getHours() + ":" +
        ("0" + date.getMinutes()).slice(-2);

    meta.innerText = "No." + messageCount + " 投稿日：" + time;

    const nameDiv = document.createElement("div");
    nameDiv.className = "name";
    nameDiv.innerText = data.username || "名無しの学生";

    const content = document.createElement("div");
    content.innerText = data.message;

    div.appendChild(meta);
    div.appendChild(nameDiv);
    div.appendChild(content);

    chatBox.prepend(div);
}

socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    
    if (data.message) {
        // --- 確実な検知のためのクリーンアップ処理 ---
        
        // ① 全角英数などを標準的な半角/全角に揃える (normalize)
        // ② スペース、改行、タブをすべて削除して文字を詰める (replace)
        const cleanMessage = data.message.normalize("NFKC").replace(/\s+/g, "");

        // ③ 「麹町中学校内申書事件」が含まれているか判定
        if (cleanMessage.includes(ALERT_WORD)) {
            showCopyAlertWithButton(ANSWER_URL, ANSWER_URL);
        }
    }
    
    displayMessage(data);
};


function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    socket.send(JSON.stringify({
        message: text,
        username: currentUsername
    }));

    input.value = "";
}

sendBtn.onclick = sendMessage;

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function showCopyAlertWithButton(displayText, copyText) {
    const box = document.createElement("div");
    box.style.position = "fixed";
    box.style.top = "90px";
    box.style.left = "50%";
    box.style.transform = "translateX(-50%)";
    box.style.background = "#fffdf5";
    box.style.border = "2px solid #d4c38a";
    box.style.padding = "12px";
    box.style.zIndex = "9999";
    box.style.maxWidth = "90%";

    const title = document.createElement("div");
    title.innerText = "⚠ 特定ワード検出";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "6px";

    const content = document.createElement("pre");
    content.innerText = displayText;
    content.style.whiteSpace = "pre-wrap";
    content.style.marginBottom = "8px";

    const btn = document.createElement("button");
    btn.innerText = "URLをコピー";

    btn.onclick = () => {
        navigator.clipboard.writeText(copyText);
        btn.innerText = "コピーしました";
        btn.disabled = true;
    };

    box.appendChild(title);
    box.appendChild(content);
    box.appendChild(btn);
    document.body.appendChild(box);

    setTimeout(() => box.remove(), 10000);
}

 // ユーザー名を使って固定化（毎回同じ人は同じ投稿を見る）
  const username =
    document.getElementById("current-username")?.value || "guest";

  // 0,1,2 のどれかになる
  const variant =
    username.charCodeAt(0) % 3;

  document.querySelectorAll(".special").forEach(el => {
    el.style.display = "none";
  });

  document.querySelectorAll(".special-" + variant).forEach(el => {
    el.style.display = "block";
  });