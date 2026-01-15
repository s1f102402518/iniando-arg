from django.shortcuts import render, redirect, get_object_or_404
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.core.exceptions import ValidationError

from .models import Room, Entry

# ==========================================
# 共通ヘルパー関数
# ==========================================

def broadcast_lobby_update():
    """ロビー（募集一覧）に更新を通知する"""
    channel_layer = get_channel_layer()
    lobby_group_name = 'lobby_updates'
    async_to_sync(channel_layer.group_send)(
        lobby_group_name,
        {
            'type': 'lobby_update_message',
            'message': 'Room list changed',
        }
    )

# ==========================================
# メインビュー
# ==========================================

def lobby(request):
    """ロビー画面の表示（検索機能付き）"""
    query = request.GET.get("q", "")
    
    # 全ての部屋に現在の参加人数を付与
    all_rooms = Room.objects.annotate(num_players=Count("entries"))

    # 「募集中の部屋」（3人未満）を抽出
    rooms = all_rooms.filter(num_players__lt=3)

    # 検索処理（ID or 名前）
    if query:
        try:
            # ID(UUID)の完全一致、または名前の部分一致
            rooms = rooms.filter(Q(id=query) | Q(name__icontains=query))
        except (ValueError, ValidationError):
            # queryがUUID形式でない場合は名前検索のみ実行
            rooms = rooms.filter(name__icontains=query)

    # 「自分が参加中の部屋」は人数に関わらず表示
    my_groups = all_rooms.filter(entries__nickname=request.user.username).order_by('-id')

    yesterday = timezone.now().date() - timedelta(days=1)

    return render(request, "App/lobby.html", {
        "rooms": rooms,
        "my_groups": my_groups,
        "yesterday": yesterday,
        "query": query,  # 検索窓に値を残すため
    })

def room_detail(request, room_id):
    """調査グループ待機所（入室処理含む）"""
    if not request.user.is_authenticated:
        return redirect("login")

    room = get_object_or_404(Room, id=room_id)
    current_username = request.user.username
    
    members = room.entries.all()
    user_is_member = members.filter(nickname=current_username).exists()
    
    # メンバー外、かつ満員の場合は弾く
    if not user_is_member and members.count() >= 3:
        return redirect("lobby") 

    # 参加登録（既に参加してれば取得、なければ作成）
    entry, created = Entry.objects.get_or_create(
        room=room, 
        nickname=current_username
    )
    
    if created:
        # 新しく参加した場合は、その部屋のチャットに通知
        channel_layer = get_channel_layer()
        room_group_name = f'chat_{room_id}' 
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'member_list_update', 
                'message': 'new member joined',
            }
        )
        # 3人揃った（募集終了）タイミングでロビーを更新
        if room.entries.count() == 3:
            broadcast_lobby_update()
        
    return render(request, "App/room_detail.html", {
        "room": room, 
        "members": room.entries.all()
    })

import hashlib

def thread(request, room_id):
    if not request.user.is_authenticated:
        return redirect("login")

    room = get_object_or_404(Room, id=room_id)

    user_entry = room.entries.filter(nickname=request.user.username).first()

    if not room.entries.filter(nickname=request.user.username).exists():
        return redirect("room_detail", room_id=room.id)

    all_entries = list(room.entries.all().order_by('id')) 
    order = all_entries.index(user_entry) % 3  # 0,1,2

    return render(request, "App/thread.html", {
        "room": room,
        "order": order,
    })


# ==========================================
# 操作アクション (POST/Redirect)
# ==========================================

def create_room(request):
    """新しい調査グループを作成"""
    if not request.user.is_authenticated:
        return redirect("login")

    if request.method == "POST":
        name = request.POST.get("name", "")
        if not name:
            return redirect("lobby")
        
        # 部屋作成と作成者の自動登録
        room = Room.objects.create(name=name)
        Entry.objects.create(room=room, nickname=request.user.username)
        
        broadcast_lobby_update()
        return redirect("room_detail", room_id=room.id)
    return redirect("lobby")

