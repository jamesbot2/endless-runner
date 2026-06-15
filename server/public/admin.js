// Endless Runner Admin Dashboard — Client JS
// Loaded by /admin HTML page. All data arrives via authenticated API calls.

var currentEditEmail = null;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, function(c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c;
  });
}
function escAttr(s) { return esc(String(s ?? "")).replace(/`/g, "&#96;"); }

function msg(t, c) {
  var m = document.getElementById("msg");
  m.textContent = t;
  m.className = c || "info";
  m.style.display = "block";
  setTimeout(function() { m.style.display = "none"; }, 3000);
}

function api(url, opts) {
  opts = opts || {};
  opts.credentials = "same-origin";
  return fetch(url, opts).then(function(r) { return r.json(); });
}

function loadUsers() {
  var q = "search=" + encodeURIComponent(document.getElementById("searchInput").value);
  q += "&sort=" + document.getElementById("sortSelect").value;
  q += "&order=" + document.getElementById("orderSelect").value;
  var activeFilter = document.querySelector(".chip.active");
  if (activeFilter) q += "&filter=" + activeFilter.getAttribute("data-filter");
  api("/api/admin/users?" + q).then(function(users) {
    var tbody = document.getElementById("userTableBody");
    if (!users.length) {
      tbody.innerHTML = "<tr><td colspan='12' style='text-align:center;padding:30px;color:#555'>No users found</td></tr>";
      return;
    }
    var h = "";
    var abilNames = { 0: "None", 1: "Double", 2: "Jetpack", 3: "Roof" };
    users.forEach(function(u) {
      var email = u.email;
      var abils = (u.gameData.ownedAbilities || [0]).map(function(a) { return abilNames[a] || "?"; }).join(",");
      h += "<tr>" +
        "<td>" + esc(email) + "</td>" +
        "<td>" + esc(u.username || "-") + "</td>" +
        "<td>" + (u.verified ? '<span class="badge badge-green">Yes</span>' : '<span class="badge badge-red">No</span>') + "</td>" +
        "<td>" + (u.banned ? '<span class="badge badge-red">Banned</span>' : '<span class="badge badge-green">No</span>') + "</td>" +
        "<td>" + new Date(u.createdAt).toLocaleDateString() + "</td>" +
        "<td>" + (u.gameData.coins || 0) + "</td>" +
        "<td>" + (u.gameData.credits || 0) + "</td>" +
        "<td>" + (u.gameData.maxDistance || 0) + "</td>" +
        "<td>" + (u.gameData.runCount || 0) + "</td>" +
        "<td>" + esc(abils) + "</td>" +
        "<td>" + esc(u.gameData.selectedCharacter || "runner") + "</td>" +
        '<td><div class="actions">' +
        '<button class="btn btn-sm btn-blue" data-action="edit" data-email="' + escAttr(email) + '">Edit</button>' +
        '<button class="btn btn-sm btn-green" data-action="verify" data-email="' + escAttr(email) + '">Verify</button>' +
        '<button class="btn btn-sm btn-red" data-action="ban" data-email="' + escAttr(email) + '">Ban</button>' +
        '<button class="btn btn-sm btn-orange" data-action="reset-pw" data-email="' + escAttr(email) + '">Reset PW</button>' +
        '<button class="btn btn-sm btn-purple" data-action="grant-abil" data-email="' + escAttr(email) + '">Grant Abil</button>' +
        '<button class="btn btn-sm btn-red" data-action="delete" data-email="' + escAttr(email) + '">Delete</button>' +
        "</div></td></tr>";
    });
    tbody.innerHTML = h;
  });
}

function editUser(email) {
  currentEditEmail = email;
  document.getElementById("modalTitle").textContent = "Edit: " + esc(email);
  api("/api/admin/user?email=" + encodeURIComponent(email)).then(function(u) {
    document.getElementById("editUsername").value = u.username || "";
    document.getElementById("editCoins").value = u.gameData.coins || 0;
    document.getElementById("editCredits").value = u.gameData.credits || 0;
    document.getElementById("editRunCount").value = u.gameData.runCount || 0;
    document.getElementById("editMaxDistance").value = u.gameData.maxDistance || 0;
    document.getElementById("editMaxEasy").value = u.gameData.maxEasy || 0;
    document.getElementById("editMaxMedium").value = u.gameData.maxMedium || 0;
    document.getElementById("editMaxHard").value = u.gameData.maxHard || 0;
    document.getElementById("editEquippedAbility").value = u.gameData.equippedAbility || 0;
    document.getElementById("editOwnedAbilities").value = (u.gameData.ownedAbilities || [0]).join(",");
    document.getElementById("editOwnedCharacters").value = (u.gameData.ownedCharacters || ["runner"]).join(",");
    document.getElementById("editSelectedCharacter").value = u.gameData.selectedCharacter || "runner";
    document.getElementById("editModal").style.display = "flex";
  });
}

function userAction(email, action, confirmed) {
  var body = { email: email, action: action };
  if (confirmed) body.confirm = true;
  api("/api/admin/user/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(function(r) {
    if (r.error) { msg(esc(r.error), "err"); } else { msg(action + " done for " + email, "ok"); loadUsers(); }
  });
}

function resetPW(email) {
  if (!confirm("Reset password for " + email + "?")) return;
  var p = prompt("New password for " + email);
  if (!p || p.length < 4) return;
  api("/api/admin/user/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, action: "reset-password", confirm: true, newPassword: p })
  }).then(function(r) {
    if (r.error) { msg(esc(r.error), "err"); } else { msg("PW reset for " + email, "ok"); }
  });
}

function delUser(email) {
  if (!confirm("Delete " + email + "?")) return;
  api("/api/admin/user/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, action: "delete", confirm: true })
  }).then(function(r) {
    if (r.error) { msg(esc(r.error), "err"); } else { msg("Deleted " + email, "ok"); loadUsers(); }
  });
}

// ── Tab Switching ──
document.querySelectorAll(".tab").forEach(function(t) {
  t.addEventListener("click", function() {
    document.querySelectorAll(".tab").forEach(function(x) { x.classList.remove("active"); });
    this.classList.add("active");
    document.querySelectorAll(".section").forEach(function(s) { s.classList.remove("active"); });
    document.getElementById("tab-" + this.getAttribute("data-tab")).classList.add("active");

    // PVP tab
    if (this.getAttribute("data-tab") === "pvp") {
      document.getElementById("pvpContent").innerHTML = '<p class="loader">Loading</p>';
      api("/api/admin/pvp/status").then(function(d) {
        if (d.error) {
          document.getElementById("pvpContent").innerHTML = '<p style="color:#ef9a9a">PVP Server: ' + esc(d.error) + "</p>";
          return;
        }
        var h = '<p style="margin-bottom:10px;font-size:14px;color:#aaa">Total Rooms: ' + esc(d.totalRooms) + " | Players: " + esc(d.totalPlayers) + "</p>";
        if (d.roomsList && d.roomsList.length) {
          h += '<div class="pvp-grid">';
          d.roomsList.forEach(function(r) {
            h += '<div class="pvp-card"><h3>' + esc(r.name) + "</h3>" +
              '<div class="info">Host: ' + esc(r.host) + "</div>" +
              '<div class="info">Players: ' + r.playerCount + "/" + r.maxPlayers + "</div>" +
              '<div class="info">Status: ' + esc(r.status) + "</div>" +
              '<div class="info">ID: ' + esc(r.id) + "</div></div>";
          });
          h += "</div>";
        } else {
          h += '<p style="color:#555">No active rooms</p>';
        }
        document.getElementById("pvpContent").innerHTML = h;
      });
    }

    // Audit tab
    if (this.getAttribute("data-tab") === "audit") {
      api("/api/admin/audit?limit=200").then(function(log) {
        var tb = document.getElementById("auditBody");
        if (!log.length) {
          tb.innerHTML = "<tr><td colspan='4' style='text-align:center;padding:30px;color:#555'>No audit entries</td></tr>";
          return;
        }
        var h = "";
        log.slice().reverse().forEach(function(e) {
          h += "<tr><td>" + esc(new Date(e.time).toLocaleString()) + "</td><td>" + esc(e.admin) + "</td><td>" + esc(e.action) + "</td><td>" + esc(e.target || "-") + "</td></tr>";
        });
        tb.innerHTML = h;
      });
    }
  });
});

// ── Stats ──
api("/api/admin/stats").then(function(s) {
  document.getElementById("statsRow").innerHTML =
    '<div class="stat-card"><div class="value">' + esc(s.totalUsers) + '</div><div class="label">Total Users</div></div>' +
    '<div class="stat-card"><div class="value">' + esc(s.verifiedUsers) + '</div><div class="label">Verified</div></div>' +
    '<div class="stat-card"><div class="value">' + esc(s.bannedUsers) + '</div><div class="label">Banned</div></div>' +
    '<div class="stat-card"><div class="value">' + esc(s.todayRegistrations) + '</div><div class="label">Today Reg</div></div>' +
    '<div class="stat-card"><div class="value">' + esc(s.totalRuns) + '</div><div class="label">Total Runs</div></div>' +
    '<div class="stat-card"><div class="value">' + esc(s.highestDistance) + '</div><div class="label">Highest Dist</div></div>' +
    '<div class="stat-card"><div class="value">' + esc(s.totalCredits) + '</div><div class="label">Total Credits</div></div>' +
    '<div class="stat-card"><div class="value">' + esc(s.totalCoins) + '</div><div class="label">Total Coins</div></div>';
});

// ── Event: table action buttons ──
document.getElementById("userTableBody").addEventListener("click", function(e) {
  var btn = e.target.closest("button[data-action]");
  if (!btn) return;
  var action = btn.getAttribute("data-action");
  var email = btn.getAttribute("data-email");
  if (action === "edit") { editUser(email); }
  else if (action === "verify") { userAction(email, "verify", false); }
  else if (action === "ban") { if (!confirm("Ban " + email + "?")) return; userAction(email, "ban", true); }
  else if (action === "reset-pw") { resetPW(email); }
  else if (action === "grant-abil") { if (!confirm("Grant all abilities to " + email + "?")) return; userAction(email, "grant-all-abilities", true); }
  else if (action === "delete") { delUser(email); }
});

// ── Search / Sort / Filter events ──
document.getElementById("searchInput").addEventListener("input", loadUsers);
document.getElementById("sortSelect").addEventListener("change", loadUsers);
document.getElementById("orderSelect").addEventListener("change", loadUsers);
document.querySelectorAll(".chip").forEach(function(c) {
  c.addEventListener("click", function() {
    document.querySelectorAll(".chip").forEach(function(x) { x.classList.remove("active"); });
    this.classList.add("active");
    loadUsers();
  });
});

// ── Modal events ──
document.getElementById("cancelEditBtn").addEventListener("click", function() {
  document.getElementById("editModal").style.display = "none";
});
document.getElementById("saveEditBtn").addEventListener("click", function() {
  var body = {
    email: currentEditEmail,
    gameData: {
      coins: parseInt(document.getElementById("editCoins").value) || 0,
      credits: parseInt(document.getElementById("editCredits").value) || 0,
      runCount: parseInt(document.getElementById("editRunCount").value) || 0,
      maxDistance: parseInt(document.getElementById("editMaxDistance").value) || 0,
      maxEasy: parseInt(document.getElementById("editMaxEasy").value) || 0,
      maxMedium: parseInt(document.getElementById("editMaxMedium").value) || 0,
      maxHard: parseInt(document.getElementById("editMaxHard").value) || 0,
      equippedAbility: parseInt(document.getElementById("editEquippedAbility").value) || 0,
      ownedAbilities: document.getElementById("editOwnedAbilities").value.split(",").map(function(x) { return parseInt(x, 10); }).filter(function(x) { return !isNaN(x); }),
      ownedCharacters: document.getElementById("editOwnedCharacters").value.split(",").map(function(x) { return x.trim(); }).filter(Boolean),
      selectedCharacter: document.getElementById("editSelectedCharacter").value.trim() || "runner"
    }
  };
  api("/api/admin/user/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(function(r) {
    if (r.error) { msg(esc(r.error), "err"); } else { msg("Saved " + currentEditEmail, "ok"); document.getElementById("editModal").style.display = "none"; loadUsers(); }
  });
});

// ── Initial load ──
loadUsers();
