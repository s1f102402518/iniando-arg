from django.shortcuts import render, redirect, get_object_or_404
from django.db.models import Count
from .models import Room, Entry
from django.utils import timezone
from datetime import timedelta
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.http import JsonResponse
from django.contrib import messages
from django.template.loader import render_to_string
from django.db.models import Q

def broadcast_lobby_update():
    channel_layer = get_channel_layer()
    lobby_group_name = 'lobby_updates'
    async_to_sync(channel_layer.group_send)(
        lobby_group_name,
        {
            'type': 'lobby_update_message',
            'message': 'Room list changed',
        }
    )

def lobby(request):
    query = request.GET.get("q", "")
    all_rooms = Room.objects.annotate(num_players=Count("entries"))

    if query:
        rooms = all_rooms.filter(name__icontains=query) | all_rooms.filter(id__icontains=query)
        rooms = rooms.annotate(num_players=Count("entries")).filter(num_players__lt=3)
    else:
        rooms = all_rooms.filter(num_players__lt=3)

    my_groups = all_rooms.filter(entries__nickname=request.user.username).annotate(num_players=Count("entries")).order_by('-id')

    yesterday = timezone.now().date() - timedelta(days=1)

    return render(request, "App/lobby.html", {
        "rooms": rooms,
        "my_groups": my_groups,
        "yesterday": yesterday,
    })

def create_room(request):
    if not request.user.is_authenticated:
        return redirect("login")

    if request.method == "POST":
        name = request.POST.get("name", "")
        if not name:
            return redirect("lobby")
        room = Room.objects.create(name=name)
        Entry.objects.create(room=room, nickname=request.user.username)
        
        broadcast_lobby_update()
        
        return redirect("room_detail", room_id=room.id)
    return redirect("lobby")

def room_detail(request, room_id):
    if not request.user.is_authenticated:
        return redirect("login")

    room = get_object_or_404(Room, id=room_id)
    current_username = request.user.username
    
    members = room.entries.all()
    user_is_member = members.filter(nickname=current_username).exists()
    
    if not user_is_member and members.count() >= 3:
        return redirect("lobby") 

    entry, created = Entry.objects.get_or_create(
        room=room, 
        nickname=current_username
    )
    
    if created:
        channel_layer = get_channel_layer()
        room_group_name = f'chat_{room_id}' 
        
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'member_list_update', 
                'message': 'new member joined',
            }
        )
        
    members = room.entries.all()
    
    # 参加者数が3人になった場合もロビーに通知
    if members.count() == 3 and created:
        broadcast_lobby_update()
        
    return render(request, "App/room_detail.html", {"room": room, "members": members})

def delete_room(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    room_group_name = f'chat_{room.id}'
    
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        room_group_name,
        {
            'type': 'room_deleted', 
            'message': 'Room has been deleted.',
        }
    )

    room.delete()
    
    broadcast_lobby_update()
    
    return redirect("lobby")

def thread(request, room_id):
    if not request.user.is_authenticated:
        return redirect("login")
    
    room = get_object_or_404(Room, id=room_id)
    
    if not room.entries.filter(nickname=request.user.username).exists():
        return redirect("room_detail", room_id=room.id)

    return render(request, "App/thread.html", {"room": room})

def get_room_members(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    members = room.entries.all()
    
    member_list = [member.nickname for member in members]
    
    return JsonResponse({
        'members': member_list,
        'count': len(member_list)
    })

def get_recruiting_rooms(request):
    rooms = Room.objects.annotate(num_players=Count("entries"))
    rooms = rooms.filter(num_players__lt=3) 

    room_data = []
    for room in rooms:
        room_data.append({
            'id': str(room.id),
            'name': room.name,
            'count': room.num_players,
        })
    
    return JsonResponse({'rooms': room_data})

def leave_room(request, room_id):
    if not request.user.is_authenticated:
        return redirect("login")

    if request.method == "POST":
        room = get_object_or_404(Room, id=room_id)
        current_username = request.user.username

        host_entry = room.entries.first() 
        if host_entry and host_entry.nickname == current_username:
            return redirect("room_detail", room_id=room.id)

        try:
            entry = Entry.objects.get(room=room, nickname=current_username)
            entry.delete()
        except Entry.DoesNotExist:
            pass
        
        channel_layer = get_channel_layer()
        room_group_name = f'chat_{room_id}'
        
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'member_list_update',
                'message': 'member left',
            }
        )
        
        broadcast_lobby_update()

        return redirect("lobby")
    
    return redirect("lobby")

def get_my_rooms(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    all_rooms = Room.objects.annotate(num_players=Count("entries"))
    my_groups = all_rooms.filter(entries__nickname=request.user.username).order_by('-id')

    html = render_to_string('App/my_rooms_list.html', {'my_groups': my_groups}, request=request)

    return JsonResponse({'html': html})

# 1. ロビー画面を表示するビュー
def lobby(request):
    query = request.GET.get('q') # URLから ?q=... を取得
    
    # 元々の部屋取得ロジック（例）
    rooms = Room.objects.all()

    if query:
        # 名前 または ID で検索するロジック
        if query.isdigit():
            # 数字ならIDも検索対象に含める
            rooms = rooms.filter(Q(name__icontains=query) | Q(id=int(query)))
        else:
            # 文字なら名前だけ検索
            rooms = rooms.filter(name__icontains=query)

    context = {
        'rooms': rooms,
        # ... 他のコンテキスト ...
    }
    return render(request, 'App/lobby.html', context)


# 2. JavaScriptが叩いているAPIのビュー (get_recruiting_rooms)
def get_recruiting_rooms(request):
    query = request.GET.get('q') # APIも検索ワードを受け取れるようにする
    
    rooms = Room.objects.all()

    # 上と同じ検索ロジックを入れる
    if query:
        if query.isdigit():
            rooms = rooms.filter(Q(name__icontains=query) | Q(id=int(query)))
        else:
            rooms = rooms.filter(name__icontains=query)

    # ... JSONデータを返す処理 ...
    return JsonResponse({'rooms': list(rooms.values())})