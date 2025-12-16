// App/static/App/js/thread.js (または lobby.js)

// ... (既存のWebSocket接続コード) ...

const socket = new WebSocket("ws://" + window.location.host + "/ws/chat/test/"); 
// 🚨 注意: ロビー画面でこのチャット用ソケットを使うのは不自然なので、
//          もしロビーが別の画面なら、ロビー専用のWebSocketを新しく作ることを推奨します。

// 💡 参加者リストの更新機能を追加する場合:
const roomID = window.location.pathname.split('/')[2]; // URLからroom_idを取得する例
const memberListElement = document.getElementById("member-list"); // HTMLのメンバーリストULタグにIDを付ける想定

socket.onmessage = async function(e) {
    const data = JSON.parse(e.data);

    // 💡 参加者リスト更新イベントを受信した場合
    if (data.type === "member_update") {
        await updateMemberList(); // リスト更新関数を呼び出す
    } 
    // ... (既存のチャットメッセージ表示ロジック) ...
};


async function updateMemberList() {
    const response = await fetch(`/room/${roomID}/members/`); // ステップ3で作成したAPIを叩く
    const data = await response.json();
    
    // HTMLのリストをクリアして新しいメンバーで再構築する
    if (memberListElement) {
        memberListElement.innerHTML = ''; // リストを空にする
        
        data.members.forEach(nickname => {
            const li = document.createElement("li");
            li.innerText = nickname;
            memberListElement.appendChild(li);
        });
        
        // 人数表示も更新する場合（HTML側に人数表示要素が必要）
        // document.getElementById("member-count").innerText = `${data.count} / 3`;
    }
}