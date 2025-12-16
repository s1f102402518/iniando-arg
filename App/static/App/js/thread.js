const socket = new WebSocket("ws://" + window.location.host + "/ws/chat/test/");

const chatBox = document.getElementById("chat-box");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

const currentUsername = document.getElementById("current-username").value;

let messageCount = 0;

socket.onmessage = function(e) {
    const data = JSON.parse(e.data);
    messageCount++;

    const div = document.createElement("div");
    div.className = "message";

    const meta = document.createElement("div");
    meta.className = "meta";
    const now = new Date();
    const timestamp = now.getFullYear() + '/' + (now.getMonth()+1) + '/' + now.getDate() + ' ' + now.getHours() + ':' + now.getMinutes();
    meta.innerText = "No." + messageCount + " 投稿日：" + timestamp;

    const nameDiv = document.createElement("div");
    nameDiv.className = "name";
    nameDiv.innerText = data.username || "名無しの学生";

    const content = document.createElement("div");
    content.innerText = data.message; // 改行も保持される

    div.appendChild(meta);
    div.appendChild(nameDiv);
    div.appendChild(content);

    chatBox.prepend(div);
};

function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    socket.send(JSON.stringify({ 
        "message": text,
        "username": currentUsername // ログインユーザー名を送信
    }));
    input.value = "";
}

sendBtn.onclick = sendMessage;
input.addEventListener("keypress", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // Enterで送信、Shift+Enterで改行
        sendMessage();
    }
});