from django.shortcuts import render, redirect, get_object_or_404
from django.db.models import Count
from .models import Room, Entry
from django.utils import timezone
from datetime import timedelta
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.http import JsonResponse
from django.contrib import messages

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
    rooms = Room.objects.annotate(num_players=Count("entries"))

    if query:
        rooms = rooms.filter(name__icontains=query) | rooms.filter(id__icontains=query)
        rooms = rooms.annotate(num_players=Count("entries")).filter(num_players__lt=3)
    else:
        rooms = rooms.filter(num_players__lt=3)

    yesterday = timezone.now().date() - timedelta(days=1)

    return render(request, "App/lobby.html", {
        "rooms": rooms,
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

def a_thread_page(request):
    return render(request, "App/A_thread.html")

def b_thread_page(request):
    return render(request, "App/B_thread.html")

def c_thread_page(request):
    return render(request, "App/C_thread.html")

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
            'count': room.entries.count(),
        })
    
    return JsonResponse({'rooms': room_data})

def leave_room(request, room_id):
    if not request.user.is_authenticated:
        return redirect("login")

    if request.method == "POST":
        room = get_object_or_404(Room, id=room_id)
        current_username = request.user.username

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