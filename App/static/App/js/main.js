console.log("main.js loaded");

const roomID = window.ROOM_ID;
const ALERT_WORD = "麹町中学校内申書事件";
const ANSWER_URL = `${location.protocol}//${location.host}/answer/secret/`;

let socket = null;
if (window.ROOM_ID) {
    socket = new WebSocket(
        (location.protocol === "https:" ? "wss://" : "ws://") +
        location.host +
        "/ws/chat/" +
        window.ROOM_ID +
        "/"
    );
}

const chatBox = document.getElementById("chat-box");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const currentUsername = document.getElementById("current-username").value;

// --- 内申イベント用メッセージ定義 (キーワード「内申」で発動) ---
const naishinMessageIds = [
    { id: "msg-naishin", order: 1 },
    { id: "msg-naishin2", order: 0 },
    { id: "msg-naishin3", order: 1 },
    { id: "msg-naishin4", order: 2 }, // ユーザー3: 「誰も続いてくれない…」
    { id: "msg-naishin5", order: 2 }, // ユーザー3: 「もういいよ」
    { id: "msg-naishin6", order: 1 },
    { id: "msg-naishin7", order: 2 }, // ユーザー3: 「何が分かった？」
];

/**
 * 順番にメッセージを表示する (イベント制御)
 */
function revealMessagesSequentially(type) {
    const order = Number(window.USER_ORDER);

    if (type === "内申") {
        naishinMessageIds.forEach((item, index) => {
            const el = document.getElementById(item.id);
            if (el && order === item.order) {
                setTimeout(() => {
                    el.style.display = "block";
                    chatBox.prepend(el);
                }, (index + 1) * 4000); // 4秒間隔で順次表示
            }
        });

        const toride = document.getElementById("msg-toride");
        if (toride) {
            setTimeout(() => {
                toride.style.display = "block";
                chatBox.prepend(toride);
            }, (naishinMessageIds.length + 1) * 4000); 
        }
    }

    if (type === "千代田") {
        const chiyoda = document.getElementById("msg-chiyoda");
        if (chiyoda && order === 2) {
            setTimeout(() => {
                chiyoda.style.display = "block";
                chatBox.prepend(chiyoda);
            }, 4000);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const order = Number(window.USER_ORDER);
    
    // 1. 通常メッセージ (No.1〜10) - 全員共通
    for (let i = 1; i <= 10; i++) {
        const msg = document.getElementById(`msg-${i}`);
        if (!msg) continue;
        msg.style.display = "none";
        setTimeout(() => {
            msg.style.display = "block";
            chatBox.prepend(msg);
        }, i * 3500);
    }

    // 2. スペシャルメッセージ (No.11〜15) - 担当者のみ
    // ユーザー3（order 2）の「しりとり文」はここに含まれる
    const specialMessages = [
        { id: "msg-11", order: 0, delay: 40000 },
        { id: "msg-12", order: 1, delay: 43000 },
        { id: "msg-13", order: 2, delay: 46000 }, // ユーザー3
        { id: "msg-14", order: 2, delay: 49000 }, // ユーザー3
        { id: "msg-15", order: 0, delay: 52000 },
    ];

    specialMessages.forEach(item => {
        const el = document.getElementById(item.id);
        if (!el) return;
        el.style.display = "none";
        setTimeout(() => {
            if (order === item.order) {
                el.style.display = "block";
                chatBox.prepend(el);
            }
        }, item.delay);
    });
});

// --- WebSocket 受信 ---
if (socket) {
    socket.onmessage = (e) => {
        const data = JSON.parse(e.data);

        // A. 部屋削除 (404対策)
        if (data.type === "room_deleted") {
            window.location.replace("/");
            return;
        }
        
        // B. 通常メッセージ表示
        if (!data.message) return;
        displayMessage(data);

        const rawMsg = data.message.trim().normalize("NFKC").replace(/\s+/g, "");
        const order = Number(window.USER_ORDER);

        // C. キーワード判定
        if (rawMsg === "内申") {
            if (!window._trigger_内申) {
                window._trigger_内申 = true;
                revealMessagesSequentially("内申");
            }
        }
        if (rawMsg === "千代田") {
            if (!window._trigger_千代田) {
                window._trigger_千代田 = true;
                revealMessagesSequentially("千代田");
            }
        }

        // D. ページ解放 & リンク
        if (rawMsg === "仕様書" && order === 0) {
            localStorage.setItem("a_unlocked", "true");
            window.open(`/a/${roomID}/`, "_blank");
        }
        if (rawMsg === "千代田" && order === 1) {
            localStorage.setItem("b_unlocked", "true");
            window.open(`/b/${roomID}/`, "_blank");
        }
        if (rawMsg === "砦" && order === 2) {
            localStorage.setItem("c_unlocked", "true");
            window.open(`/c/${roomID}/`, "_blank");
        }

        if (rawMsg.includes(ALERT_WORD)) showCopyAlertWithButton(ANSWER_URL, ANSWER_URL);
    };
}

function displayMessage(data) {
    const div = document.createElement("div");
    div.className = "message";
    
    // サーバーからのタイムスタンプがあればそれを使用、なければ現在の時刻
    const date = data.timestamp ? new Date(data.timestamp) : new Date();
    
    // 各パーツを取得
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2); // 月は0から始まるので+1
    const day   = ("0" + date.getDate()).slice(-2);
    const hours = ("0" + date.getHours()).slice(-2);
    const minutes = ("0" + date.getMinutes()).slice(-2);
    
    // 形式： 2026/01/15 15:00
    const formattedDateTime = `${year}/${month}/${day} ${hours}:${minutes}`;
    
    div.innerHTML = `
        <div class="meta">投稿：${formattedDateTime}</div>
        <div class="name">${data.username || "名無し"}</div>
        <div>${data.message}</div>
    `;
    chatBox.prepend(div);
}

function sendMessage() {
    const text = input.value.trim();
    if (!text || !socket) return;
    socket.send(JSON.stringify({ message: text, username: currentUsername }));
    input.value = "";
}
sendBtn.onclick = sendMessage;
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

function showCopyAlertWithButton(displayText, copyText) {
    const box = document.createElement("div");
    box.style = "position:fixed; top:90px; left:50%; transform:translateX(-50%); background:#fffdf5; border:2px solid #d4c38a; padding:12px; z-index:9999;";
    box.innerHTML = `<b>⚠ 特定ワード検出</b><pre>${displayText}</pre><button id="copy-url-btn">URLをコピー</button>`;
    document.body.appendChild(box);
    document.getElementById("copy-url-btn").onclick = () => {
        navigator.clipboard.writeText(copyText);
        box.remove();
    };
    setTimeout(() => box.remove(), 10000);
}