const socket = new WebSocket("ws://" + window.location.host + "/ws/chat/test/"); 
const roomID = window.location.pathname.split('/')[2];
const memberListElement = document.getElementById("member-list");

socket.onmessage = async function(e) {
    const data = JSON.parse(e.data);

    if (data.type === "member_update") {
        await updateMemberList();
    } 
};


async function updateMemberList() {
    const response = await fetch(`/room/${roomID}/members/`);
    const data = await response.json();
    
    if (memberListElement) {
        memberListElement.innerHTML = '';
        
        data.members.forEach(nickname => {
            const li = document.createElement("li");
            li.innerText = nickname;
            memberListElement.appendChild(li);
        });
        ;
    }
}