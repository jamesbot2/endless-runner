// ===== ENDLESS RUNNER - PVP Client (WebSocket bridge) =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var ws = null;
    var roomId = null;
    var snapTimer = null;
    var active = false;
    var authenticated = false;
    var pending = [];

    SG.pvpRooms = [];

    function apiBase() {
        return SG.apiBaseUrl ||
            (window.__ENDLESS_RUNNER_CONFIG__ && window.__ENDLESS_RUNNER_CONFIG__.API_BASE_URL) ||
            (window.__SUBWAY_CONFIG__ && window.__SUBWAY_CONFIG__.API_BASE_URL) ||
            'http://35.212.200.85:3000';
    }

    function wsUrl() {
        var base = apiBase();
        var host = base.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
        return base.indexOf('https://') === 0 ? 'wss://' + host + '/pvp' : 'ws://' + host + ':3001/pvp';
    }

    function setStatus(state) {
        if (SG.updatePvpStatusBar) SG.updatePvpStatusBar(state);
    }

    function send(data) {
        if (ws && ws.readyState === WebSocket.OPEN && authenticated) {
            ws.send(JSON.stringify(data));
        } else {
            pending.push(data);
        }
    }

    function sendNow(data) {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
    }

    function flushPending() {
        var items = pending.splice(0);
        for (var i = 0; i < items.length; i++) send(items[i]);
    }

    function stopSnapshots() {
        active = false;
        if (snapTimer) {
            clearInterval(snapTimer);
            snapTimer = null;
        }
    }

    function startSnapshots() {
        stopSnapshots();
        active = true;
        snapTimer = setInterval(function() {
            if (!roomId || !ws || ws.readyState !== WebSocket.OPEN) {
                active = false;
                return;
            }
            var snapshot = SG.getLocalPvpSnapshot ? SG.getLocalPvpSnapshot() : null;
            if (snapshot) send({ type: 'match:snapshot', roomId: roomId, snapshot: snapshot });
        }, 50);
    }

    SG.getLocalPvpSnapshot = function() {
        if (!SG.state || (!SG.state.started && !SG.state.pvpMode) || (!active && !SG.state.pvpMode)) return null;
        return {
            lane: typeof SG.state.currentLane === 'number' ? SG.state.currentLane : 1,
            distance: Math.floor(SG.state.score || 0),
            isJumping: !!SG.state.isJumping,
            isRolling: !!SG.state.isRolling,
            alive: !SG.state.gameOver && !SG.state.pvpLocalDead,
            spectating: !!SG.state.pvpSpectating,
            characterId: SG.state.selectedCharacter || 'runner',
            timestamp: Date.now()
        };
    };

    SG.connectPvp = function() {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
        if (!SG.account || !SG.account.token) {
            setStatus('offline');
            return;
        }
        try {
            ws = new WebSocket(wsUrl());
        } catch(e) {
            setStatus('reconnecting');
            setTimeout(SG.connectPvp, 3000);
            return;
        }
        setStatus('reconnecting');
        ws.onopen = function() {
            sendNow({ type: 'hello', token: SG.account.token });
        };
        ws.onmessage = function(evt) {
            try { handleMessage(JSON.parse(evt.data)); } catch(e) {}
        };
        ws.onclose = function(evt) {
            ws = null;
            authenticated = false;
            stopSnapshots();
            if (evt.code !== 4001 && evt.code !== 1000) {
                setStatus('reconnecting');
                setTimeout(SG.connectPvp, 3000);
            } else {
                setStatus('offline');
            }
        };
    };

    SG.disconnectPvp = function() {
        stopSnapshots();
        active = false;
        authenticated = false;
        pending = [];
        roomId = null;
        SG.pvpRooms = [];
        if (SG.state) SG.state.pvpRoom = null;
        if (ws) {
            ws.close(1000);
            ws = null;
        }
        setStatus('offline');
    };

    SG.leavePvpRoom = function() {
        if (roomId) send({ type: 'room:leave', roomId: roomId });
        roomId = null;
        pending = [];
        stopSnapshots();
        if (SG.state) {
            SG.state.pvpRoom = null;
            SG.state.pvpResult = null;
        }
        if (SG.setPvpRoomsFromServer) SG.setPvpRoomsFromServer([]);
        if (SG.renderPvpLobby) SG.renderPvpLobby();
        send({ type: 'room:list' });
    };

    function markLocalPlayer(room) {
        if (!room || !SG.account) return room;
        SG.state.pvpLocalPlayerId = SG.account.email;
        for (var i = 0; i < (room.players || []).length; i++) {
            if (room.players[i].id === SG.account.email) room.players[i].local = true;
        }
        return room;
    }

    function handleMessage(msg) {
        switch (msg.type) {
            case 'hello:ok':
                authenticated = true;
                setStatus('online');
                SG.state.pvpLocalPlayerId = msg.userId;
                flushPending();
                send({ type: 'room:list' });
                break;
            case 'error':
                console.log('[PVP]', msg.error);
                break;
            case 'room:list':
                if (SG.setPvpRoomsFromServer) SG.setPvpRoomsFromServer(msg.rooms || []);
                break;
            case 'room:update':
                markLocalPlayer(msg.room);
                if (msg.room && SG.account && (msg.room.players || []).some(function(p) { return p.id === SG.account.email; })) {
                    roomId = msg.room.id;
                }
                if (SG.setPvpRoomFromServer) SG.setPvpRoomFromServer(msg.room);
                break;
            case 'room:left':
                roomId = null;
                if (SG.state) SG.state.pvpRoom = null;
                if (SG.renderPvpLobby) SG.renderPvpLobby();
                send({ type: 'room:list' });
                break;
            case 'match:start':
                roomId = (msg.room && msg.room.id) || msg.roomId || roomId;
                markLocalPlayer(msg.room);
                SG.state.pvpSeed = msg.seed || '';
                if (SG.setPvpRoomFromServer) SG.setPvpRoomFromServer(msg.room || msg);
                if (SG.state.pvpRoom) SG.state.pvpRoom.localHost = true;
                stopSnapshots();
                startSnapshots();
                if (typeof SG._originalStartPvpRace === 'function') SG._originalStartPvpRace();
                break;
            case 'match:snapshot':
                if (msg.players && Array.isArray(msg.players)) {
                    for (var i = 0; i < msg.players.length; i++) upsertOpponent(msg.players[i]);
                } else {
                    upsertOpponent(msg);
                }
                break;
            case 'match:dead':
                applyDead(msg);
                break;
            case 'match:finish':
                stopSnapshots();
                active = false;
                SG.state.pvpRoom = null;
                SG.state.pvpResult = msg.ranking || [];
                showServerRanking(msg.ranking || []);
                break;
        }
    }

    function upsertOpponent(data) {
        if (!data || (!data.id && !data.playerId)) return;
        var id = data.id || data.playerId;
        var list = SG.state.pvpOpponents || [];
        for (var i = 0; i < list.length; i++) {
            var o = list[i];
            if (o.id === id || o.name === data.name) {
                o.distance = data.distance || 0;
                o.lane = typeof data.lane === 'number' ? data.lane : o.lane;
                o.isJumping = !!data.isJumping;
                o.isRolling = !!data.isRolling;
                o.alive = data.alive !== false;
                o.characterId = data.characterId || o.characterId || 'runner';
                return;
            }
        }
    }

    function applyDead(msg) {
        var list = SG.state.pvpOpponents || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === msg.playerId || list[i].name === msg.name) list[i].alive = false;
        }
        if (SG.showPvpDeathFeed) SG.showPvpDeathFeed((msg.name || 'Player') + ' is out');
    }

    function showServerRanking(ranking) {
        if (!SG.gameOverEl) return;
        SG.state.gameOver = true;
        if (SG.finalScoreEl) SG.finalScoreEl.textContent = Math.floor(SG.state.score || 0);
        var old = SG.gameOverEl.querySelector('.pvp-ranks');
        if (old) old.remove();
        var html = '';
        for (var i = 0; i < ranking.length; i++) {
            html += '<div style="color:#fff;font-size:14px;margin:4px 0">' + (i + 1) + '. ' + ranking[i].name + ' - ' + ranking[i].distance + 'm</div>';
        }
        var div = document.createElement('div');
        div.className = 'pvp-ranks';
        div.innerHTML = html;
        SG.gameOverEl.appendChild(div);
        SG.gameOverEl.classList.add('visible');
    }

    setTimeout(function() {
        var originalShow = SG.showPvpLobby;
        var originalToggleReady = SG.togglePvpReady;
        var originalGameOver = SG.gameOver;
        SG._originalStartPvpRace = SG.startPvpRace;

        SG.showPvpLobby = function() {
            SG.connectPvp();
            if (originalShow) originalShow.apply(this, arguments);
            setTimeout(function() { send({ type: 'room:list' }); }, 250);
        };

        SG.createLocalPvpRoom = function() {
            SG.connectPvp();
            send({ type: 'room:create', name: 'Cyber Sprint', characterId: SG.state.selectedCharacter || 'runner' });
        };

        SG.joinLocalPvpRoom = function(id) {
            SG.connectPvp();
            send({ type: 'room:join', roomId: id, characterId: SG.state.selectedCharacter || 'runner' });
        };

        SG.togglePvpReady = function() {
            if (roomId && SG.state.pvpRoom) {
                var mine = null;
                for (var i = 0; i < SG.state.pvpRoom.players.length; i++) {
                    if (SG.state.pvpRoom.players[i].local) mine = SG.state.pvpRoom.players[i];
                }
                var ready = mine ? !mine.ready : true;
                send({ type: 'room:ready', roomId: roomId, ready: ready });
                if (mine) mine.ready = ready;
                if (SG.renderPvpLobby) SG.renderPvpLobby();
                return;
            }
            if (originalToggleReady) originalToggleReady.apply(this, arguments);
        };

        SG.startPvpRace = function() {
            if (roomId) {
                send({ type: 'room:start', roomId: roomId });
                return;
            }
            if (SG._originalStartPvpRace) SG._originalStartPvpRace.apply(this, arguments);
        };

        SG.gameOver = function() {
            if (active && roomId) send({ type: 'match:dead', roomId: roomId, distance: Math.floor(SG.state.score || 0) });
            if (originalGameOver) originalGameOver.apply(this, arguments);
        };

        if (SG.renderPvpLobby && SG.pvpOverlay && SG.pvpOverlay.style.display !== 'none') SG.renderPvpLobby();
    }, 0);
})();
