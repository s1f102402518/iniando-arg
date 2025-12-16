import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        
        message = data.get("message")
        username = data.get("username", "名無しの学生") 

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message,
                "username": username,
            }
        )

    async def chat_message(self, event):
        message = event["message"]
        username = event["username"]

        await self.send(text_data=json.dumps({
            "message": message,
            "username": username,
        }))

    async def member_list_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "member_update",
            "message": event["message"]
        }))

    async def room_deleted(self, event):
        await self.send(text_data=json.dumps({
            "type": "room_deleted",
            "message": event["message"]
        }))

class LobbyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'lobby_updates'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def lobby_update_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'lobby_update',
            'message': event['message']
        }))