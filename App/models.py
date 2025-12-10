from django.db import models
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
