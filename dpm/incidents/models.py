from django.db import models

# Create your models here.
class Incident(models.Model):
    TYPE_CHOICES = [("earthquake","Earthquake"),("flood","Flood")]
    title = models.CharField(max_length=120)
    incident_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    severity = models.IntegerField(default=1)  # 1~5
    location = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.incident_type})"