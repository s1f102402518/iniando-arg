// ページ読み込み完了後に初期処理を実行
document.addEventListener('DOMContentLoaded', () => {
    updateRoomList();
    updateMyRoomList();
    setupUserMenu();
    setupWebSocket();
});

// ロビー全体の更新通知を受け取る
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

async function updateRoomList() {
    const listElement = document.getElementById('recruiting-rooms-list');
    if (!listElement) return;

    const baseUrl = listElement.dataset.url; 
    
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    let apiUrl = baseUrl;
    if (query) {
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
                link.href = `/room/${room.id}/`;
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

// 自分が参加している部屋一覧を取得して更新
async function updateMyRoomList() {
    const listElement = document.getElementById('my-rooms-list');
    if (!listElement) return;

    const apiUrl = listElement.dataset.url;

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

// ユーザー名クリック時のログアウトメニュー制御
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
    // ?message=xxx のような一時パラメータをURLから削除
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('message')) {
         window.history.replaceState({}, document.title, window.location.pathname);
    }
}