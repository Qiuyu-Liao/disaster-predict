import json
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt   
from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import Incident

def home(request):
    return HttpResponse("Disaster Prediction – Demo Home. Try /admin/ or /api/incidents/")

def list_incidents(request):
    data = list(Incident.objects.values("id", "title", "incident_type", "severity", "location", "created_at"))
    return JsonResponse({"items": data})

# --- Sprint 2: Create / Retrieve / Update / Delete ---

@csrf_exempt
@require_POST
@transaction.atomic
def create_incident(request):
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    required = ["title", "incident_type", "location"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return JsonResponse({"error": "Missing fields", "fields": missing}, status=400)

    try:
        severity = int(data.get("severity", 1))
        if not (1 <= severity <= 5):
            raise ValueError
    except Exception:
        return JsonResponse({"error": "severity must be integer 1–5"}, status=400)

    obj = Incident.objects.create(
        title=data["title"],
        incident_type=data["incident_type"],
        severity=severity,
        location=data["location"],
    )
    resp = JsonResponse({"id": obj.id})
    resp.status_code = 201
    resp["Location"] = f"/api/incidents/{obj.id}/"
    return resp

@require_http_methods(["GET"])
def retrieve_incident(request, incident_id: int):
    obj = get_object_or_404(Incident, id=incident_id)
    data = {
        "id": obj.id,
        "title": obj.title,
        "incident_type": obj.incident_type,
        "severity": obj.severity,
        "location": obj.location,
        "created_at": obj.created_at,
    }
    return JsonResponse(data, status=200)

@csrf_exempt
@require_http_methods(["PUT", "PATCH"])
@transaction.atomic
def update_incident(request, incident_id: int):
    obj = get_object_or_404(Incident, id=incident_id)
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    allowed = {"title", "incident_type", "severity", "location"}
    unknown = [k for k in data.keys() if k not in allowed]
    if unknown:
        return JsonResponse({"error": "Unknown fields", "fields": unknown}, status=400)

    if "title" in data and data["title"]:
        obj.title = data["title"]
    if "incident_type" in data and data["incident_type"]:
        obj.incident_type = data["incident_type"]
    if "severity" in data:
        try:
            sev = int(data["severity"])
            if not (1 <= sev <= 5):
                raise ValueError
            obj.severity = sev
        except Exception:
            return JsonResponse({"error": "severity must be integer 1–5"}, status=400)
    if "location" in data and data["location"]:
        obj.location = data["location"]

    obj.save()
    return JsonResponse({"id": obj.id, "updated": True}, status=200)

@csrf_exempt
@require_http_methods(["DELETE"])
@transaction.atomic
def delete_incident(request, incident_id: int):
    obj = get_object_or_404(Incident, id=incident_id)
    obj.delete()
    return JsonResponse({"id": incident_id, "deleted": True}, status=200)