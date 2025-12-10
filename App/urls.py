from django.urls import path
from . import views

urlpatterns = [
    path('', views.lobby, name='lobby'),
    path('create/', views.create_room, name='create_room'),
    path('room/<uuid:room_id>/', views.room_detail, name='room_detail'),
    path('room/<uuid:room_id>/delete/', views.delete_room, name='delete_room'),
]