def leave_room(request, room_id):
    """グループから退出"""
    if not request.user.is_authenticated:
        return redirect("login")

    if request.method == "POST":
        room = get_object_or_404(Room, id=room_id)
        current_username = request.user.username

        # 部屋作成者（1人目）は基本退出できない（削除が必要）という仕様例
        host_entry = room.entries.first() 
        if host_entry and host_entry.nickname == current_username:
            return redirect("room_detail", room_id=room.id)

        # 退出処理
        Entry.objects.filter(room=room, nickname=current_username).delete()
        
        # 退出通知
        channel_layer = get_channel_layer()
        room_group_name = f'chat_{room_id}'
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {'type': 'member_list_update', 'message': 'member left'}
        )
        
        broadcast_lobby_update()
        return redirect("lobby")
    
    return redirect("lobby")

def delete_room(request, room_id):
    """グループを解散（削除）"""
    room = get_object_or_404(Room, id=room_id)
    room_group_name = f'chat_{room.id}'
    
    # 参加者に解散を通知
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        room_group_name,
        {'type': 'room_deleted', 'message': 'Room has been deleted.'}
    )

    room.delete()
    broadcast_lobby_update()
    return redirect("lobby")

# ==========================================
# API (JavaScript用)
# ==========================================

def get_recruiting_rooms(request):
    """募集中の部屋リストをJSONで返す（リアルタイム更新用）"""
    query = request.GET.get('q', '')
    rooms = Room.objects.annotate(num_players=Count("entries")).filter(num_players__lt=3)

    if query:
        try:
            rooms = rooms.filter(Q(id=query) | Q(name__icontains=query))
        except (ValueError, ValidationError):
            rooms = rooms.filter(name__icontains=query)

    room_data = [
        {'id': str(room.id), 'name': room.name, 'count': room.num_players}
        for room in rooms
    ]
    return JsonResponse({'rooms': room_data})

def get_my_rooms(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    all_rooms = Room.objects.annotate(num_players=Count("entries"))
    my_groups = all_rooms.filter(entries__nickname=request.user.username).order_by('-id')

    html = render_to_string('App/my_rooms_list.html', {'my_groups': my_groups}, request=request)
    return JsonResponse({'html': html})

def get_room_members(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    members = room.entries.all()
    member_list = [member.nickname for member in members]
    
    return JsonResponse({
        'members': member_list,
        'count': len(member_list)
    })
import random

def generate_scores(user_order=None, judgment=None):

    if user_order is not None:
        if user_order == 0:
            judgment_value= "A"
            p_score = 0.89
            n_score = -0.70
        elif user_order == 1:
            judgment_value= "B"
            p_score = 0.49
            n_score = -0.41
        elif user_order == 2:
            judgment_value= "C"
            p_score = -0.37
            n_score = 0.78

    elif judgment is not None:
        judgment_value = judgment
        if judgment_value == "A":
            p_score = round(random.uniform(0.5, 1), 2)
            n_score = round(random.uniform(-1, -0.5), 2)
        elif judgment_value == "B":
            p_score = round(random.uniform(0, 0.5), 2)
            n_score = round(random.uniform(-0.5, 0), 2)
        else:  # C
            p_score = round(random.uniform(-1, 0), 2)
            n_score = round(random.uniform(0, 1), 2)
    else:
        p_score = 0
        n_score = 0
        judgment_value = "A"

    return p_score, n_score, judgment_value


def a_page(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    entries = room.entries.all()

    users = []

    for idx, entry in enumerate(entries):
        user_order = getattr(entry, 'user_order', idx % 3)
        p_score, n_score, judgment = generate_scores(user_order=user_order)
        users.append({
            "nickname": entry.nickname,
            "name": "■■■■",
            "p_score": p_score,
            "n_score": n_score,
            "judgment": judgment,
            "user_order": user_order
        })
        dummy_nicknames = [
        "a_158", "coffee_lover", "digital_kirai", "nightowl_21",
        "hobby_yuki", "dooog"
        ]
    for i in range(6):
        judgment = random.choice(["A", "B", "C"])
        p_score, n_score, judgment_value = generate_scores(judgment=judgment)
        users.append({
            "nickname": dummy_nicknames[i],
            "name": "■■■■",
            "p_score": p_score,
            "n_score": n_score,
            "judgment": judgment_value,
            "user_order": i % 3
        })

    return render(request, "App/a.html", {"users": users, "room": room})

def b_page(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    return render(request, "App/b.html", {"room": room})

def c_page(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    return render(request, "App/c.html", {"room": room})
