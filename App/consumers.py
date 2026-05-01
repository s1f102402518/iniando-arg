import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from django.utils import timezone
from .models import Room, Message

class ChatConsumer(AsyncWebsocketConsumer):
    # 指定ルームのグループに参加し、過去ログを送信
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        messages = await self.get_previous_messages()
        for message in messages:
            await self.send(text_data=json.dumps({
                'type': 'chat_message',
                'message': message['content'],
                'username': message['username'],
                'timestamp': message['timestamp'].isoformat() 
            }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # メッセージ受信 → DB保存 → グループ全体へブロードキャスト
    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data["message"]
        username = data["username"]

        await self.save_message(username, message)

        current_time = timezone.now().isoformat()

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'username': username,
                'timestamp': current_time
            }
        )

    # グループから受信したメッセージをクライアントへ送信
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': event['type'],
            'message': event['message'],
            'username': event['username'],
            'timestamp': event['timestamp']
        }))

    # DBにチャットメッセージを保存（同期処理を非同期化）
    @sync_to_async
    def save_message(self, username, content):
        room = Room.objects.get(id=self.room_name)
        Message.objects.create(room=room, username=username, content=content, timestamp=timezone.now())
    
    # ルームの過去メッセージを時系列で取得
    @sync_to_async
    def get_previous_messages(self):
        room = Room.objects.get(id=self.room_name)
        messages_qs = Message.objects.filter(room=room).order_by('timestamp')
        return list(messages_qs.values('username', 'content', 'timestamp'))

    # メンバー変更イベントをクライアントへ通知
    async def member_list_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "member_update",
            "message": event["message"]
        }))

    # ルーム削除イベントを通知（強制退出用）
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