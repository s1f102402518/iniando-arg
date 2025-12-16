from django.urls import path
from . import views

urlpatterns = [
    path('', views.lobby, name='lobby'),
    path('create/', views.create_room, name='create_room'),
    path('room/<uuid:room_id>/', views.room_detail, name='room_detail'),
    path('room/<uuid:room_id>/delete/', views.delete_room, name='delete_room'),
    path('room/<uuid:room_id>/leave/', views.leave_room, name='leave_room'),
    path('room/<uuid:room_id>/members/', views.get_room_members, name='get_room_members'),
    path('api/recruiting_rooms/', views.get_recruiting_rooms, name='get_recruiting_rooms'),
    path("thread/<uuid:room_id>/", views.thread, name="thread"),
]