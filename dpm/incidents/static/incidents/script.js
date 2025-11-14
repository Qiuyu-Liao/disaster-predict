const API_BASE = "";

async function loadIncidents() {
  const res = await fetch(`${API_BASE}/api/incidents/`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const items = json.items || [];

  const list = document.getElementById("incident-list");
  list.innerHTML = "";
  for (const it of items) {
    const li = document.createElement("li");
    li.textContent = `#${it.id} [${it.incident_type}] ${it.title} | severity=${it.severity} | ${it.location}`;
    list.appendChild(li);
  }
}

async function createIncident(payload) {
  const res = await fetch(`${API_BASE}/api/incidents/create/`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Create failed: HTTP ${res.status}`);
  return await res.json();
}

function bindCreateForm() {
  const form = document.getElementById("incident-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      title: fd.get("title"),
      incident_type: fd.get("incident_type"),
      severity: Number(fd.get("severity")),
      location: fd.get("location"),
    };
    await createIncident(payload);
    form.reset();
    await loadIncidents();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  bindCreateForm();
  await loadIncidents();
});
