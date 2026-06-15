// ===== ENDLESS RUNNER - PVP UI =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};

    // ─── Inject PVP button into main menu ──────────────────────────────────────

    SG._pvpInjectMenuBtn = function() {
        // Add PVP button next to SHOP
        var shopBtn = document.getElementById('shop-btn-menu');
        if (!shopBtn || document.getElementById('pvp-btn-menu')) return;

        var pvpBtn = document.createElement('div');
        pvpBtn.id = 'pvp-btn-menu';
        pvpBtn.className = 'menu-btn';
        pvpBtn.style.cssText = 'margin-top:10px;font-size:14px;padding:8px 16px;';
        pvpBtn.textContent = '🎮 PVP';
        pvpBtn.onclick = function() { SG.pvpShowLobby(); };
        shopBtn.parentNode.insertBefore(pvpBtn, shopBtn.nextSibling);
    };

    // ─── PVP Lobby Overlay ─────────────────────────────────────────────────────

    SG.pvpShowLobby = function() {
        if (!SG.account || !SG.account.token) {
            if (SG.pvpStatusEl) SG.pvpStatusEl.textContent = '⚠ Login first';
            return;
        }

        if (!SG.pvpLobbyOverlay) {
            SG.pvpLobbyOverlay = document.createElement('div');
            SG.pvpLobbyOverlay.id = 'pvp-lobby-overlay';
            SG.pvpLobbyOverlay.className = 'overlay';
            SG.pvpLobbyOverlay.onclick = function(e) {
                if (e.target === SG.pvpLobbyOverlay) SG.pvpLobbyOverlay.style.display = 'none';
            };
            SG.pvpLobbyOverlay.innerHTML =
                '<div class="menu-content" style="max-width:400px;">' +
                    '<h1 class="menu-title" style="font-size:24px;">🎮 PVP LOBBY</h1>' +
                    '<div id="pvp-status" style="color:#aaa;font-size:12px;margin:4px 0;">Connecting...</div>' +
                    '<div style="display:flex;gap:6px;margin:8px 0;">' +
                        '<input id="pvp-room-name" placeholder="Room name" maxlength="32" ' +
                        'style="flex:1;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);' +
                        'background:rgba(0,0,0,0.4);color:#fff;font-size:13px;">' +
                        '<button class="diff-btn" onclick="SG.pvpCreateRoom(document.getElementById(\'pvp-room-name\').value)" ' +
                        'style="padding:8px 16px;">CREATE</button>' +
                    '</div>' +
                    '<div id="pvp-refresh" class="pvp-link" onclick="SG.pvpListRooms()" ' +
                    'style="color:#ffaa00;cursor:pointer;font-size:12px;margin:4px 0;text-align:right;">↻ Refresh</div>' +
                    '<div id="pvp-room-list" style="max-height:300px;overflow-y:auto;margin:8px 0;">' +
                        '<div style="color:#666;font-size:13px;text-align:center;padding:20px;">No rooms yet</div>' +
                    '</div>' +
                    '<div class="menu-btn modal-close-btn" onclick="SG.pvpLobbyOverlay.style.display=\'none\'">CLOSE</div>' +
                '</div>';
            document.body.appendChild(SG.pvpLobbyOverlay);
            SG.pvpStatusEl = document.getElementById('pvp-status');
        }

        SG.pvpLobbyOverlay.style.display = 'flex';
        SG.pvpStatusEl.textContent = 'Connecting...';
        SG.connectPvp();
        SG.pvpListRooms();
    };

    SG.renderPvpLobby = function() {
        var listEl = document.getElementById('pvp-room-list');
        if (!listEl) return;

        var rooms = window.__SG._pvpRoomsCache || [];
        // Read from SG bridge
        if (typeof SG.setPvpRoomsFromServer === 'function') {
            // SG stores them internally
        }

        if (!rooms || rooms.length === 0) {
            listEl.innerHTML = '<div style="color:#666;font-size:13px;text-align:center;padding:20px;">No public rooms</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < rooms.length; i++) {
            var r = rooms[i];
            html += '<div class="pvp-room-entry" style="display:flex;justify-content:space-between;align-items:center;' +
                'padding:8px 10px;margin:4px 0;background:rgba(0,0,0,0.3);border-radius:6px;">' +
                '<div><div style="font-size:14px;color:#fff;">' + escapeHtml(r.name || 'Room') + '</div>' +
                '<div style="font-size:11px;color:#888;">' + (r.playerCount || 0) + '/' + r.maxPlayers + ' players</div></div>' +
                '<button class="diff-btn" onclick="SG.pvpJoinRoom(\'' + r.roomId + '\')" style="padding:6px 14px;font-size:12px;">JOIN</button>' +
                '</div>';
        }
        listEl.innerHTML = html;
    };

    // Helper to store room list from bridge
    var origSetPvpRooms = SG.setPvpRoomsFromServer;
    SG.setPvpRoomsFromServer = function(rooms) {
        window.__SG._pvpRoomsCache = rooms || [];
        if (origSetPvpRooms) origSetPvpRooms(rooms);
    };

    // ─── PVP Room Overlay ──────────────────────────────────────────────────────

    SG.renderPvpRoom = function() {
        var room = window.__SG._pvpRoomCache;
        if (!room) return;

        if (!SG.pvpRoomOverlay) {
            SG.pvpRoomOverlay = document.createElement('div');
            SG.pvpRoomOverlay.id = 'pvp-room-overlay';
            SG.pvpRoomOverlay.className = 'overlay';
            SG.pvpRoomOverlay.innerHTML =
                '<div class="menu-content" id="pvp-room-content" style="max-width:360px;"></div>';
            document.body.appendChild(SG.pvpRoomOverlay);
        }

        var myId = SG.account ? SG.account.email : '';
        var isHost = room.hostId === myId;
        var allReady = room.players.length > 0 && room.players.every(function(p) { return p.ready; });
        var canStart = isHost && allReady && room.players.length >= 2;

        var html = '<h1 class="menu-title" style="font-size:22px;">' + escapeHtml(room.roomName) + '</h1>';
        html += '<div class="pvp-players" style="margin:10px 0;">';

        for (var i = 0; i < room.players.length; i++) {
            var p = room.players[i];
            var isMe = p.userId === myId;
            var name = isMe ? '⭐ ' + escapeHtml(p.username) : escapeHtml(p.username);
            var readyClass = p.ready ? 'color:#4CAF50;' : 'color:#888;';
            html += '<div style="display:flex;justify-content:space-between;padding:6px 8px;' +
                'background:rgba(0,0,0,0.3);border-radius:4px;margin:3px 0;">';
            html += '<span style="font-size:14px;' + (isMe ? 'color:#FFD700;font-weight:bold;' : 'color:#fff;') + '">' + name + '</span>';
            if (p.userId === room.hostId) html += '<span style="color:#ff6600;font-size:11px;">👑 HOST</span>';
            html += '<span style="font-size:13px;' + readyClass + '">' + (p.ready ? '✓ READY' : '⋯ WAITING') + '</span>';
            html += '</div>';
        }
        html += '</div>';

        // Controls
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:10px 0;">';

        // Ready toggle
        var myPlayer = null;
        for (var j = 0; j < room.players.length; j++) {
            if (room.players[j].userId === myId) { myPlayer = room.players[j]; break; }
        }
        var isReady = myPlayer ? myPlayer.ready : false;
        html += '<button class="diff-btn" onclick="SG.pvpReady(' + (!isReady) + ')" ' +
            (isReady ? 'style="background:rgba(76,175,80,0.3);border-color:#4CAF50;color:#4CAF50;"' : '') + '>' +
            (isReady ? '✓ READY' : 'READY') + '</button>';

        // Start (host only)
        if (isHost) {
            html += '<button class="diff-btn" onclick="SG.pvpStart()" ' +
                (canStart ? 'style="border-color:#ff6600;color:#ff6600;"' : 'disabled style="opacity:0.4;"') + '>START</button>';
        }

        // Leave
        html += '<button class="diff-btn" onclick="SG.pvpLeaveRoom()" style="border-color:#ff4444;color:#ff6666;">LEAVE</button>';
        html += '</div>';

        // Invite section
        if (isHost && room.players.length < 3) {
            html += '<div style="margin-top:6px;">' +
                '<div style="display:flex;gap:4px;">' +
                '<input id="pvp-invite-user" placeholder="User email to invite" ' +
                'style="flex:1;padding:6px;border-radius:4px;border:1px solid rgba(255,255,255,0.2);' +
                'background:rgba(0,0,0,0.4);color:#fff;font-size:12px;">' +
                '<button class="diff-btn" onclick="SG.pvpInvite(document.getElementById(\'pvp-invite-user\').value)" ' +
                'style="padding:6px 10px;font-size:12px;">INVITE</button></div></div>';
        }

        html += '<div id="pvp-room-status" style="color:#aaa;font-size:11px;margin:6px 0;"></div>';
        html += '<div class="menu-btn modal-close-btn" onclick="SG.pvpLeaveRoom()">LEAVE ROOM</div>';

        document.getElementById('pvp-room-content').innerHTML = html;
        SG.pvpRoomOverlay.style.display = 'flex';
        SG.pvpLobbyOverlay.style.display = 'none';
    };

    // Store room data from bridge
    var origSetPvpRoom = SG.setPvpRoomFromServer;
    SG.setPvpRoomFromServer = function(room) {
        window.__SG._pvpRoomCache = room;
        if (origSetPvpRoom) origSetPvpRoom(room);
    };

    // ─── Invite notification ──────────────────────────────────────────────────

    SG.showPvpInvite = function(invite) {
        if (!SG.pvpInviteOverlay) {
            SG.pvpInviteOverlay = document.createElement('div');
            SG.pvpInviteOverlay.id = 'pvp-invite-overlay';
            SG.pvpInviteOverlay.className = 'overlay';
            SG.pvpInviteOverlay.style.zIndex = '200';
            document.body.appendChild(SG.pvpInviteOverlay);
        }

        SG.pvpInviteOverlay.innerHTML =
            '<div class="menu-content" style="max-width:320px;">' +
                '<h1 class="menu-title" style="font-size:20px;">🎮 PVP Invite</h1>' +
                '<p style="color:#fff;margin:10px 0;">' + escapeHtml(invite.fromUsername) +
                ' invited you to a match!</p>' +
                '<div style="display:flex;gap:10px;justify-content:center;">' +
                '<button class="diff-btn" onclick="SG.pvpInviteResponse(\'' + invite.roomId + '\',true);' +
                'SG.pvpInviteOverlay.style.display=\'none\'" ' +
                'style="border-color:#4CAF50;color:#4CAF50;">✓ JOIN</button>' +
                '<button class="diff-btn" onclick="SG.pvpInviteResponse(\'' + invite.roomId + '\',false);' +
                'SG.pvpInviteOverlay.style.display=\'none\'" ' +
                'style="border-color:#ff4444;color:#ff6666;">✗ DECLINE</button></div>' +
            '</div>';
        SG.pvpInviteOverlay.style.display = 'flex';
    };

    // ─── Match results overlay ────────────────────────────────────────────────

    SG.showPvpResults = function(endData) {
        if (!SG.pvpResultsOverlay) {
            SG.pvpResultsOverlay = document.createElement('div');
            SG.pvpResultsOverlay.id = 'pvp-results-overlay';
            SG.pvpResultsOverlay.className = 'overlay';
            SG.pvpResultsOverlay.style.zIndex = '200';
            document.body.appendChild(SG.pvpResultsOverlay);
        }

        var myId = SG.account ? SG.account.email : '';
        var html = '<div class="menu-content" style="max-width:360px;">' +
            '<h1 class="menu-title" style="font-size:24px;">🏁 MATCH RESULTS</h1>';

        var ranking = endData.ranking || [];
        for (var i = 0; i < ranking.length; i++) {
            var p = ranking[i];
            var isMe = p.userId === myId;
            var medal = ['🥇', '🥈', '🥉'][i] || (i + 1) + '.';
            html += '<div style="display:flex;justify-content:space-between;padding:8px 10px;margin:4px 0;' +
                'background:rgba(0,0,0,0.3);border-radius:6px;' +
                (isMe ? 'border:1px solid #FFD700;' : '') + '">' +
                '<span>' + medal + ' ' + escapeHtml(p.username) + '</span>' +
                '<span style="color:#fff;">' + p.distance + 'm</span></div>';
        }

        html += '<div class="menu-btn" onclick="SG.pvpResultsOverlay.style.display=\'none\';SG.quitToMenu();" ' +
            'style="margin-top:12px;">RETURN TO MENU</div></div>';

        SG.pvpResultsOverlay.innerHTML = html;
        SG.pvpResultsOverlay.style.display = 'flex';
    };

    // Override matchEnd to show results
    var origOnPvpMatchEnd = SG.onPvpMatchEnd;
    SG.onPvpMatchEnd = function(endData) {
        if (origOnPvpMatchEnd) origOnPvpMatchEnd(endData);
        // Small delay so gameOver finishes
        setTimeout(function() { SG.showPvpResults(endData); }, 500);
    };

    // ─── Utility ──────────────────────────────────────────────────────────────

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Initialize: inject PVP button after UI is built
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { SG._pvpInjectMenuBtn(); });
    } else {
        SG._pvpInjectMenuBtn();
    }
    // Also try after a short delay in case UI builds async
    setTimeout(SG._pvpInjectMenuBtn, 500);
    setTimeout(SG._pvpInjectMenuBtn, 2000);

})();
