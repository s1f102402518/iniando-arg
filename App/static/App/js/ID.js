document.addEventListener('DOMContentLoaded', () => {
    // ページ読み込み時に初回実行
    updateRoomList();
    updateMyRoomList();
    setupUserMenu();
    setupWebSocket();
});

// --- 1. WebSocket設定 ---
function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const lobbySocket = new WebSocket(
        protocol + window.location.host + '/ws/lobby/'
    );

    lobbySocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        if (data.type === 'lobby_update') {
            updateRoomList();
            updateMyRoomList();
        }
    };
    
    lobbySocket.onclose = function(e) {
        console.error('Lobby socket closed unexpectedly');
    };
}

// --- 2. 募集中リストの更新（検索対応） ---
async function updateRoomList() {
    const listElement = document.getElementById('recruiting-rooms-list');
    if (!listElement) return;

    // HTMLの data-url 属性からAPIのURLを取得
    const baseUrl = listElement.dataset.url; 
    
    // URLの検索パラメータ(?q=...)を取得
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    // API用URLを構築
    let apiUrl = baseUrl;
    if (query) {
        // すでにURLパラメータがあるかチェックして結合文字を変える等の配慮はfetch側が単純ならこれでOK
        // もしbaseUrlに既に?が含まれる設計なら &q= にする必要がありますが、通常は以下でOK
        apiUrl += `?q=${encodeURIComponent(query)}`;
    }

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        listElement.innerHTML = ''; 

        if (data.rooms.length === 0) {
            const li = document.createElement('li');
            li.innerText = '該当する部屋はありません';
            listElement.appendChild(li);
        } else {
            data.rooms.forEach(room => {
                const li = document.createElement('li');
                
                const textNode = document.createTextNode(`${room.name} (${room.count} / 3)`);
                li.appendChild(textNode);
                
                const link = document.createElement('a');
                link.href = `/room/${room.id}/`; // ※ここも動的にしたい場合はHTMLからprefixを渡す工夫が必要ですが、一旦固定で記述
                link.innerText = '参加';
                link.style.marginLeft = '13.5px';

                li.appendChild(link);
                listElement.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error fetching room list:', error);
    }
}

// --- 3. 参加中リストの更新 ---
async function updateMyRoomList() {
    const listElement = document.getElementById('my-rooms-list');
    if (!listElement) return;

    const apiUrl = listElement.dataset.url; // HTMLからURLを取得

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (response.ok) {
            listElement.innerHTML = data.html;
        } else {
            console.error("Failed to fetch my rooms:", data.error);
        }
    } catch (error) {
        console.error('Error fetching my rooms:', error);
    }
}

// --- 4. ユーザーメニュー（ログアウト）の動作 ---
function setupUserMenu() {
    const userNameBtn = document.getElementById('user-name');
    const dropdown = document.getElementById('logout-dropdown');

    if (userNameBtn && dropdown) {
        userNameBtn.addEventListener('click', function(e) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            e.stopPropagation();
        });

        document.addEventListener('click', function() {
            dropdown.style.display = 'none';
        });
    }
    
    // メッセージ表示のリセット（URLパラメータの掃除）
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('message')) {
         window.history.replaceState({}, document.title, window.location.pathname);
    }
}