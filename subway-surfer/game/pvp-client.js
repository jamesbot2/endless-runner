// ===== ENDLESS RUNNER - PVP Client =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};

    var ws = null;
    var roomId = null;
    var heartbeatTimer = null;
    var snapshotTimer = null;
    var snapInterval = 50; // 20 Hz
    var RECONNECT_DELAY = 3000;

    // ─── Bridge state ──────────────────────────────────────────────────────────
    var _rooms = [];
    var _currentRoom = null;
    var _opponents = {}; // userId -> { userId, username, snapshot, mesh }

    // ─── Public bridges ────────────────────────────────────────────────────────

    SG.setPvpRoomsFromServer = function(rooms) {
        _rooms = rooms || [];
    };

    SG.setPvpRoomFromServer = function(room) {
        _currentRoom = room;
    };

    SG.upsertPvpOpponentFromServer = function(data) {
        if (!data || !data.userId) return;
        _opponents[data.userId] = {
            userId: data.userId,
            username: data.username,
            snapshot: data.snapshot,
            mesh: _opponents[data.userId] ? _opponents[data.userId].mesh : null,
        };
    };

    SG.getLocalPvpSnapshot = function() {
        if (!SG.state.started || SG.state.gameOver) return null;
        return {
            lane: SG.state.currentLane,
            distance: Math.floor(SG.state.score),
            isJumping: SG.state.isJumping,
            isRolling: SG.state.isRolling,
            alive: !SG.state.gameOver,
            spectating: false,
            characterId: 'runner',
            timestamp: Date.now(),
        };
    };

    // ─── Connection ────────────────────────────────────────────────────────────

    function getWsUrl() {
        var host = window.location.hostname || '35.212.200.85';
        return 'ws://' + host + ':3001';
    }

    SG.connectPvp = function() {
        if (ws && ws.readyState === WebSocket.OPEN) return;
        if (!SG.account || !SG.account.token) return;

        var url = getWsUrl();
        try {
            ws = new WebSocket(url);
        } catch (e) {
            console.log('[PVP] Connection failed:', e.message);
            setTimeout(SG.connectPvp, RECONNECT_DELAY);
            return;
        }

        ws.onopen = function() {
            console.log('[PVP] Connected');
            // Authenticate
            sendMsg({ type: 'hello', token: SG.account.token });
        };

        ws.onmessage = function(e) {
            try {
                var msg = JSON.parse(e.data);
                handleMessage(msg);
            } catch (err) {
                console.log('[PVP] Bad message:', e.data);
            }
        };

        ws.onclose = function(e) {
            console.log('[PVP] Disconnected (code=' + e.code + ')');
            ws = null;
            stopSnapshotLoop();
            if (e.code !== 4001 && e.code !== 1000) {
                setTimeout(SG.connectPvp, RECONNECT_DELAY);
            }
        };

        ws.onerror = function() {
            // close fires after error
        };
    };

    SG.disconnectPvp = function() {
        if (ws) {
            ws.close(1000);
            ws = null;
        }
        stopSnapshotLoop();
        _rooms = [];
        _currentRoom = null;
        _opponents = {};
        roomId = null;
        if (SG.pvpLobbyOverlay) SG.pvpLobbyOverlay.style.display = 'none';
        if (SG.pvpRoomOverlay) SG.pvpRoomOverlay.style.display = 'none';
    };

    function sendMsg(data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }

    // ─── Message handler ───────────────────────────────────────────────────────

    function handleMessage(msg) {
        switch (msg.type) {
            case 'helloOk':
                SG.pvpConnected = true;
                console.log('[PVP] Authenticated as', msg.username);
                break;

            case 'error':
                console.log('[PVP] Server error:', msg.error);
                if (SG.pvpStatusEl) SG.pvpStatusEl.textContent = '⚠ ' + msg.error;
                break;

            case 'roomList':
                SG.setPvpRoomsFromServer(msg.rooms);
                if (SG.renderPvpLobby) SG.renderPvpLobby();
                break;

            case 'roomUpdate':
                SG.setPvpRoomFromServer(msg.room);
                if (SG.renderPvpRoom) SG.renderPvpRoom();
                if (msg.room.players.some(function(p) { return p.userId === SG.account.email; })) {
                    roomId = msg.room.roomId;
                }
                break;

            case 'invite':
                if (SG.showPvpInvite) SG.showPvpInvite(msg);
                break;

            case 'inviteSent':
                if (SG.pvpStatusEl) SG.pvpStatusEl.textContent = '✓ Invite sent';
                break;

            case 'inviteResponse':
                if (SG.onInviteResponse) SG.onInviteResponse(msg);
                break;

            case 'matchStart':
                console.log('[PVP] Match started:', msg.roomId);
                SG.pvpMatchInfo = msg;
                roomId = msg.roomId;
                if (SG.onPvpMatchStart) SG.onPvpMatchStart(msg);
                break;

            case 'snapshotBatch':
                updateOpponents(msg.players);
                break;

            case 'matchEnd':
                console.log('[PVP] Match ended');
                stopSnapshotLoop();
                if (SG.onPvpMatchEnd) SG.onPvpMatchEnd(msg);
                break;
        }
    }

    // ─── Opponent tracking ─────────────────────────────────────────────────────

    function updateOpponents(players) {
        if (!players) return;
        for (var i = 0; i < players.length; i++) {
            var p = players[i];
            SG.upsertPvpOpponentFromServer(p);
            updateOpponentMesh(p);
        }
    }

    function updateOpponentMesh(data) {
        if (!data.snapshot) return;
        if (!_opponents[data.userId]) {
            _opponents[data.userId] = { userId: data.userId, username: data.username, snapshot: data.snapshot, mesh: null };
        }
        var opp = _opponents[data.userId];
        opp.snapshot = data.snapshot;

        // Create cube mesh if needed
        if (!opp.mesh && SG.scene) {
            var geo = new THREE.BoxGeometry(0.6, 1.2, 0.6);
            var colors = [0x00ff88, 0xff8800, 0x4488ff, 0xff44aa];
            var colorIdx = Object.keys(_opponents).indexOf(data.userId) % colors.length;
            var mat = new THREE.MeshStandardMaterial({ color: colors[colorIdx], emissive: colors[colorIdx], emissiveIntensity: 0.3 });
            opp.mesh = new THREE.Mesh(geo, mat);
            SG.scene.add(opp.mesh);
        }

        // Position the mesh on the track
        if (opp.mesh) {
            var lane = data.snapshot.lane !== undefined ? data.snapshot.lane : 1;
            var x = SG.LANE_POSITIONS ? SG.LANE_POSITIONS[lane] : (lane - 1) * 2.2;
            var z = -(data.snapshot.distance || 0); // negative Z = ahead
            var y = data.snapshot.isRolling ? 0 : data.snapshot.isJumping ? 1.5 : 0.15;
            opp.mesh.position.set(x, y, z);
            opp.mesh.visible = !data.snapshot.spectating;

            // Label
            if (!opp.label && SG.makeTextLabel) {
                opp.label = SG.makeTextLabel(data.username, 0.3);
                if (opp.label && opp.mesh) opp.mesh.add(opp.label);
            }
        }
    }

    SG.getPvpOpponents = function() {
        return _opponents;
    };

    SG.removePvpOpponentMeshes = function() {
        for (var id in _opponents) {
            if (_opponents[id].mesh && SG.scene) {
                SG.scene.remove(_opponents[id].mesh);
            }
        }
        _opponents = {};
    };

    // ─── Snapshot send loop ────────────────────────────────────────────────────

    function startSnapshotLoop() {
        stopSnapshotLoop();
        snapshotTimer = setInterval(function() {
            if (!roomId || !ws || ws.readyState !== WebSocket.OPEN) return;
            var snap = SG.getLocalPvpSnapshot();
            if (!snap) return;
            sendMsg({ type: 'snapshot', roomId: roomId, snapshot: snap });
        }, snapInterval);
    }

    function stopSnapshotLoop() {
        if (snapshotTimer) {
            clearInterval(snapshotTimer);
            snapshotTimer = null;
        }
    }

    // ─── Room actions ──────────────────────────────────────────────────────────

    SG.pvpListRooms = function() {
        sendMsg({ type: 'listRooms' });
    };

    SG.pvpCreateRoom = function(roomName) {
        sendMsg({ type: 'createRoom', roomName: roomName || 'Sprint' });
    };

    SG.pvpJoinRoom = function(id) {
        sendMsg({ type: 'joinRoom', roomId: id });
    };

    SG.pvpLeaveRoom = function() {
        sendMsg({ type: 'leaveRoom' });
        roomId = null;
        _currentRoom = null;
        if (SG.renderPvpLobby) SG.renderPvpLobby();
    };

    SG.pvpReady = function(ready) {
        if (!roomId) return;
        sendMsg({ type: 'ready', roomId: roomId, ready: ready });
    };

    SG.pvpStart = function() {
        if (!roomId) return;
        sendMsg({ type: 'start', roomId: roomId });
    };

    SG.pvpInvite = function(toUserId) {
        if (!roomId) return;
        sendMsg({ type: 'invite', roomId: roomId, toUserId: toUserId });
    };

    SG.pvpInviteResponse = function(rid, accept) {
        sendMsg({ type: 'inviteResponse', roomId: rid, accept: accept });
    };

    // ─── Match lifecycle hooks ────────────────────────────────────────────────

    SG.onPvpMatchStart = function(matchData) {
        // Hide overlays, start game
        if (SG.pvpRoomOverlay) SG.pvpRoomOverlay.style.display = 'none';
        if (SG.pvpLobbyOverlay) SG.pvpLobbyOverlay.style.display = 'none';
        SG.removePvpOpponentMeshes();
        startSnapshotLoop();
        // Start the actual game
        SG.startGame();
    };

    SG.onPvpMatchEnd = function(endData) {
        stopSnapshotLoop();
        // Show match results
        SG.gameOver(); // TODO: overlay results instead
    };

    // ─── Text label helper ─────────────────────────────────────────────────────

    SG.makeTextLabel = function(text, size) {
        // For Three.js r128, use a sprite with canvas texture
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.roundRect ? ctx.roundRect(0, 0, 256, 64, 8) : ctx.fillRect(0, 0, 256, 64);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 128, 32);
            var tex = new THREE.CanvasTexture(canvas);
            var mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
            var sprite = new THREE.Sprite(mat);
            sprite.scale.set(size * 2, size * 0.5, 1);
            sprite.position.set(0, size * 1.2, 0);
            return sprite;
        } catch (e) {
            return null;
        }
    };

})();
