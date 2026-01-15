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

// --- 内申イベント用メッセージ定義 ---
const naishinMessageIds = [
    { id: "msg-naishin", order: 1 },
    { id: "msg-naishin2", order: 0 },
    { id: "msg-naishin3", order: 1 },
    { id: "msg-naishin4", order: 2 },
    { id: "msg-naishin5", order: 2 },
    { id: "msg-naishin6", order: 1 },
    { id: "msg-naishin7", order: 2 }, // 「何が分かった？」
];

function unlock(key) {
    localStorage.setItem(key, "true");
    checkFinalUnlock();
}

function isUnlocked(key) {
    return localStorage.getItem(key) === "true";
}

function checkFinalUnlock() {
    const finalLink = document.getElementById("final-link");
    if (!finalLink) return;
    if (isUnlocked("c_unlocked") && isUnlocked("a_unlocked") && isUnlocked("b_unlocked")) {
        finalLink.style.display = "block";
    }
}

/**
 * 順番にメッセージを表示する
 */
function revealMessagesSequentially(type) {
    const order = Number(window.USER_ORDER);

    if (type === "内申") {
        naishinMessageIds.forEach((item, index) => {
            const el = document.getElementById(item.id);
            if (el && el.style.display === "none" && order === item.order) {
                setTimeout(() => {
                    el.style.display = "block";
                    chatBox.prepend(el);
                }, (index + 1) * 4000); 
            }
        });

        const toride = document.getElementById("msg-toride");
        if (toride && toride.style.display === "none") {
            setTimeout(() => {
                toride.style.display = "block";
                chatBox.prepend(toride);
            }, (naishinMessageIds.length + 1) * 4000); 
        }
    }

    if (type === "千代田") {
        const chiyoda = document.getElementById("msg-chiyoda");
        if (chiyoda && chiyoda.style.display === "none" && order === 2) {
            setTimeout(() => {
                chiyoda.style.display = "block";
                chatBox.prepend(chiyoda);
            }, 4000);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    checkFinalUnlock();
    const order = Number(window.USER_ORDER);
    
    console.log("================================");
    console.log("USER_ORDER (担当番号) :", order);
    console.log("================================");

    // 通常メッセージ No.1〜10
    for (let i = 1; i <= 10; i++) {
        const msg = document.getElementById(`msg-${i}`);
        if (!msg) continue;
        msg.style.display = "none";
        setTimeout(() => {
            msg.style.display = "block";
            chatBox.prepend(msg);
        }, i * 3500);
    }

    // スペシャルメッセージ No.11〜15
    const specialMessages = [
        { id: "msg-11", order: 0, delay: 40000 },
        { id: "msg-12", order: 1, delay: 43000 },
        { id: "msg-13", order: 2, delay: 46000 },
        { id: "msg-14", order: 2, delay: 49000 },
        { id: "msg-15", order: 0, delay: 52000 },
    ];

    specialMessages.forEach(item => {
        const el = document.getElementById(item.id);
        if (!el) return;
        el.style.display = "none";
        setTimeout(() => {
            if (order !== item.order) return;
            el.style.display = "block";
            chatBox.prepend(el);
        }, item.delay);
    });


    // --- msg-naishin系（内申イベント後 + special分岐） ---
    const naishinMessages = [
        { id: "msg-naishin", order: 1, delay: 56000 },
        { id: "msg-naishin2", order: 0, delay: 60000 },
        { id: "msg-naishin3", order: 1, delay: 64000 },
        { id: "msg-naishin4", order: 2, delay: 68000 },
        { id: "msg-naishin5", order: 2, delay: 72000 },
        { id: "msg-naishin6", order: 1, delay: 76000 },
        { id: "msg-naishin7", order: 2, delay: 80000 },
    ];

    naishinMessages.forEach(item => {
        const el = document.getElementById(item.id);
        if (!el) return;
        setTimeout(() => {
            if (!window._trigger_内申) return; // 内申イベント後のみ
            if (order !== item.order) return;
            el.style.display = "block";
            chatBox.prepend(el);
        }, item.delay);
    });

    // --- msg-chiyoda（千代田イベント後 + special分岐） ---
    const chiyoda = document.getElementById("msg-chiyoda");
    if (chiyoda) {
        setTimeout(() => {
            if (!window._trigger_千代田) return; // 千代田イベント後
            if (order !== 2) return;
            chiyoda.style.display = "block";
            chatBox.prepend(chiyoda);
        });
    }

    const toride = document.getElementById("msg-toride");
    if (toride) {
        setTimeout(() => {
            if (!window._trigger_内申) return;
            toride.style.display = "block";
            chatBox.prepend(toride);
        });
    }
});

// --- WebSocket メッセージ受信 ---
if (socket) {
    socket.onmessage = (e) => {
        const data = JSON.parse(e.data);

        // 部屋解散を検知したらロビーへ強制送還
        if (data.type === "room_deleted") {
            window.location.replace("/");
            return;
        }
        
        // --- 既存のメッセージ処理 ---
        if (!data.message) return;
        displayMessage(data);

        const rawMsg = data.message.trim().normalize("NFKC").replace(/\s+/g, "");
        const order = Number(window.USER_ORDER);

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

        // 解放 & 外部リンク
        if (rawMsg === "仕様書" && order === 0) { unlock("a_unlocked"); window.open(`/a/${roomID}/`, "_blank"); }
        if (rawMsg === "千代田" && order === 1) { unlock("b_unlocked"); window.open(`/b/${roomID}/`, "_blank"); }
        if (rawMsg === "砦" && order === 2) { unlock("c_unlocked"); window.open(`/c/${roomID}/`, "_blank"); }

        if (rawMsg.includes(ALERT_WORD)) showCopyAlertWithButton(ANSWER_URL, ANSWER_URL);
    };
}

function displayMessage(data) {
    const div = document.createElement("div");
    div.className = "message";
    const date = data.timestamp ? new Date(data.timestamp) : new Date();
    const time = date.getHours() + ":" + ("0" + date.getMinutes()).slice(-2);
    
    div.innerHTML = `
        <div class="meta">投稿：${time}</div>
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