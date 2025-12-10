from django.shortcuts import render, redirect, get_object_or_404
from django.db.models import Count
from .models import Room, Entry
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import render

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
    if request.method == "POST":
        name = request.POST.get("name", "")
        if not name:
            return redirect("lobby")
        room = Room.objects.create(name=name)
        Entry.objects.create(room=room, nickname="Host")
        return redirect("room_detail", room_id=room.id)
    return redirect("lobby")

def room_detail(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    guest_count = room.entries.count()
    nickname = f"Guest{guest_count}"
    Entry.objects.get_or_create(room=room, nickname=nickname)
    members = room.entries.all()
    return render(request, "App/room_detail.html", {"room": room, "members": members})

def delete_room(request, room_id):
    room = get_object_or_404(Room, id=room_id)
    room.delete()
    return redirect("lobby")
