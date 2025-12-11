from django.urls import path
from . import views

urlpatterns = [
    path('', views.lobby, name='lobby'),
    path('create/', views.create_room, name='create_room'),
    path('room/<uuid:room_id>/', views.room_detail, name='room_detail'),
    path('room/<uuid:room_id>/delete/', views.delete_room, name='delete_room'),
    path("thread17861/", views.a_thread_page, name="a_thread"),
    path("thread17862/", views.b_thread_page, name="b_thread"),
    path("thread17863/", views.c_thread_page, name="c_thread"),
]