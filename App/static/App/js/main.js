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

document.addEventListener("DOMContentLoaded", () => {
    checkFinalUnlock();

    const order = Number(window.USER_ORDER);
    console.log("USER_ORDER =", order);
    console.log("ROOM_ID =", roomID);

    // --- No.1〜10 通常メッセージ（時間経過のみ） ---
    const normalMessages = [];
    for (let i = 1; i <= 10; i++) {
        const msg = document.getElementById(`msg-${i}`);
        if (!msg) continue;
        msg.style.display = "none";
        normalMessages.push({ el: msg, delay: i * 3500 }); // 個別表示間隔
    }

    normalMessages.forEach(item => {
        setTimeout(() => {
            item.el.style.display = "block";
            chatBox.prepend(item.el);
        }, item.delay);
    });

    // --- msg-11〜15 special分岐 ---
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

// --- WebSocket メッセージ受信 ---
if (socket) {
    socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (!data.message) return;

        displayMessage(data);

        const rawMsg = data.message.trim().normalize("NFKC").replace(/\s+/g, "");
        const order = Number(window.USER_ORDER);

        // 内申・千代田イベントのトリガー
        if (rawMsg === "内申") window._trigger_内申 = true;
        if (rawMsg === "千代田") window._trigger_千代田 = true;

        // Unlock & 外部リンク
        if (rawMsg === "仕様書" && order === 0) { unlock("a_unlocked"); window.open(`/a/${roomID}/`, "_blank"); }
        if (rawMsg === "千代田" && order === 1) { unlock("b_unlocked"); window.open(`/b/${roomID}/`, "_blank"); }
        if (rawMsg === "砦" && order === 2) { unlock("c_unlocked"); window.open(`/c/${roomID}/`, "_blank"); }

        // ALERT_WORD
        if (rawMsg.includes(ALERT_WORD)) showCopyAlertWithButton(ANSWER_URL, ANSWER_URL);
    };
}

// --- 送信 ---
function sendMessage() {
    const text = input.value.trim();
    if (!text || !socket) return;
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

// --- 特定ワード表示 ---
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
