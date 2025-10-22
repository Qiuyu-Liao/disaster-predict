"""
URL configuration for dpm project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from incidents.views import (
    home, list_incidents, create_incident,
    retrieve_incident, update_incident, delete_incident,
)

urlpatterns = [
    path("", home),
    path("admin/", admin.site.urls),

    # List + Create
    path("api/incidents/", list_incidents),               # GET list
    path("api/incidents/create/", create_incident),       # POST create

    # Sprint 2: Retrieve / Update / Delete
    path("api/incidents/<int:incident_id>/", retrieve_incident),             # GET one
    path("api/incidents/<int:incident_id>/update/", update_incident),        # PUT/PATCH
    path("api/incidents/<int:incident_id>/delete/", delete_incident),        # DELETE
]
