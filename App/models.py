from django.db import models
from django.utils import timezone
import uuid

class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

class Entry(models.Model):
    room = models.ForeignKey(Room, related_name="entries", on_delete=models.CASCADE)
    nickname = models.CharField(max_length=50)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_ready = models.BooleanField(default=False)

class Message(models.Model):
    room = models.ForeignKey(
        'Room', 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    username = models.CharField(max_length=100)
    content = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['timestamp'] 

    def __str__(self):
        return f'{self.username}: {self.content[:20]}'