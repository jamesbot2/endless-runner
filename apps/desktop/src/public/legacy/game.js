// ===== ENDLESS RUNNER - Constants =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};

    SG.LANE_WIDTH = 2.2;
    SG.LANE_COUNT = 3;
    SG.LANE_POSITIONS = [-SG.LANE_WIDTH, 0, SG.LANE_WIDTH];
    SG.START_SPEED = 0.35;
    SG.MAX_SPEED = 2.25;
    SG.SPEED_INCREMENT = 0.0005;
    SG.SPEED_INCREMENT_BY_DIFFICULTY = [0.00012, 0.00016, 0.00022];
    SG.TRACK_SEGMENT_LENGTH = 24;
    SG.SPAWN_AHEAD = 200;
    SG.DESPAWN_BEHIND = 30;
    SG.GRAVITY = -0.012;
    SG.JUMP_VELOCITY = 0.23;
    SG.DOUBLE_JUMP_VELOCITY = 0.20;
    SG.PLAYER_Y = 0.15;
    SG.ROLL_HEIGHT = 0;
    SG.COIN_RADIUS = 0.35;
    SG.GROUND_WIDTH = SG.LANE_WIDTH * SG.LANE_COUNT + 1;
    SG.JETPACK_FUEL_MAX = 15;
    SG.JETPACK_COOLDOWN_MAX = 30;
    SG.JETPACK_LIFT = 0.04;
    SG.JETPACK_MAX_HEIGHT = 4.2;
    SG.ROOF_TOP_Y = 1.8;

    SG.getDifficultySpeedIncrement = function() {
        var d = SG.state ? SG.state.difficulty : 2;
        return SG.SPEED_INCREMENT_BY_DIFFICULTY[d] || SG.SPEED_INCREMENT_BY_DIFFICULTY[2] || SG.SPEED_INCREMENT;
    };

    SG.speedForLevel = function(level) {
        var clamped = Math.max(1, Math.min(50, parseInt(level, 10) || 1));
        return SG.START_SPEED + (SG.MAX_SPEED - SG.START_SPEED) * ((clamped - 1) / 49);
    };

    SG.getSpeedLevel = function(speed) {
        var s = typeof speed === 'number' ? speed : (SG.state ? SG.state.speed : SG.START_SPEED);
        return Math.max(1, Math.min(50, Math.floor((s - SG.START_SPEED) / (SG.MAX_SPEED - SG.START_SPEED) * 49) + 1));
    };

    SG.getDistanceRate = function(speed) {
        var s = typeof speed === 'number' ? speed : (SG.state ? SG.state.speed : SG.START_SPEED);
        return s * 10;
    };
})();


// ===== ENDLESS RUNNER - Game State =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};

    SG.state = {
        score: 0,
        coins: 0,
        speed: SG.START_SPEED || 0.35,
        gameOver: false,
        currentLane: 1,
        isJumping: false,
        isRolling: false,
        jumpVelocity: 0,
        targetLane: 1,
        laneLerp: 1,
        running: true,
        playerHeight: SG.PLAYER_Y || 0.15,
        targetPlayerHeight: SG.PLAYER_Y || 0.15,
        instantSpeedMps: 0,
        _speedSample: null,
        lastObstacleZ: 0,
        minObstacleGap: 30,
        obstacleTimer: 0,
        trackSegments: [],
        obstacles: [],
        coinObjects: [],
        gunPickups: [],
        coinObstacleMap: new Map(),
        buildings: [],
        particles: [],
        cameraShake: 0,
        gameTime: 0,
        scoreTimer: 0,
        instructionTimer: 8,
        hasStartedTouch: false,
        started: false,
        countdownActive: false,
        paused: false,
        startLaneX: 0,
        bestScore: parseInt(localStorage.getItem('subwayBest') || '0'),
        onRoof: false,
        rollEndTime: 0,
        firstPerson: false,
        difficulty: 2,
        homelander: false,
        cyberMode: false,
        laserTimer: 0,
        muted: false,
        musicVolume: parseFloat(localStorage.getItem('subwayMusicVol') || '0.5'),
        sfxVolume: parseFloat(localStorage.getItem('subwaySfxVol') || '0.8'),
        rollReleaseDelay: parseInt(localStorage.getItem('subwayRollReleaseDelay') || '200'),
        thirdPersonView: localStorage.getItem('subwayThirdPersonView') || 'near',
        firstPersonPitchDeg: Math.max(-5, Math.min(5, parseFloat(localStorage.getItem('subwayFirstPersonPitchDeg') || '1'))),
        pvpMode: false,
        pvpRoom: null,
        pvpCountdownSeconds: 10,
        pvpGhosts: [],
        pvpResult: null,
        lastPlayedCoin: 0,
        credits: parseInt(localStorage.getItem('subwayCredits') || '0'),
        totalCoins: parseInt(localStorage.getItem('subwayTotalCoins') || '0'),
        equippedAbility: 0,
        canDoubleJump: false,
        hasDoubleJumped: false,
        canJetpack: false,
        jetpackFuel: 0,
        jetpackCooldown: 0,
        activeGun: null,
        gunTimer: 0,
        gunShotCooldown: 0,
        gunSpawnTimer: 6,
        canRoofWalk: false,
        theme: 0,
        jumpingFromRoof: false,
        rolledLand: false,
        rolledLandTime: 0,
        // Police chase
        policeDistance: 8.0,
        policeChasing: false,
        policeSiren: false,
        policeTotalDistance: 0,
        maxLegitDistance: 0,
        maxEasy: 0,
        maxMedium: 0,
        maxHard: 0,
        maxEasyAbility: 0,
        maxMediumAbility: 0,
        maxHardAbility: 0,
        legitRun: true,
        runCount: 0,
        selectedCharacter: localStorage.getItem('subwaySelectedCharacter') || 'runner',
        ownedCharacters: ['runner']
    };
})();


// ===== ENDLESS RUNNER - Audio System =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.audioCtx = null;
    SG.homelanderAudioPaths = SG.homelanderAudioPaths || {
        theme: 'audio/homelander-theme.mp3',
        voice: 'audio/im-better-homelander.mp3'
    };
    SG.homelanderThemeAudio = null;
    SG.homelanderVoiceAudio = null;
    SG.homelanderVoiceSource = null;
    SG.homelanderVoiceGain = null;
    SG.HOMELANDER_VOICE_GAIN = 4.4;
    SG.pendingHomelanderVoice = false;

    SG.initAudio = function() {
        try {
            SG.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {
            SG.audioCtx = null;
        }
    };

    SG.scheduleSound = function(t, fn) {
        if (!SG.audioCtx || SG.state.muted) return;
        var startTime = SG.audioCtx.currentTime + 0.05;
        if (SG.audioCtx.state === 'suspended') SG.audioCtx.resume().catch(function(){});
        fn(startTime);
    };

    SG.playCoinSound = function() {
        SG.scheduleSound(0, function(t) {
            try {
                var osc = SG.audioCtx.createOscillator();
                var gain = SG.audioCtx.createGain();
                osc.connect(gain);
                gain.connect(SG.audioCtx.destination);
                osc.frequency.setValueAtTime(880, t);
                osc.frequency.linearRampToValueAtTime(1320, t + 0.1);
                gain.gain.setValueAtTime(0.15, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.15);
                osc.start(t);
                osc.stop(t + 0.15);
            } catch(e) {}
        });
    };

    SG.playCrashSound = function() {
        SG.scheduleSound(0, function(t) {
            try {
                var bufferSize = SG.audioCtx.sampleRate * 0.4;
                var buffer = SG.audioCtx.createBuffer(1, bufferSize, SG.audioCtx.sampleRate);
                var data = buffer.getChannelData(0);
                for (var i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
                }
                var source = SG.audioCtx.createBufferSource();
                source.buffer = buffer;
                var gain = SG.audioCtx.createGain();
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.4);
                var filter = SG.audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800, t);
                filter.frequency.linearRampToValueAtTime(100, t + 0.3);
                source.connect(filter);
                filter.connect(gain);
                gain.connect(SG.audioCtx.destination);
                source.start(t);
            } catch(e) {}
        });
    };

    SG.playJumpSound = function() {
        SG.scheduleSound(0, function(t) {
            try {
                var osc = SG.audioCtx.createOscillator();
                var gain = SG.audioCtx.createGain();
                osc.connect(gain);
                gain.connect(SG.audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, t);
                osc.frequency.linearRampToValueAtTime(600, t + 0.15);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.2);
                osc.start(t);
                osc.stop(t + 0.2);
            } catch(e) {}
        });
    };

    SG.playRollSound = function() {
        SG.scheduleSound(0, function(t) {
            try {
                var osc = SG.audioCtx.createOscillator();
                var gain = SG.audioCtx.createGain();
                osc.connect(gain);
                gain.connect(SG.audioCtx.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.linearRampToValueAtTime(200, t + 0.15);
                gain.gain.setValueAtTime(0.08, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.2);
                osc.start(t);
                osc.stop(t + 0.2);
            } catch(e) {}
        });
    };

    // ===== SIREN SOUND (for police chase) =====
    var sirenState = { osc: null, gain: null, running: false };

    SG.startSiren = function() {
        if (!SG.audioCtx || SG.state.muted || sirenState.running) return;
        sirenState.running = true;
        try {
            var ctx = SG.audioCtx;
            sirenState.gain = ctx.createGain();
            sirenState.gain.gain.setValueAtTime(0, ctx.currentTime);
            sirenState.gain.connect(ctx.destination);

            sirenState.osc = ctx.createOscillator();
            sirenState.osc.type = 'sawtooth';
            sirenState.osc.connect(sirenState.gain);
            sirenState.osc.start();

            var startTime = ctx.currentTime;
            // Wail pattern: oscillate between 600Hz and 1200Hz
            function sirenLoop() {
                if (!sirenState.running) return;
                var now = ctx.currentTime;
                var t = (now - startTime) % 2.0; // 2 second cycle
                var freq, vol;
                if (t < 1.0) {
                    freq = 600 + t * 600; // rising
                    vol = 0.08 * (1 + t);
                } else {
                    freq = 1200 - (t - 1.0) * 600; // falling
                    vol = 0.08 * (3 - t);
                }
                sirenState.osc.frequency.setValueAtTime(freq, now);
                sirenState.gain.gain.setValueAtTime(vol, now);
                setTimeout(sirenLoop, 100);
            }
            sirenLoop();
            SG.state.policeSiren = true;
        } catch(e) { sirenState.running = false; }
    };

    SG.stopSiren = function() {
        sirenState.running = false;
        SG.state.policeSiren = false;
        try {
            if (sirenState.osc) { sirenState.osc.stop(); sirenState.osc = null; }
            if (sirenState.gain) { sirenState.gain.disconnect(); sirenState.gain = null; }
        } catch(e) {}
    };

    // ===== BACKGROUND MUSIC =====
    SG.bgMusicState = {
        running: false,
        beatInterval: null,
        lastBeat: 0,
        beatCount: 0,
        tempo: 120,
        currentOscs: []
    };

    SG.rhythmMusicProfile = {
        baseBpm: 108,
        maxBpm: 218,
        hasBackbeatSnare: true,
        hasSyncopatedHats: true,
        hasBassline: true,
        hasLeadArp: true
    };

    SG.startBgMusic = function() {
        if (SG.state.muted || !SG.audioCtx || SG.bgMusicState.running) return;
        SG.bgMusicState.running = true;
        SG.bgMusicState.lastBeat = SG.audioCtx.currentTime;
        SG.bgMusicState.beatCount = 0;
    };

    SG.stopBgMusic = function() {
        SG.bgMusicState.running = false;
        for (var i = 0; i < SG.bgMusicState.currentOscs.length; i++) {
            try { SG.bgMusicState.currentOscs[i].stop(); } catch(e) {}
        }
        SG.bgMusicState.currentOscs = [];
    };

    function rememberMusicNode(node, ttlMs) {
        SG.bgMusicState.currentOscs.push(node);
        setTimeout(function() {
            var idx = SG.bgMusicState.currentOscs.indexOf(node);
            if (idx >= 0) SG.bgMusicState.currentOscs.splice(idx, 1);
        }, ttlMs || 500);
    }

    function musicVolume(scale) {
        var v = typeof SG.state.musicVolume === 'number' ? SG.state.musicVolume : 0.5;
        return Math.max(0, Math.min(1, v)) * scale;
    }

    function playOscHit(type, freqA, freqB, gainValue, start, duration) {
        var ctx = SG.audioCtx;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freqA, start);
        if (freqB) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqB), start + duration * 0.72);
        gain.gain.setValueAtTime(musicVolume(gainValue), start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.start(start);
        osc.stop(start + duration + 0.02);
        rememberMusicNode(osc, (duration + 0.1) * 1000);
    }

    function playNoiseHit(start, duration, gainValue, filterFreq, filterType) {
        var ctx = SG.audioCtx;
        var bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2.1);
        }
        var src = ctx.createBufferSource();
        var filter = ctx.createBiquadFilter();
        var gain = ctx.createGain();
        filter.type = filterType || 'highpass';
        filter.frequency.setValueAtTime(filterFreq || 2800, start);
        src.buffer = buffer;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(musicVolume(gainValue), start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        src.start(start);
        src.stop(start + duration + 0.01);
        rememberMusicNode(src, (duration + 0.1) * 1000);
    }

    SG.ensureHomelanderAudio = function() {
        if (!SG.homelanderThemeAudio && typeof Audio !== 'undefined') {
            SG.homelanderThemeAudio = new Audio(SG.homelanderAudioPaths.theme);
            SG.homelanderThemeAudio.loop = true;
            SG.homelanderThemeAudio.preload = 'auto';
        }
        if (!SG.homelanderVoiceAudio && typeof Audio !== 'undefined') {
            SG.homelanderVoiceAudio = new Audio(SG.homelanderAudioPaths.voice);
            SG.homelanderVoiceAudio.loop = false;
            SG.homelanderVoiceAudio.preload = 'auto';
        }
        if (SG.audioCtx && SG.homelanderVoiceAudio && !SG.homelanderVoiceSource) {
            try {
                SG.homelanderVoiceSource = SG.audioCtx.createMediaElementSource(SG.homelanderVoiceAudio);
                SG.homelanderVoiceGain = SG.audioCtx.createGain();
                SG.homelanderVoiceSource.connect(SG.homelanderVoiceGain);
                SG.homelanderVoiceGain.connect(SG.audioCtx.destination);
            } catch(e) {
                SG.homelanderVoiceSource = null;
                SG.homelanderVoiceGain = null;
            }
        }
    };

    SG.updateHomelanderAudioVolume = function() {
        var music = typeof SG.state.musicVolume === 'number' ? SG.state.musicVolume : 0.5;
        var sfx = typeof SG.state.sfxVolume === 'number' ? SG.state.sfxVolume : 0.8;
        if (SG.homelanderThemeAudio) {
            SG.homelanderThemeAudio.volume = SG.state.muted ? 0 : Math.min(1, Math.max(0, music * 0.65));
        }
        if (SG.homelanderVoiceAudio) {
            SG.homelanderVoiceAudio.volume = SG.state.muted ? 0 : 1;
        }
        if (SG.homelanderVoiceGain) {
            SG.homelanderVoiceGain.gain.value = SG.state.muted ? 0 : Math.min(5.0, Math.max(2.8, sfx * SG.HOMELANDER_VOICE_GAIN));
        }
    };

    SG.startHomelanderTheme = function() {
        SG.ensureHomelanderAudio();
        SG.updateHomelanderAudioVolume();
        if (SG.stopBgMusic) SG.stopBgMusic();
        if (!SG.homelanderThemeAudio || SG.state.muted) return;
        try {
            SG.homelanderThemeAudio.currentTime = 0;
            var p = SG.homelanderThemeAudio.play();
            if (p && p.catch) p.catch(function() {});
        } catch(e) {}
    };

    SG.stopHomelanderTheme = function() {
        if (!SG.homelanderThemeAudio) return;
        try {
            SG.homelanderThemeAudio.pause();
            SG.homelanderThemeAudio.currentTime = 0;
        } catch(e) {}
    };

    SG.playPendingHomelanderVoice = function() {
        if (!SG.pendingHomelanderVoice) return;
        SG.pendingHomelanderVoice = false;
        if (!SG.audioCtx && SG.initAudio) SG.initAudio();
        if (SG.audioCtx && SG.audioCtx.state === 'suspended') SG.audioCtx.resume().catch(function() {});
        SG.ensureHomelanderAudio();
        SG.updateHomelanderAudioVolume();
        if (!SG.homelanderVoiceAudio || SG.state.muted) return;
        try {
            SG.homelanderVoiceAudio.pause();
            SG.homelanderVoiceAudio.currentTime = 0;
            var p = SG.homelanderVoiceAudio.play();
            if (p && p.catch) p.catch(function() {});
        } catch(e) {}
    };

    SG.stopHomelanderAudio = function() {
        SG.pendingHomelanderVoice = false;
        SG.stopHomelanderTheme();
        if (SG.homelanderVoiceAudio) {
            try {
                SG.homelanderVoiceAudio.pause();
                SG.homelanderVoiceAudio.currentTime = 0;
            } catch(e) {}
        }
    };

    SG.updateBgMusic = function(delta) {
        if (!SG.bgMusicState.running || !SG.audioCtx || SG.state.muted) return;
        if (SG.state.paused || !SG.state.started) return;

        var speedLevel = Math.floor((SG.state.speed - SG.START_SPEED) / (SG.MAX_SPEED - SG.START_SPEED) * 49) + 1;
        speedLevel = Math.max(1, Math.min(speedLevel, 50));
        var speedT = (speedLevel - 1) / 49;
        var targetBpm = SG.rhythmMusicProfile.baseBpm + speedT * (SG.rhythmMusicProfile.maxBpm - SG.rhythmMusicProfile.baseBpm);
        SG.bgMusicState.tempo += (targetBpm - SG.bgMusicState.tempo) * 0.05;

        var beatInterval = 60 / SG.bgMusicState.tempo;
        var now = SG.audioCtx.currentTime;

        if (now - SG.bgMusicState.lastBeat >= beatInterval) {
            SG.bgMusicState.lastBeat += beatInterval;
            SG.bgMusicState.beatCount++;
            var beat = SG.bgMusicState.beatCount;

            try {
                var step = beat % 8;
                var sixteenth = beatInterval * 0.5;
                var notes = [98, 123.47, 110, 146.83, 98, 130.81, 110, 164.81];
                var bassNote = notes[beat % notes.length];

                if (step === 1 || step === 5 || step === 0 || (speedLevel > 28 && step === 3)) {
                    playOscHit('sine', 165, 42, 0.54, now, 0.18);
                }

                if (step === 3 || step === 7) {
                    playNoiseHit(now, 0.12, 0.25, 1600, 'bandpass');
                    playOscHit('triangle', 220, 165, 0.08, now, 0.1);
                }

                playNoiseHit(now, 0.035, speedLevel > 20 ? 0.11 : 0.075, 5200, 'highpass');
                if (SG.rhythmMusicProfile.hasSyncopatedHats && (speedLevel > 10 || beat % 2 === 0)) {
                    playNoiseHit(now + sixteenth, 0.026, speedLevel > 32 ? 0.085 : 0.05, 7200, 'highpass');
                }

                if (SG.rhythmMusicProfile.hasBassline) {
                    playOscHit('sawtooth', bassNote, bassNote * 0.995, 0.16, now, beatInterval * 0.82);
                }

                if (SG.rhythmMusicProfile.hasLeadArp && speedLevel > 14 && beat % 2 === 0) {
                    var leadNotes = [392, 493.88, 587.33, 659.25, 783.99, 659.25, 587.33, 493.88];
                    var lead = leadNotes[Math.floor(beat / 2) % leadNotes.length];
                    playOscHit('square', lead, lead * 1.01, speedLevel > 34 ? 0.045 : 0.025, now + beatInterval * 0.25, 0.08);
                }
            } catch(e) {}
        }
    };
})();


// ===== ENDLESS RUNNER - Textures =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.textureCanvases = SG.textureCanvases || {};

    function hashNoise(x, y, seed) {
        var n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
        return n - Math.floor(n);
    }

    function makeCanvas(key, width, height, painter) {
        if (!SG.textureCanvases[key]) {
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            painter(canvas.getContext('2d'), width, height);
            SG.textureCanvases[key] = canvas;
        }
        return SG.textureCanvases[key];
    }

    function createTextureFromCanvas(canvas, repeatX, repeatY) {
        var texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX || 1, repeatY || 1);
        texture.minFilter = THREE.LinearMipMapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return texture;
    }

    SG.createAsphaltTexture = function(repeatX, repeatY) {
        var canvas = makeCanvas('asphalt-v1', 512, 512, function(ctx, w, h) {
            var base = ctx.createLinearGradient(0, 0, w, h);
            base.addColorStop(0, '#34363a');
            base.addColorStop(0.5, '#24262a');
            base.addColorStop(1, '#3c3d40');
            ctx.fillStyle = base;
            ctx.fillRect(0, 0, w, h);

            var img = ctx.getImageData(0, 0, w, h);
            for (var i = 0; i < img.data.length; i += 4) {
                var px = (i / 4) % w;
                var py = Math.floor((i / 4) / w);
                var n = hashNoise(px, py, 3) * 34 - 17;
                img.data[i] = Math.max(12, Math.min(82, img.data[i] + n));
                img.data[i + 1] = Math.max(12, Math.min(82, img.data[i + 1] + n));
                img.data[i + 2] = Math.max(14, Math.min(88, img.data[i + 2] + n));
            }
            ctx.putImageData(img, 0, 0);

            ctx.globalAlpha = 0.34;
            ctx.strokeStyle = '#0f1012';
            ctx.lineWidth = 2;
            for (var c = 0; c < 18; c++) {
                var x = hashNoise(c, 2, 9) * w;
                var y = hashNoise(c, 5, 9) * h;
                ctx.beginPath();
                ctx.moveTo(x, y);
                for (var step = 0; step < 7; step++) {
                    x += (hashNoise(c, step, 14) - 0.5) * 58;
                    y += 28 + hashNoise(step, c, 15) * 34;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            ctx.globalAlpha = 0.16;
            ctx.fillStyle = '#060708';
            for (var t = 0; t < 7; t++) {
                var sx = 88 + t * 46 + hashNoise(t, 1, 22) * 18;
                ctx.fillRect(sx, 0, 5 + hashNoise(t, 2, 22) * 7, h);
            }
            ctx.globalAlpha = 1;
        });
        return createTextureFromCanvas(canvas, repeatX || 1.2, repeatY || 5);
    };

    SG.createConcreteTexture = function(repeatX, repeatY) {
        var canvas = makeCanvas('concrete-v1', 384, 384, function(ctx, w, h) {
            ctx.fillStyle = '#707276';
            ctx.fillRect(0, 0, w, h);
            var img = ctx.getImageData(0, 0, w, h);
            for (var i = 0; i < img.data.length; i += 4) {
                var px = (i / 4) % w;
                var py = Math.floor((i / 4) / w);
                var n = hashNoise(px, py, 42) * 48 - 24;
                img.data[i] = Math.max(65, Math.min(150, img.data[i] + n));
                img.data[i + 1] = Math.max(65, Math.min(150, img.data[i + 1] + n));
                img.data[i + 2] = Math.max(68, Math.min(155, img.data[i + 2] + n));
            }
            ctx.putImageData(img, 0, 0);
            ctx.globalAlpha = 0.24;
            ctx.strokeStyle = '#33363a';
            for (var y = 64; y < h; y += 96) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y + hashNoise(y, 0, 5) * 8 - 4);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        });
        return createTextureFromCanvas(canvas, repeatX || 1, repeatY || 3);
    };

    SG.createLanePaintTexture = function(repeatX, repeatY) {
        var canvas = makeCanvas('lane-paint-v1', 128, 512, function(ctx, w, h) {
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#b7bbc0';
            ctx.fillRect(22, 0, w - 44, h);
            ctx.globalCompositeOperation = 'destination-out';
            for (var i = 0; i < 85; i++) {
                ctx.globalAlpha = 0.08 + hashNoise(i, 1, 7) * 0.18;
                ctx.beginPath();
                ctx.arc(22 + hashNoise(i, 2, 7) * (w - 44), hashNoise(i, 3, 7) * h, 1 + hashNoise(i, 4, 7) * 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        });
        return createTextureFromCanvas(canvas, repeatX || 1, repeatY || 4);
    };

    SG.createWarningStripeTexture = function(repeatX, repeatY) {
        var canvas = makeCanvas('warning-stripe-v1', 256, 256, function(ctx, w, h) {
            ctx.fillStyle = '#ff7a18';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#17191d';
            for (var x = -w; x < w * 2; x += 58) {
                ctx.save();
                ctx.translate(x, 0);
                ctx.rotate(-Math.PI / 4);
                ctx.fillRect(-18, -w, 28, h * 3);
                ctx.restore();
            }
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, 24);
            ctx.globalAlpha = 0.14;
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, h - 38, w, 38);
            ctx.globalAlpha = 1;
        });
        return createTextureFromCanvas(canvas, repeatX || 2, repeatY || 1);
    };

    SG.createMetalTexture = function(repeatX, repeatY) {
        var canvas = makeCanvas('brushed-metal-v1', 384, 384, function(ctx, w, h) {
            var grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, '#394049');
            grad.addColorStop(0.5, '#777f88');
            grad.addColorStop(1, '#30363f');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 0.22;
            for (var y = 0; y < h; y += 3) {
                ctx.strokeStyle = hashNoise(y, 0, 11) > 0.5 ? '#c7ccd2' : '#15191e';
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y + hashNoise(y, 3, 11) * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        });
        return createTextureFromCanvas(canvas, repeatX || 1, repeatY || 2);
    };

    SG.createTrackGroundMaterial = function() {
        return new THREE.MeshLambertMaterial({ color: 0xffffff, map: SG.createAsphaltTexture(1.6, 8) });
    };

    SG.createLanePaintMaterial = function() {
        return new THREE.MeshBasicMaterial({ color: 0xd6d7d8, map: SG.createLanePaintTexture(1, 6), transparent: true });
    };

    SG.createCurbMaterial = function() {
        return new THREE.MeshLambertMaterial({ color: 0xffffff, map: SG.createConcreteTexture(1, 5) });
    };

    SG.createWarningPanelMaterial = function() {
        return new THREE.MeshLambertMaterial({ color: 0xffffff, map: SG.createWarningStripeTexture(2, 1) });
    };

    SG.createDarkMetalMaterial = function() {
        return new THREE.MeshLambertMaterial({ color: 0xb8c0c8, map: SG.createMetalTexture(1, 2) });
    };

    SG.skyCloudProfile = {
        inSkyDome: true,
        cloudCount: 34,
        contrast: 'high',
        runtimeMeshes: 0
    };

    SG.createSkyDomeTexture = function(themeIndex, mode) {
        var key = 'sky-' + (mode || 'normal') + '-' + (themeIndex || 0);
        var canvas = makeCanvas(key, 1024, 512, function(ctx, w, h) {
            var top = '#3f9be0';
            var mid = '#89cdf5';
            var low = '#f2c992';
            if (mode === 'cyber') {
                top = '#03040a'; mid = '#111829'; low = '#371530';
            } else if (themeIndex === 1) {
                top = '#438fca'; mid = '#8bc7ed'; low = '#bad7aa';
            } else if (themeIndex === 2) {
                top = '#5c3d22'; mid = '#c77938'; low = '#f1b85f';
            } else if (themeIndex === 3) {
                top = '#080e1d'; mid = '#1a314d'; low = '#4a6173';
            }
            var grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, top);
            grad.addColorStop(0.48, mid);
            grad.addColorStop(1, low);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            var sunX = mode === 'cyber' ? w * 0.72 : w * 0.18;
            var sunY = mode === 'cyber' ? h * 0.34 : h * 0.28;
            var sun = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, w * 0.22);
            sun.addColorStop(0, mode === 'cyber' ? 'rgba(255,50,130,0.95)' : 'rgba(255,245,205,0.95)');
            sun.addColorStop(0.25, mode === 'cyber' ? 'rgba(255,30,90,0.28)' : 'rgba(255,226,166,0.28)');
            sun.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = sun;
            ctx.fillRect(0, 0, w, h);

            var cloudTint = mode === 'cyber' ? '#c9f7ff' : (themeIndex === 2 ? '#fff0cf' : '#ffffff');
            var cloudShadow = mode === 'cyber' ? '#472a72' : (themeIndex === 2 ? '#9a5d32' : '#5a91b7');
            var cloudHighlight = mode === 'cyber' ? '#ff7df7' : '#ffffff';
            var cloudCount = SG.skyCloudProfile.cloudCount;
            for (var c = 0; c < cloudCount; c++) {
                var cx = hashNoise(c, 1, themeIndex) * w;
                var cy = h * (0.12 + hashNoise(c, 2, themeIndex) * 0.34);
                var cw = 76 + hashNoise(c, 3, themeIndex) * 170;
                var ch = 16 + hashNoise(c, 4, themeIndex) * 30;
                ctx.globalAlpha = mode === 'cyber' ? 0.34 : 0.5;
                ctx.fillStyle = cloudShadow;
                ctx.beginPath();
                ctx.ellipse(cx + cw * 0.08, cy + ch * 0.42, cw * 0.82, ch * 0.5, 0, 0, Math.PI * 2);
                ctx.ellipse(cx - cw * 0.34, cy + ch * 0.48, cw * 0.44, ch * 0.42, 0, 0, Math.PI * 2);
                ctx.ellipse(cx + cw * 0.42, cy + ch * 0.4, cw * 0.42, ch * 0.38, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = mode === 'cyber' ? 0.56 : 0.74;
                ctx.fillStyle = cloudTint;
                ctx.beginPath();
                ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
                ctx.ellipse(cx - cw * 0.35, cy + ch * 0.02, cw * 0.58, ch * 0.9, 0, 0, Math.PI * 2);
                ctx.ellipse(cx + cw * 0.32, cy - ch * 0.08, cw * 0.54, ch * 0.86, 0, 0, Math.PI * 2);
                ctx.ellipse(cx - cw * 0.05, cy - ch * 0.28, cw * 0.36, ch * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = mode === 'cyber' ? 0.22 : 0.34;
                ctx.fillStyle = cloudHighlight;
                ctx.beginPath();
                ctx.ellipse(cx - cw * 0.18, cy - ch * 0.32, cw * 0.36, ch * 0.38, 0, 0, Math.PI * 2);
                ctx.ellipse(cx + cw * 0.2, cy - ch * 0.26, cw * 0.3, ch * 0.34, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = mode === 'cyber' ? 0.18 : 0.22;
            ctx.fillStyle = mode === 'cyber' ? '#ff69f5' : (themeIndex === 2 ? '#ffd99a' : '#dcefff');
            for (var band = 0; band < 9; band++) {
                var bx = hashNoise(band, 20, themeIndex) * w;
                var by = h * (0.5 + hashNoise(band, 21, themeIndex) * 0.16);
                var bw = 190 + hashNoise(band, 22, themeIndex) * 250;
                ctx.beginPath();
                ctx.ellipse(bx, by, bw, 9 + hashNoise(band, 23, themeIndex) * 10, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = mode === 'cyber' ? 0.65 : 0.2;
            ctx.fillStyle = mode === 'cyber' ? '#9de9ff' : '#ffffff';
            for (var s = 0; s < (mode === 'cyber' ? 160 : 30); s++) {
                var sx = hashNoise(s, 9, 4) * w;
                var sy = hashNoise(s, 10, 4) * h * 0.58;
                ctx.fillRect(sx, sy, 1.2, 1.2);
            }
            ctx.globalAlpha = 1;
        });
        var texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.UVMapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return texture;
    };

    SG.createSkyDome = function() {
        if (!THREE || !SG.scene || SG.skyDome) return;
        var geo = new THREE.SphereGeometry(150, 48, 24);
        var mat = new THREE.MeshBasicMaterial({
            map: SG.createSkyDomeTexture(SG.state ? SG.state.theme : 0, 'normal'),
            side: THREE.BackSide,
            depthWrite: false,
            fog: false
        });
        SG.skyDome = new THREE.Mesh(geo, mat);
        SG.skyDome.name = 'realistic-sky-dome';
        SG.skyDome.userData.skyKey = 'normal-' + (SG.state ? SG.state.theme : 0);
        SG.skyDome.userData.clouds = true;
        SG.skyDome.userData.cloudProfile = SG.skyCloudProfile;
        SG.skyDome.renderOrder = -1000;
        SG.scene.add(SG.skyDome);
    };

    SG.updateSkyDome = function(themeIndex, mode) {
        if (!SG.skyDome || !SG.skyDome.material) return;
        var oldMap = SG.skyDome.material.map;
        SG.skyDome.material.map = SG.createSkyDomeTexture(themeIndex || 0, mode || 'normal');
        SG.skyDome.material.needsUpdate = true;
        SG.skyDome.userData.skyKey = (mode || 'normal') + '-' + (themeIndex || 0);
        if (oldMap && oldMap.dispose) oldMap.dispose();
    };

    SG.createUSFlagTexture = function() {
        var canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 208;
        var ctx = canvas.getContext('2d');

        var w = canvas.width;
        var h = canvas.height;
        var stripeH = h / 13;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);

        for (var i = 0; i < 13; i += 2) {
            ctx.fillStyle = '#B22234';
            ctx.fillRect(0, i * stripeH, w, stripeH);
        }

        var cantonW = Math.floor(w * 0.40);
        var cantonH = stripeH * 7;
        ctx.fillStyle = '#3C3B6E';
        ctx.fillRect(0, 0, cantonW, cantonH);

        ctx.fillStyle = '#FFFFFF';
        var starCols = [6, 5, 6, 5, 6, 5, 6, 5, 6];
        var cellW = cantonW / 7;
        var cellH = cantonH / 10;

        for (var row = 0; row < starCols.length; row++) {
            var cols = starCols[row];
            for (var col = 0; col < cols; col++) {
                var cx = (col + 1) * cellW - cellW / 2;
                var cy = (row + 1) * cellH - cellH / 2;
                var r = Math.min(cellW, cellH) * 0.22;
                ctx.beginPath();
                for (var i2 = 0; i2 < 5; i2++) {
                    var outer = (i2 * 72 - 90) * Math.PI / 180;
                    var inner = ((i2 * 72) + 36 - 90) * Math.PI / 180;
                    var ox = cx + Math.cos(outer) * r;
                    var oy = cy + Math.sin(outer) * r;
                    var ix = cx + Math.cos(inner) * r * 0.4;
                    var iy = cy + Math.sin(inner) * r * 0.4;
                    if (i2 === 0) ctx.moveTo(ox, oy);
                    else ctx.lineTo(ox, oy);
                    ctx.lineTo(ix, iy);
                }
                ctx.closePath();
                ctx.fill();
            }
        }

        var texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return texture;
    };
})();


// ===== ENDLESS RUNNER - Scene Setup =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.disposeObject = function(obj) {
        if (!obj) return;
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
        }
        if (obj.children) {
            for (var i = obj.children.length - 1; i >= 0; i--) {
                SG.disposeObject(obj.children[i]);
            }
        }
    };

    SG.initScene = function() {
        SG.scene = new THREE.Scene();
        SG.scene.background = new THREE.Color(0x87CEEB);
        SG.scene.fog = new THREE.Fog(0x87CEEB, 60, 120);

        SG.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
        SG.camera.position.set(0, 5, 7);
        SG.camera.lookAt(0, 0, -8);

        SG.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        SG.renderer.setSize(window.innerWidth, window.innerHeight);
        SG.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        SG.renderer.outputEncoding = THREE.sRGBEncoding;
        SG.renderer.toneMapping = THREE.ReinhardToneMapping;
        SG.renderer.toneMappingExposure = 0.96;
        SG.renderer.shadowMap.enabled = true;
        SG.renderer.shadowMap.type = THREE.BasicShadowMap;
        document.body.appendChild(SG.renderer.domElement);

        SG.ambientLight = new THREE.AmbientLight(0xffffff, 0.38);
        SG.scene.add(SG.ambientLight);

        SG.hemiLight = new THREE.HemisphereLight(0xbfe7ff, 0x4b4033, 0.62);
        SG.scene.add(SG.hemiLight);

        SG.dirLight = new THREE.DirectionalLight(0xfff2d2, 0.82);
        SG.dirLight.position.set(-8, 16, 10);
        SG.dirLight.castShadow = true;
        SG.dirLight.shadow.mapSize.width = 1024;
        SG.dirLight.shadow.mapSize.height = 1024;
        SG.dirLight.shadow.camera.left = -12;
        SG.dirLight.shadow.camera.right = 12;
        SG.dirLight.shadow.camera.top = 16;
        SG.dirLight.shadow.camera.bottom = -8;
        SG.dirLight.shadow.camera.near = 2;
        SG.dirLight.shadow.camera.far = 45;
        SG.dirLight.shadow.bias = -0.0008;
        SG.scene.add(SG.dirLight);

        SG.realisticLightingProfile = {
            shadows: true,
            shadowMapSize: 1024,
            toneMapping: 'Reinhard',
            themeAware: true
        };

        if (SG.createSkyDome) SG.createSkyDome();

        SG.clock = new THREE.Clock();

        window.addEventListener('resize', SG.onResize);
    };

    SG.updateLightRigForTheme = function(themeIndex) {
        if (!SG.ambientLight || !SG.hemiLight || !SG.dirLight) return;
        var presets = [
            { hemiSky: 0xbfe7ff, hemiGround: 0x4b4033, hemi: 0.62, sun: 0xfff2d2, sunPower: 0.82, pos: [-8, 16, 10], exposure: 0.96 },
            { hemiSky: 0xd9f6d0, hemiGround: 0x314626, hemi: 0.66, sun: 0xf5ffd8, sunPower: 0.72, pos: [-6, 14, 8], exposure: 0.92 },
            { hemiSky: 0xffd08a, hemiGround: 0x6a4726, hemi: 0.54, sun: 0xffcf7a, sunPower: 0.96, pos: [-10, 13, 5], exposure: 0.98 },
            { hemiSky: 0xb5e7ff, hemiGround: 0x345066, hemi: 0.64, sun: 0xe9fbff, sunPower: 0.78, pos: [-7, 15, 12], exposure: 0.94 }
        ];
        var p = presets[Math.max(0, Math.min(3, themeIndex || 0))];
        SG.ambientLight.intensity = 0.34;
        SG.hemiLight.color.setHex(p.hemiSky);
        SG.hemiLight.groundColor.setHex(p.hemiGround);
        SG.hemiLight.intensity = p.hemi;
        SG.dirLight.color.setHex(p.sun);
        SG.dirLight.intensity = p.sunPower;
        SG.dirLight.position.set(p.pos[0], p.pos[1], p.pos[2]);
        if (SG.renderer) SG.renderer.toneMappingExposure = p.exposure;
    };

    SG.onResize = function() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        if (SG.camera) {
            SG.camera.aspect = w / h;
            SG.camera.updateProjectionMatrix();
            SG.renderer.setSize(w, h);
        }
    };
})();


// ===== ENDLESS RUNNER - Player =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.playerModelPath = SG.playerModelPath || 'models/player.glb';
    SG.jetpackModelPath = SG.jetpackModelPath || 'models/jetpack.glb';
    SG.jetpackModelTuning = SG.jetpackModelTuning || {
        targetHeight: 0.58,
        rotationY: Math.PI,
        yOffset: 0,
        zOffset: 0
    };
    SG.characterCatalog = SG.characterCatalog || [
        { id: 'runner', name: 'Neo Runner', path: 'models/player.glb', desc: 'Original endless runner' },
        { id: 'adventurer', name: 'Adventurer', path: 'models/characters/Adventurer.gltf', desc: 'Backpack and field gear' },
        { id: 'beach', name: 'Beach', path: 'models/characters/Beach.gltf', desc: 'Light summer outfit' },
        { id: 'casual2', name: 'Casual 2', path: 'models/characters/Casual_2.gltf', desc: 'Street casual outfit' },
        { id: 'hoodie', name: 'Hoodie', path: 'models/characters/Casual_Hoodie.gltf', desc: 'Casual hoodie outfit' },
        { id: 'farmer', name: 'Farmer', path: 'models/characters/Farmer.gltf', desc: 'Workwear runner' },
        { id: 'king', name: 'King', path: 'models/characters/King.gltf', desc: 'Royal outfit' },
        { id: 'punk', name: 'Punk', path: 'models/characters/Punk.gltf', desc: 'High contrast punk outfit' },
        { id: 'spacesuit', name: 'Spacesuit', path: 'models/characters/Spacesuit.gltf', desc: 'Space explorer suit' },
        { id: 'suit', name: 'Suit', path: 'models/characters/Suit.gltf', desc: 'Formal runner' },
        { id: 'swat', name: 'SWAT', path: 'models/characters/Swat.gltf', desc: 'Tactical outfit' },
        { id: 'worker', name: 'Worker', path: 'models/characters/Worker.gltf', desc: 'Construction outfit' }
    ];

    function parseOwnedCharacters() {
        try {
            var saved = JSON.parse(localStorage.getItem('subwayOwnedCharacters') || '["runner"]');
            if (Array.isArray(saved) && saved.length) return saved.indexOf('runner') >= 0 ? saved : ['runner'].concat(saved);
        } catch(e) {}
        return ['runner'];
    }

    function saveOwnedCharacters(owned) {
        try { localStorage.setItem('subwayOwnedCharacters', JSON.stringify(owned)); } catch(e) {}
    }

    SG.getCharacterById = function(id) {
        for (var i = 0; i < SG.characterCatalog.length; i++) {
            if (SG.characterCatalog[i].id === id) return SG.characterCatalog[i];
        }
        return SG.characterCatalog[0];
    };

    SG.getOwnedCharacters = function() {
        if (!Array.isArray(SG.state.ownedCharacters) || !SG.state.ownedCharacters.length) {
            SG.state.ownedCharacters = parseOwnedCharacters();
        }
        return SG.state.ownedCharacters;
    };

    SG.characterIsOwned = function(id) {
        return SG.getOwnedCharacters().indexOf(id) >= 0;
    };

    SG.getNextCharacterPrice = function() {
        return Math.max(0, SG.getOwnedCharacters().length - 1) * 10000;
    };

    SG.selectCharacter = function(id) {
        var character = SG.getCharacterById(id);
        if (!character || !SG.characterIsOwned(character.id)) return false;
        SG.state.selectedCharacter = character.id;
        SG.playerModelPath = character.path;
        try { localStorage.setItem('subwaySelectedCharacter', character.id); } catch(e) {}
        if (SG.player) SG.reloadPlayerModel();
        return true;
    };

    SG.buyCharacter = function(id) {
        var character = SG.getCharacterById(id);
        if (!character || SG.characterIsOwned(character.id)) return SG.selectCharacter(id);
        var price = SG.getNextCharacterPrice();
        if ((SG.state.credits || 0) < price) return false;
        SG.state.credits -= price;
        var owned = SG.getOwnedCharacters().slice();
        owned.push(character.id);
        SG.state.ownedCharacters = owned;
        saveOwnedCharacters(owned);
        SG.selectCharacter(character.id);
        if (SG.updateMenuCredits) SG.updateMenuCredits();
        if (SG.saveShopData) SG.saveShopData();
        if (SG.accountSave) SG.accountSave();
        return true;
    };

    function rememberLegacyPart(part) {
        SG.playerLegacyParts = SG.playerLegacyParts || [];
        SG.playerLegacyParts.push(part);
        return part;
    }

    function hideLegacyBodyParts() {
        var parts = SG.playerLegacyParts || [];
        for (var i = 0; i < parts.length; i++) {
            if (parts[i]) parts[i].visible = false;
        }
    }

    function showLegacyBodyParts() {
        var parts = SG.playerLegacyParts || [];
        for (var i = 0; i < parts.length; i++) {
            if (parts[i]) parts[i].visible = true;
        }
    }

    function normalizeModel(model) {
        var box = new THREE.Box3().setFromObject(model);
        var size = new THREE.Vector3();
        var center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        var targetHeight = 1.35;
        var scale = size.y > 0 ? targetHeight / size.y : 1;
        model.scale.setScalar(scale);

        box.setFromObject(model);
        box.getCenter(center);
        model.position.set(-center.x, -box.min.y, -center.z);
    }
    SG.normalizePlayerModel = normalizeModel;

    function indexAnimationActions(gltf, model) {
        SG.playerMixer = null;
        SG.playerActions = {};
        SG.playerAction = null;

        if (!gltf.animations || !gltf.animations.length || !THREE.AnimationMixer) return;

        SG.playerMixer = new THREE.AnimationMixer(model);
        for (var i = 0; i < gltf.animations.length; i++) {
            var clip = gltf.animations[i];
            var key = String(clip.name || '').toLowerCase();
            SG.playerActions[key] = SG.playerMixer.clipAction(clip);
        }
    }

    SG.playPlayerAnimation = function(name) {
        if (!SG.playerMixer || !SG.playerActions) return;
        var next = SG.playerActions[String(name || '').toLowerCase()];
        if (!next || SG.playerAction === next) return;

        if (SG.playerAction) SG.playerAction.fadeOut(0.12);
        next.reset().fadeIn(0.12).play();
        SG.playerAction = next;
    };

    SG.updatePlayerModelAnimation = function(delta) {
        if (!SG.playerModelLoaded || !SG.playerMixer) return;

        var target = 'Idle';
        if (SG.state) {
            if (SG.state.gameOver) {
                target = 'Death';
            } else if (SG.state.started && !SG.state.paused) {
                if (SG.state.isRolling) {
                    target = 'Slide';
                } else if (SG.state.isJumping) {
                    target = SG.state.jumpVelocity < -0.15 ? 'Fall' : 'Jump';
                } else if (SG.state.laneLerp < 1 && SG.state.targetLane !== SG.state.currentLane) {
                    target = SG.state.targetLane < SG.state.currentLane ? 'StrafeLeft' : 'StrafeRight';
                } else {
                    target = 'Run';
                }
            }
        }

        SG.playPlayerAnimation(target);
        SG.playerMixer.update(delta);
    };

    SG.loadPlayerModel = function() {
        if (SG.playerModelRequested || !SG.player || !THREE || !THREE.GLTFLoader) return;
        SG.playerModelRequested = true;
        var selected = SG.state.selectedCharacter || localStorage.getItem('subwaySelectedCharacter') || 'runner';
        if (!SG.characterIsOwned(selected)) selected = 'runner';
        var character = SG.getCharacterById(selected);
        SG.state.selectedCharacter = character.id;
        SG.playerModelPath = character.path;

        var loader = new THREE.GLTFLoader();
        loader.load(SG.playerModelPath, function(gltf) {
            if (!SG.player) return;

            var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
            if (!model) return;

            model.name = 'PlayerGLB-' + character.id;
            normalizeModel(model);
            model.traverse(function(node) {
                if (node && node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });

            if (SG.playerModel && SG.playerModel.parent) {
                SG.playerModel.parent.remove(SG.playerModel);
            }

            SG.playerModel = model;
            SG.playerModelLoaded = true;
            SG.player.add(model);
            hideLegacyBodyParts();
            indexAnimationActions(gltf, model);
            SG.playPlayerAnimation('Idle');
        }, undefined, function(err) {
            SG.playerModelError = err;
            SG.playerModelLoaded = false;
            showLegacyBodyParts();
        });
    };

    SG.reloadPlayerModel = function() {
        if (!SG.player || !THREE) return;
        if (SG.playerModel && SG.playerModel.parent) {
            SG.playerModel.parent.remove(SG.playerModel);
            if (SG.disposeObject) SG.disposeObject(SG.playerModel);
        }
        SG.playerModel = null;
        SG.playerModelLoaded = false;
        SG.playerModelRequested = false;
        SG.playerMixer = null;
        SG.playerActions = {};
        SG.playerAction = null;
        showLegacyBodyParts();
        SG.loadPlayerModel();
    };

    SG.normalizeJetpackModel = function(model) {
        if (!model || !THREE) return;
        model.updateMatrixWorld(true);
        var box = new THREE.Box3().setFromObject(model);
        var size = new THREE.Vector3();
        var center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        var maxDim = Math.max(size.x, size.y, size.z) || 1;
        var scale = (SG.jetpackModelTuning.targetHeight || 0.72) / maxDim;
        model.scale.setScalar(scale);
        model.rotation.y = SG.jetpackModelTuning.rotationY || 0;
        model.position.set(
            -center.x * scale,
            -center.y * scale + (SG.jetpackModelTuning.yOffset || 0),
            -center.z * scale + (SG.jetpackModelTuning.zOffset || 0)
        );
        model.updateMatrixWorld(true);
    };

    SG.loadJetpackModel = function() {
        if (!SG.jetpackPack || SG.jetpackModelRequested || !THREE || !THREE.GLTFLoader) return;
        SG.jetpackModelRequested = true;
        var loader = new THREE.GLTFLoader();
        loader.load(SG.jetpackModelPath, function(gltf) {
            if (!SG.jetpackPack) return;
            var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
            if (!model) return;
            model.name = 'JetpackGLB';
            model.traverse(function(node) {
                if (node && node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            SG.normalizeJetpackModel(model);
            SG.jetpackModel = model;
            SG.jetpackModelLoaded = true;
            SG.jetpackPack.add(model);
        }, undefined, function(err) {
            SG.jetpackModelError = err;
            SG.jetpackModelLoaded = false;
        });
    };

    SG.createPlayer = function() {
        SG.player = new THREE.Group();
        SG.player.position.set(0, 0, 0);
        SG.player.rotation.y = Math.PI;
        SG.playerLegacyParts = [];
        SG.playerModel = null;
        SG.playerModelLoaded = false;
        SG.playerModelRequested = false;
        SG.state.ownedCharacters = parseOwnedCharacters();
        SG.state.selectedCharacter = localStorage.getItem('subwaySelectedCharacter') || SG.state.selectedCharacter || 'runner';
        if (!SG.characterIsOwned(SG.state.selectedCharacter)) SG.state.selectedCharacter = 'runner';
        SG.playerModelPath = SG.getCharacterById(SG.state.selectedCharacter).path;

        var bodyMat = new THREE.MeshLambertMaterial({ color: 0x2255aa });
        SG.playerBody = rememberLegacyPart(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.4), bodyMat));
        SG.playerBody.position.y = 0.7;
        SG.player.add(SG.playerBody);

        var headMat = new THREE.MeshLambertMaterial({ color: 0xffccaa });
        SG.playerHead = rememberLegacyPart(new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), headMat));
        SG.playerHead.position.set(0, 1.15, 0);
        SG.player.add(SG.playerHead);

        var capMat = new THREE.MeshLambertMaterial({ color: 0xcc3333 });
        var cap = rememberLegacyPart(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.1, 6), capMat));
        cap.position.set(0, 1.3, 0);
        SG.player.add(cap);

        var armMat = new THREE.MeshLambertMaterial({ color: 0xffccaa });
        SG.playerLeftArm = rememberLegacyPart(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), armMat));
        SG.playerLeftArm.position.set(-0.4, 0.85, 0);
        SG.player.add(SG.playerLeftArm);
        SG.playerRightArm = rememberLegacyPart(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), armMat));
        SG.playerRightArm.position.set(0.4, 0.85, 0);
        SG.player.add(SG.playerRightArm);

        var legMat = new THREE.MeshLambertMaterial({ color: 0x224488 });
        SG.playerLeftLeg = rememberLegacyPart(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.15), legMat));
        SG.playerLeftLeg.position.set(-0.15, 0.2, 0);
        SG.player.add(SG.playerLeftLeg);
        SG.playerRightLeg = rememberLegacyPart(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.15), legMat));
        SG.playerRightLeg.position.set(0.15, 0.2, 0);
        SG.player.add(SG.playerRightLeg);

        // Shoes (for Double Jump / Roof Walk abilities, initially hidden)
        var shoeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        SG.shoesLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.18), shoeMat);
        SG.shoesLeft.position.set(-0.15, 0.03, 0.04);
        SG.shoesLeft.visible = false;
        SG.player.add(SG.shoesLeft);
        SG.shoesRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.18), shoeMat);
        SG.shoesRight.position.set(0.15, 0.03, 0.04);
        SG.shoesRight.visible = false;
        SG.player.add(SG.shoesRight);

        // Double Jump shoe overlay (blue/white sneaker look)
        var djMat = new THREE.MeshLambertMaterial({ color: 0x3399ff });
        SG.shoesDJLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.2), djMat);
        SG.shoesDJLeft.position.set(-0.15, 0.035, 0.04);
        SG.shoesDJLeft.visible = false;
        SG.player.add(SG.shoesDJLeft);
        SG.shoesDJRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.2), djMat);
        SG.shoesDJRight.position.set(0.15, 0.035, 0.04);
        SG.shoesDJRight.visible = false;
        SG.player.add(SG.shoesDJRight);

        // Roof Walk shoes (golden with glow)
        var rwMat = new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0xffa500, emissiveIntensity: 0.5 });
        SG.shoesRWLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.22), rwMat);
        SG.shoesRWLeft.position.set(-0.15, 0.04, 0.04);
        SG.shoesRWLeft.visible = false;
        SG.player.add(SG.shoesRWLeft);
        SG.shoesRWRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.22), rwMat);
        SG.shoesRWRight.position.set(0.15, 0.04, 0.04);
        SG.shoesRWRight.visible = false;
        SG.player.add(SG.shoesRWRight);

        // Jetpack pack: GLB model plus two flame emitters.
        SG.jetpackPack = new THREE.Group();
        SG.jetpackPack.name = 'JetpackPack';
        SG.jetpackFlameGroups = [];
        function createJetpackFlame(side) {
            var flameGroup = new THREE.Group();
            flameGroup.name = side < 0 ? 'JetpackFlameLeft' : 'JetpackFlameRight';
            flameGroup.position.set(side * 0.14, -0.32, 0.01);
            flameGroup.visible = false;

            var outer = new THREE.Mesh(
                new THREE.ConeGeometry(0.075, 0.36, 10),
                new THREE.MeshBasicMaterial({ color: 0xff5a00, transparent: true, opacity: 0.88 })
            );
            outer.position.y = -0.06;
            flameGroup.add(outer);

            var inner = new THREE.Mesh(
                new THREE.ConeGeometry(0.038, 0.23, 10),
                new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.95 })
            );
            inner.position.y = -0.02;
            flameGroup.add(inner);

            SG.jetpackPack.add(flameGroup);
            SG.jetpackFlameGroups.push(flameGroup);
            return flameGroup;
        }
        var leftFlame = createJetpackFlame(-1);
        var rightFlame = createJetpackFlame(1);
        SG.jetpackFlame = leftFlame.children[0];
        SG.jetpackFlameInner = leftFlame.children[1];
        SG.jetpackFlameRight = rightFlame.children[0];
        SG.jetpackFlameRightInner = rightFlame.children[1];
        SG.jetpackPack.position.set(0, 0.72, -0.24);
        SG.jetpackPack.visible = false;
        SG.player.add(SG.jetpackPack);
        SG.loadJetpackModel();

        SG.scene.add(SG.player);
        SG.loadPlayerModel();
        return SG.player;
    };
})();


// ===== ENDLESS RUNNER - Track System =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.createTrackSegment = function(zPos) {
        var group = new THREE.Group();
        group.position.z = zPos;

        var isPvp = !!(SG.state && SG.state.pvpMode);
        var groundMat = isPvp
            ? new THREE.MeshPhongMaterial({ color: 0x05060b, emissive: 0x14031f, shininess: 96, transparent: true, opacity: 0.88 })
            : (SG.createTrackGroundMaterial ? SG.createTrackGroundMaterial() : new THREE.MeshLambertMaterial({ color: 0x4a4a4e }));
        var ground = new THREE.Mesh(new THREE.BoxGeometry(SG.GROUND_WIDTH, 0.2, SG.TRACK_SEGMENT_LENGTH), groundMat);
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        ground.userData.pvpGlassTrack = isPvp;
        group.add(ground);

        var markMat = isPvp
            ? new THREE.MeshBasicMaterial({ color: 0x8d35ff, transparent: true, opacity: 0.92 })
            : (SG.createLanePaintMaterial ? SG.createLanePaintMaterial() : new THREE.MeshBasicMaterial({ color: 0x6a6a6e }));
        for (var lane = -1; lane <= 1; lane += 2) {
            var mark = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, SG.TRACK_SEGMENT_LENGTH - 2), markMat);
            mark.position.set(lane * (SG.LANE_WIDTH / 2), 0.01, 0);
            group.add(mark);
        }

        var curbMat = isPvp
            ? new THREE.MeshBasicMaterial({ color: 0xff2ccf })
            : (SG.createCurbMaterial ? SG.createCurbMaterial() : new THREE.MeshLambertMaterial({ color: 0x5a5a5a }));
        for (var side = -1; side <= 1; side += 2) {
            var curb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, SG.TRACK_SEGMENT_LENGTH), curbMat);
            curb.position.set(side * (SG.GROUND_WIDTH / 2 + 0.25), 0.1, 0);
            curb.receiveShadow = true;
            curb.userData.pvpNeonEdge = isPvp;
            group.add(curb);
            if (isPvp) {
                var glow = new THREE.Mesh(
                    new THREE.BoxGeometry(0.08, 0.04, SG.TRACK_SEGMENT_LENGTH),
                    new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff2ccf : 0x9b4dff, transparent: true, opacity: 0.82 })
                );
                glow.position.set(side * (SG.GROUND_WIDTH / 2 + 0.46), 0.24, 0);
                glow.userData.pvpNeonGlow = true;
                group.add(glow);
            }
        }

        group.userData.pvpTrack = isPvp;
        return group;
    };

    SG.spawnInitialTrack = function() {
        for (var z = 0; z > -SG.SPAWN_AHEAD; z -= SG.TRACK_SEGMENT_LENGTH) {
            var seg = SG.createTrackSegment(z);
            SG.scene.add(seg);
            SG.state.trackSegments.push(seg);
        }
    };
})();


// ===== ENDLESS RUNNER - Buildings & Scenery =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.sceneryModelPaths = SG.sceneryModelPaths || {
        buildings: [
            'models/scenery/buildings/building1_small.glb',
            'models/scenery/buildings/building2_small.glb',
            'models/scenery/buildings/building3_small.glb',
            'models/scenery/buildings/building4.glb',
            'models/scenery/buildings/house2.glb'
        ],
        trees: [
            'models/scenery/trees/tree_1.glb',
            'models/scenery/trees/tree_4.glb',
            'models/scenery/trees/tree_7.glb',
            'models/scenery/trees/pine_1.glb',
            'models/scenery/trees/birch_2.glb'
        ]
    };
    SG.sceneryModels = SG.sceneryModels || { buildings: [], trees: [] };

    function tintSceneryModel(type, model) {
        if (type !== 'trees') return;
        model.traverse(function(node) {
            if (!node || !node.isMesh || !node.material) return;
            var mats = Array.isArray(node.material) ? node.material : [node.material];
            var name = ((node.name || '') + ' ' + (node.material.name || '')).toLowerCase();
            var isWood = name.indexOf('trunk') >= 0 || name.indexOf('bark') >= 0 || name.indexOf('wood') >= 0 || name.indexOf('stem') >= 0;
            for (var mi = 0; mi < mats.length; mi++) {
                var mat = mats[mi];
                if (!mat || !mat.color) continue;
                mat.color.setHex(isWood ? 0x6B4A2D : 0x2E7D32);
                mat.needsUpdate = true;
            }
        });
    }

    SG.loadSceneryModels = function() {
        if (!THREE || !THREE.GLTFLoader || SG.sceneryModelsLoading) return;
        SG.sceneryModelsLoading = true;
        var loader = new THREE.GLTFLoader();
        ['buildings', 'trees'].forEach(function(type) {
            SG.sceneryModelPaths[type].forEach(function(url) {
                loader.load(url, function(gltf) {
                    var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
                    if (!model) return;
                    model.name = type + '-scenery-model';
                    model.traverse(function(node) {
                        if (node && node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });
                    tintSceneryModel(type, model);
                    SG.sceneryModels[type].push(model);
                }, undefined, function(err) {
                    SG.sceneryModelError = err;
                });
            });
        });
    };

    SG.cloneSceneryModel = function(type) {
        var list = SG.sceneryModels && SG.sceneryModels[type];
        if (!list || !list.length) return null;
        var source = list[Math.floor(Math.random() * list.length)];
        return source.clone(true);
    };

    function createAssetScenery(type, x, z) {
        var model = SG.cloneSceneryModel(type);
        if (!model) return null;
        var group = new THREE.Group();
        group.position.set(x, 0, z);
        var scale = type === 'buildings' ? 1.28 + Math.random() * 0.16 : 0.86 + Math.random() * 0.34;
        model.scale.multiplyScalar(scale);
        model.rotation.y = type === 'buildings'
            ? (Math.random() < 0.5 ? 0 : Math.PI / 2)
            : Math.random() * Math.PI * 2;
        group.add(model);
        group.userData.sceneryType = type;
        group.userData.depth = type === 'buildings' ? 4.8 * scale : 2.2 * scale;
        SG.scene.add(group);
        return group;
    }

    SG.THEME_COLORS = [
        { // 0: City
            bg: 0x87CEEB, fog: 0x87CEEB, ground: 0x4a4a4e, laneMark: 0x6a6a6e, curb: 0x5a5a5a,
            buildings: [0x8B7355, 0x6B8E8B, 0x9B8B6B, 0x7B6B5B, 0x5B7B6B, 0x8B7B5B]
        },
        { // 1: Forest
            bg: 0x4CAF50, fog: 0x4CAF50, ground: 0x5D4037, laneMark: 0x6D4C41, curb: 0x4E342E,
            buildings: [0x5D4037, 0x6A4E37, 0x4C7A3A, 0x3E6B2F, 0x7B6B3B, 0x8B5E3C]
        },
        { // 2: Desert
            bg: 0xE8C170, fog: 0xE8C170, ground: 0xC2A670, laneMark: 0xD4C080, curb: 0xB8956A,
            buildings: [0xD4A86A, 0xC2956A, 0xB88A5A, 0xC8A878, 0xD8B888, 0xA8884A]
        },
        { // 3: Ocean/Arctic
            bg: 0x1a5276, fog: 0x1a5276, ground: 0x85C1E9, laneMark: 0xAED6F1, curb: 0x7FB3D8,
            buildings: [0x85C1E9, 0xAED6F1, 0x5DADE2, 0x7FB3D8, 0x95C8E0, 0xB8D8F0]
        }
    ];

    SG.THEME_DISTANCE_THRESHOLDS = {
        forest: 260,
        desert: 760,
        arctic: 1350
    };

    SG.createScenery = function(x, z) {
        var group = new THREE.Group();
        group.position.set(x, 0, z);
        var theme = SG.state.theme || 0;

        if (theme === 0) {
            var cityAsset = createAssetScenery('buildings', x, z);
            if (cityAsset) return cityAsset;
            if (SG.sceneryModelPaths.buildings && SG.sceneryModelPaths.buildings.length) return null;
            var colors = [0x8B7355, 0x6B8E8B, 0x9B8B6B, 0x7B6B5B, 0x5B7B6B, 0x8B7B5B];
            var h = 5 + Math.random() * 7;
            var w = 2.2 + Math.random() * 1.2;
            var d = 2.2 + Math.random() * 1.2;
            var mesh = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, d),
                new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] })
            );
            mesh.position.y = h / 2;
            group.add(mesh);
        } else if (theme === 1) {
            var treeAsset = createAssetScenery('trees', x, z);
            if (treeAsset) return treeAsset;
            if (SG.sceneryModelPaths.trees && SG.sceneryModelPaths.trees.length) return null;
            var trunkH = 2 + Math.random() * 3;
            var trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.2, trunkH, 6),
                new THREE.MeshLambertMaterial({ color: 0x5D4037 })
            );
            trunk.position.y = trunkH / 2;
            group.add(trunk);
            var folColor = [0x2E7D32, 0x388E3C, 0x43A047, 0x1B5E20][Math.floor(Math.random() * 4)];
            var folMat = new THREE.MeshLambertMaterial({ color: folColor });
            for (var i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
                var cone = new THREE.Mesh(new THREE.ConeGeometry(0.8 - i * 0.15, 0.7, 6), folMat);
                cone.position.set(0, trunkH + 0.2 + i * 0.5, 0);
                group.add(cone);
            }
            if (Math.random() > 0.5) {
                var bush = new THREE.Mesh(
                    new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 6, 5),
                    new THREE.MeshLambertMaterial({ color: 0x66BB6A })
                );
                bush.position.set((Math.random() - 0.5) * 0.8, 0.3, (Math.random() - 0.5) * 0.8);
                group.add(bush);
            }
        } else if (theme === 2) {
            if (Math.random() > 0.4) {
                var cacMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
                var main = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2 + Math.random() * 2, 6), cacMat);
                main.position.y = 1 + Math.random();
                group.add(main);
                for (var a = 0; a < 2; a++) {
                    var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.8 + Math.random() * 0.5, 6), cacMat);
                    arm.position.set((a === 0 ? -0.25 : 0.25), 0.6 + Math.random() * 0.8, 0);
                    arm.rotation.z = a === 0 ? 0.5 : -0.5;
                    group.add(arm);
                }
            } else {
                var rock = new THREE.Mesh(
                    new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.6),
                    new THREE.MeshLambertMaterial({ color: 0xA1887F })
                );
                rock.position.y = 0.3 + Math.random() * 0.3;
                rock.rotation.set(Math.random(), Math.random(), Math.random());
                rock.scale.set(1, 0.5 + Math.random() * 0.5, 1);
                group.add(rock);
            }
        } else {
            var iceMat = new THREE.MeshLambertMaterial({ color: 0xB3E5FC });
            if (Math.random() > 0.3) {
                var pillar = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.3, 0.5, 2 + Math.random() * 4, 7),
                    iceMat
                );
                pillar.position.y = 1 + Math.random() * 2;
                pillar.scale.x = 0.6 + Math.random() * 0.8;
                group.add(pillar);
                var sparkle = new THREE.Mesh(
                    new THREE.SphereGeometry(0.05, 4, 4),
                    new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
                );
                sparkle.position.set(0, pillar.position.y + 0.3, 0.2);
                group.add(sparkle);
            } else {
                var mound = new THREE.Mesh(
                    new THREE.SphereGeometry(0.6 + Math.random() * 0.5, 6, 5),
                    iceMat
                );
                mound.position.y = 0.3;
                mound.scale.set(1, 0.4, 1);
                group.add(mound);
            }
        }

        SG.scene.add(group);
        return group;
    };

    SG.getScenerySpacing = function(theme) {
        if (theme === 0) return 10.8;
        if (theme === 1) return 5.2;
        return 6.5;
    };

    SG.getSceneryRowCount = function(theme) {
        if (theme === 0) return 1;
        if (theme === 1 && Math.random() > 0.45) return 2;
        return 1;
    };

    SG.spawnSceneryRow = function(z, side, row) {
        var theme = SG.state.theme || 0;
        var base = SG.GROUND_WIDTH / 2 + (theme === 0 ? 2.25 : 1.7);
        var laneOffset = theme === 0 ? row * 3.9 : row * 2.25;
        var jitter = theme === 0 ? 0 : (Math.random() - 0.5) * 0.7;
        var x = side * (base + laneOffset + jitter);
        var zJitter = theme === 0 ? 0 : (Math.random() - 0.5) * 0.9;
        return SG.createScenery(x, z + zJitter);
    };

    SG.canPlaceScenery = function(x, z, depth) {
        var minDepth = depth || 6;
        for (var i = 0; i < SG.state.buildings.length; i++) {
            var other = SG.state.buildings[i];
            if (!other || !other.position) continue;
            if (Math.abs(other.position.x - x) > 1.2) continue;
            var otherDepth = other.userData && other.userData.depth ? other.userData.depth : minDepth;
            var minGap = (minDepth + otherDepth) * 0.5 + 1.2;
            if (Math.abs(other.position.z - z) < minGap) return false;
        }
        return true;
    };

    SG.addSceneryRow = function(z, side, row) {
        var theme = SG.state.theme || 0;
        var base = SG.GROUND_WIDTH / 2 + (theme === 0 ? 2.25 : 1.7);
        var laneOffset = theme === 0 ? row * 3.9 : row * 2.25;
        var x = side * (base + laneOffset);
        var expectedDepth = theme === 0 ? 7.0 : 3.5;
        if (!SG.canPlaceScenery(x, z, expectedDepth)) return null;
        var scenery = SG.spawnSceneryRow(z, side, row);
        if (!scenery) return null;
        SG.state.buildings.push(scenery);
        return scenery;
    };

    SG.spawnBuildings = function() {
        for (var i = SG.state.buildings.length - 1; i >= 0; i--) {
            if (SG.state.buildings[i].position.z > SG.DESPAWN_BEHIND) {
                SG.disposeObject(SG.state.buildings[i]);
                SG.scene.remove(SG.state.buildings[i]);
                SG.state.buildings.splice(i, 1);
            }
        }

        var farthestZ = SG.state.buildings.length > 0
            ? Math.min.apply(null, SG.state.buildings.map(function(b) { return b.position.z; }))
            : 0;

        var theme = SG.state.theme || 0;
        var spacing = SG.getScenerySpacing(theme);
        var startZ = SG.state.buildings.length > 0 ? farthestZ - spacing : 0;
        for (var z = startZ; z > -SG.SPAWN_AHEAD; z -= spacing) {
            for (var side = -1; side <= 1; side += 2) {
                var rows = SG.getSceneryRowCount(theme);
                for (var row = 0; row < rows; row++) {
                    if (theme !== 0 && Math.random() < 0.18) continue;
                    SG.addSceneryRow(z - row * spacing * 0.5, side, row);
                }
            }
        }
    };

    // ===== THEME SYSTEM =====
    SG.switchTheme = function(themeIndex) {
        if (themeIndex === SG.state.theme || themeIndex < 0 || themeIndex > 3) return;
        SG.state.theme = themeIndex;

        var theme = SG.THEME_COLORS[themeIndex];
        SG.scene.background.setHex(theme.bg);
        SG.scene.fog.color.setHex(theme.fog);
        SG.scene.fog.near = themeIndex >= 2 ? 40 : 60;
        SG.scene.fog.far = themeIndex >= 2 ? 90 : 120;
        if (SG.updateSkyDome) SG.updateSkyDome(themeIndex, 'normal');
        if (SG.updateLightRigForTheme) SG.updateLightRigForTheme(themeIndex);

        for (var si = 0; si < SG.state.trackSegments.length; si++) {
            var seg = SG.state.trackSegments[si];
            seg.children.forEach(function(child) {
                if (!child.isMesh || !child.material || !child.material.color) return;
                if (child.geometry.type === 'BoxGeometry' && child.geometry.parameters.height === 0.2) {
                    child.material.color.setHex(theme.ground);
                }
                if (child.geometry.parameters.height === 0.01) {
                    child.material.color.setHex(theme.laneMark);
                }
                if (child.geometry.parameters.height === 0.3) {
                    child.material.color.setHex(theme.curb);
                }
            });
        }

        for (var bi = SG.state.buildings.length - 1; bi >= 0; bi--) {
            var b = SG.state.buildings[bi];
            SG.disposeObject(b);
            SG.scene.remove(b);
        }
        SG.state.buildings = [];
        var spawnAhead = SG.state.started ? SG.SPAWN_AHEAD : 200;
        var spacing = SG.getScenerySpacing(themeIndex);
        for (var z = 0; z > -spawnAhead; z -= spacing) {
            for (var side = -1; side <= 1; side += 2) {
                var rows = SG.getSceneryRowCount(themeIndex);
                for (var row = 0; row < rows; row++) {
                    if (themeIndex !== 0 && Math.random() < 0.18) continue;
                    SG.addSceneryRow(z - row * spacing * 0.5, side, row);
                }
            }
        }

        for (var oi = 0; oi < SG.state.obstacles.length; oi++) {
            var obs = SG.state.obstacles[oi];
            obs.children.forEach(function(child) {
                if (!child.isMesh || !child.material || !child.material.color) return;
                var hex = child.material.color.getHex();
                if (hex === 0xE53935 || hex === 0x1E88E5 || hex === 0x43A047 || hex === 0xFB8C00 || hex === 0x8E24AA) {
                    var trainColors = themeIndex === 0 ? [0xE53935, 0x1E88E5, 0x43A047, 0xFB8C00, 0x8E24AA] :
                        themeIndex === 1 ? [0x6A1B9A, 0x2E7D32, 0x1565C0, 0xE65100, 0x4E342E] :
                        themeIndex === 2 ? [0xD84315, 0xFF8F00, 0xC62828, 0xEF6C00, 0xBF360C] :
                        [0x00ACC1, 0x00838F, 0x0277BD, 0x00695C, 0x4DD0E1];
                    child.material.color.setHex(trainColors[Math.floor(Math.random() * trainColors.length)]);
                }
            });
        }
    };

    SG.checkThemeChange = function() {
        var score = Math.floor(SG.state.score);
        var newTheme = 0;
        if (score >= SG.THEME_DISTANCE_THRESHOLDS.arctic) newTheme = 3;
        else if (score >= SG.THEME_DISTANCE_THRESHOLDS.desert) newTheme = 2;
        else if (score >= SG.THEME_DISTANCE_THRESHOLDS.forest) newTheme = 1;
        if (newTheme !== SG.state.theme) {
            SG.switchTheme(newTheme);
        }
    };
})();


// ===== ENDLESS RUNNER - Obstacles =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.vehicleModels = SG.vehicleModels || {};
    SG.vehicleModelPaths = SG.vehicleModelPaths || {
        train: 'models/vehicles/train.glb',
        bus: 'models/vehicles/bus.glb'
    };

    SG.loadVehicleModels = function() {
        if (!THREE || !THREE.GLTFLoader || SG.vehicleModelsLoading) return;
        SG.vehicleModelsLoading = true;
        var loader = new THREE.GLTFLoader();
        Object.keys(SG.vehicleModelPaths).forEach(function(key) {
            loader.load(SG.vehicleModelPaths[key], function(gltf) {
                var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
                if (!model) return;
                model.name = key + '-vehicle-model';
                model.traverse(function(node) {
                    if (node && node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                SG.vehicleModels[key] = model;
            }, undefined, function(err) {
                SG.vehicleModelError = err;
            });
        });
    };

    SG.cloneVehicleModel = function(key) {
        var source = SG.vehicleModels && SG.vehicleModels[key];
        if (!source) return null;
        var clone = source.clone(true);
        clone.name = key + '-vehicle-obstacle';
        return clone;
    };

    SG.getObstacleLanes = function(obstacle) {
        if (!obstacle || !obstacle.userData) return [];
        if (Array.isArray(obstacle.userData.blockedLanes)) return obstacle.userData.blockedLanes.slice();
        if (obstacle.userData.type === 'full_barrier' || obstacle.userData.moving) return [0, 1, 2];
        if (typeof obstacle.userData.lane === 'number') return [obstacle.userData.lane];
        return [0, 1, 2];
    };

    SG.getObstacleDepth = function(obstacle) {
        if (!obstacle || !obstacle.userData) return 2;
        var depth = obstacle.userData.visualDepth || obstacle.userData.depth || 2;
        if (obstacle.userData.hasRamp) depth = Math.max(depth, 9.5);
        if (obstacle.userData.moving) depth += 1.5;
        return depth;
    };

    SG.obstacleLanesOverlap = function(a, b) {
        for (var i = 0; i < a.length; i++) {
            if (b.indexOf(a[i]) >= 0) return true;
        }
        return false;
    };

    SG.canPlaceObstacle = function(obstacle, z) {
        var lanes = SG.getObstacleLanes(obstacle);
        var depth = SG.getObstacleDepth(obstacle);
        for (var i = 0; i < SG.state.obstacles.length; i++) {
            var other = SG.state.obstacles[i];
            if (!other || !other.userData) continue;
            if (!SG.obstacleLanesOverlap(lanes, SG.getObstacleLanes(other))) continue;
            var minGap = (depth + SG.getObstacleDepth(other)) * 0.5 + 2.0;
            if (Math.abs(other.position.z - z) < minGap) return false;
        }
        return true;
    };

    SG.trackObstacle = function(obstacle, lane, z) {
        if (!obstacle) return false;
        if (!SG.canPlaceObstacle(obstacle, z)) {
            SG.disposeObject(obstacle);
            return false;
        }
        SG.scene.add(obstacle);
        SG.state.obstacles.push(obstacle);
        SG.state.coinObstacleMap.set(obstacle.uuid, []);
        SG.spawnCoinsNearObstacle(obstacle, lane, z);
        return true;
    };

    SG.canPlaceCoinAt = function(lane, z, ignoreObstacle) {
        for (var i = 0; i < SG.state.obstacles.length; i++) {
            var obstacle = SG.state.obstacles[i];
            if (!obstacle || obstacle === ignoreObstacle) continue;
            var lanes = SG.getObstacleLanes(obstacle);
            if (lanes.indexOf(lane) < 0) continue;
            var minGap = SG.getObstacleDepth(obstacle) * 0.5 + 1.1;
            if (Math.abs(obstacle.position.z - z) < minGap) return false;
        }
        if (ignoreObstacle) {
            var ignoreLanes = SG.getObstacleLanes(ignoreObstacle);
            if (ignoreLanes.indexOf(lane) >= 0) {
                var ignoreGap = SG.getObstacleDepth(ignoreObstacle) * 0.5 + 1.1;
                if (Math.abs(ignoreObstacle.position.z - z) < ignoreGap) return false;
            }
        }
        return true;
    };

    SG.findSafeCoinLane = function(preferred, z, ignoreObstacle) {
        var lanes = [preferred, (preferred + 1) % 3, (preferred + 2) % 3];
        for (var i = 0; i < lanes.length; i++) {
            if (SG.canPlaceCoinAt(lanes[i], z, ignoreObstacle)) return lanes[i];
        }
        return -1;
    };

    SG.addSafeCoin = function(lane, z, yOffset, ignoreObstacle, mapEntry) {
        var safeLane = SG.findSafeCoinLane(lane, z, ignoreObstacle);
        if (safeLane < 0) return null;
        var coin = SG.createCoin(safeLane, z, yOffset);
        SG.scene.add(coin);
        SG.state.coinObjects.push(coin);
        if (mapEntry) mapEntry.push(coin);
        return coin;
    };

    SG.vehicleColorPalette = SG.vehicleColorPalette || [
        0xE53935, 0x1E88E5, 0x43A047, 0xFB8C00,
        0x8E24AA, 0x00ACC1, 0xFDD835, 0x6D4C41
    ];

    SG.pickVehicleColor = function() {
        var palette = SG.vehicleColorPalette || [0xE53935];
        SG.vehicleColorIndex = (SG.vehicleColorIndex || 0) + 1;
        return palette[(SG.vehicleColorIndex - 1) % palette.length];
    };

    SG.tintVehicleModel = function(model, color) {
        if (!model || !model.traverse || !THREE || !THREE.Color) return;
        var tint = new THREE.Color(color);
        model.traverse(function(node) {
            if (!node || !node.isMesh || !node.material) return;
            var mats = Array.isArray(node.material) ? node.material : [node.material];
            var tinted = mats.map(function(mat) {
                if (!mat || !mat.clone) return mat;
                var clone = mat.clone();
                if (clone.color) {
                    var base = clone.color.clone();
                    var brightness = (base.r + base.g + base.b) / 3;
                    if (brightness > 0.16) {
                        clone.color.copy(base.lerp(tint, 0.58));
                    }
                }
                clone.needsUpdate = true;
                return clone;
            });
            node.material = Array.isArray(node.material) ? tinted : tinted[0];
        });
    };

    SG.createTrain = function(lane, zPos, isMoving) {
        var group = new THREE.Group();
        var laneX = SG.LANE_POSITIONS[lane];
        var moving = (isMoving !== false) && Math.random() < 0.18;
        var mainColor = SG.pickVehicleColor();
        var model = SG.cloneVehicleModel('train');

        if (model) {
            model.rotation.y = Math.PI;
            SG.tintVehicleModel(model, mainColor);
            group.add(model);
            group.userData.assetModel = 'train.glb';
            group.userData.vehicleColor = mainColor;
        } else {
            if (SG.vehicleModelPaths.train) return null;
            var body = new THREE.Mesh(
                new THREE.BoxGeometry(2.4, 1.8, 6),
                new THREE.MeshLambertMaterial({ color: mainColor })
            );
            group.userData.vehicleColor = mainColor;
            body.position.set(0, 0.9, 0);
            group.add(body);

            var winMat = new THREE.MeshBasicMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.7 });
            for (var i = -1; i <= 1; i++) {
                for (var side = -1; side <= 1; side += 2) {
                    var win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.05), winMat);
                    win.position.set(side * 1.21, 1.0, i * 1.5);
                    group.add(win);
                }
            }

            var roof = new THREE.Mesh(
                new THREE.BoxGeometry(2.0, 0.1, 5.6),
                new THREE.MeshLambertMaterial({ color: 0xDDDDDD })
            );
            roof.position.set(0, 1.85, 0);
            group.add(roof);

            var doorMat = new THREE.MeshBasicMaterial({ color: 0xCCCCCC });
            var door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.6), doorMat);
            door.position.set(0, 0.8, 0);
            group.add(door);

            var lightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFAA });
            for (var side2 = -1; side2 <= 1; side2 += 2) {
                var l = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.05), lightMat);
                l.position.set(side2 * 0.6, 0.5, 3.05);
                group.add(l);
            }
        }

        var hasRamp = Math.random() < 0.3;
        if (hasRamp) {
            var rampMat = SG.createWarningPanelMaterial ? SG.createWarningPanelMaterial() : new THREE.MeshLambertMaterial({ color: 0xFF6600 });
            var ramp = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.07, 2.35), rampMat);
            ramp.position.set(0, 0.9, 4.5);
            ramp.rotation.x = 0.65;
            ramp.userData.rampSurface = true;
            group.add(ramp);
            var railMat = SG.createDarkMetalMaterial ? SG.createDarkMetalMaterial() : new THREE.MeshLambertMaterial({ color: 0xDD4400 });
            for (var side3 = -1; side3 <= 1; side3 += 2) {
                var r = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.36, 2.35), railMat);
                r.position.set(side3 * 0.78, 1.12, 4.5);
                r.rotation.x = 0.65;
                group.add(r);
            }
            var warnMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            for (var i2 = -2; i2 <= 2; i2++) {
                if (i2 === 0) continue;
                var s = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.02, 0.045), warnMat);
                s.position.set(0, 0.03, 4.5 + i2 * 0.5);
                group.add(s);
            }
            var tipMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
            var tip = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.10, 0.045), tipMat);
            tip.position.set(0, 0.05, 5.8);
            group.add(tip);

            group.userData.hasRamp = true;
            group.userData.rampWidth = 1.55;
        }

        group.position.set(laneX, 0, zPos);
        group.userData.type = 'train';
        group.userData.lane = lane;
        group.userData.width = 2.0;
        group.userData.height = 1.8;
        group.userData.depth = 5.5;
        group.userData.visualDepth = hasRamp ? 9.5 : 5.8;
        group.userData.hasRamp = hasRamp;
        group.userData.moving = moving;
        if (moving) {
            group.userData.moveDir = 1;
            group.userData.movePhase = Math.random() * Math.PI * 2;
            group.userData.baseX = laneX;
            group.userData.warningLights = [];
            var warnMat2 = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
            for (var side4 = -1; side4 <= 1; side4 += 2) {
                for (var end = -1; end <= 1; end += 2) {
                    var flash = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.05), warnMat2);
                    flash.position.set(side4 * 1.25, 0.9, end * 2.9);
                    group.add(flash);
                    group.userData.warningLights.push(flash);
                }
            }
        }
        return group;
    };

    SG.createBarrier = function(lane, zPos) {
        var group = new THREE.Group();
        var laneX = SG.LANE_POSITIONS[lane];

        var barrier = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.6, 1.0),
            SG.createWarningPanelMaterial ? SG.createWarningPanelMaterial() : new THREE.MeshLambertMaterial({ color: 0xFF6600 })
        );
        barrier.position.set(0, 0.3, 0);
        group.add(barrier);

        var stripeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        for (var i = -2; i <= 2; i++) {
            var s = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.08), stripeMat);
            s.position.set(i * 0.2, 0.4 + (i % 2) * 0.1, 0.55);
            s.rotation.x = 0.1;
            group.add(s);
        }
        for (var i2 = -2; i2 <= 2; i2++) {
            var s2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.08), stripeMat);
            s2.position.set(i2 * 0.2, 0.4 + ((i2+1) % 2) * 0.1, -0.55);
            s2.rotation.x = -0.1;
            group.add(s2);
        }

        var cap = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.08, 0.9),
            new THREE.MeshLambertMaterial({ color: 0xFF8844 })
        );
        cap.position.set(0, 0.65, 0);
        group.add(cap);

        group.position.set(laneX, 0, zPos);
        group.userData = { type: 'barrier', lane: lane, width: 1.6, height: 0.6, depth: 1.0, visualDepth: 1.4 };
        return group;
    };

    SG.createFullLaneBarrier = function(zPos, openLane) {
        var group = new THREE.Group();
        openLane = (typeof openLane === 'number' && openLane >= 0 && openLane <= 2) ? openLane : Math.floor(Math.random() * 3);
        var blockedLanes = [0, 1, 2].filter(function(lane) { return lane !== openLane; });

        var beamMat = SG.createWarningPanelMaterial ? SG.createWarningPanelMaterial() : new THREE.MeshLambertMaterial({ color: 0xFF4444 });
        var stripeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        var laneBeamWidth = Math.min(SG.LANE_WIDTH * 0.78, 1.7);
        for (var bi = 0; bi < blockedLanes.length; bi++) {
            var lane = blockedLanes[bi];
            var laneX = SG.LANE_POSITIONS[lane];
            var beam = new THREE.Mesh(new THREE.BoxGeometry(laneBeamWidth, 0.5, 1.2), beamMat);
            beam.position.set(laneX, 0.25, 0);
            group.add(beam);

            var stripe = new THREE.Mesh(new THREE.BoxGeometry(laneBeamWidth * 0.9, 0.05, 0.05), stripeMat);
            stripe.position.set(laneX, 0.5, 0.6);
            group.add(stripe);
            var stripe2 = stripe.clone();
            stripe2.position.z = -0.6;
            group.add(stripe2);
        }

        var postMat = SG.createDarkMetalMaterial ? SG.createDarkMetalMaterial() : new THREE.MeshLambertMaterial({ color: 0x888888 });
        var postXs = [
            SG.LANE_POSITIONS[0] - laneBeamWidth / 2 - 0.12,
            SG.LANE_POSITIONS[2] + laneBeamWidth / 2 + 0.12
        ];
        for (var side = 0; side < postXs.length; side++) {
            var post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.15), postMat);
            post.position.set(postXs[side], 0.35, 0);
            group.add(post);
            var light = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 4, 4),
                new THREE.MeshBasicMaterial({ color: 0xFF0000 })
            );
            light.position.set(postXs[side], 0.75, 0);
            group.add(light);
        }

        group.position.set(0, 0, zPos);
        group.userData = {
            type: 'full_barrier',
            openLane: openLane,
            blockedLanes: blockedLanes,
            width: laneBeamWidth,
            height: 0.5,
            depth: 1.2,
            visualDepth: 1.6
        };
        return group;
    };

    SG.createLowFlyingObstacle = function(lane, zPos) {
        var group = new THREE.Group();
        var laneX = SG.LANE_POSITIONS[lane];

        var bodyMat = SG.createWarningPanelMaterial ? SG.createWarningPanelMaterial() : new THREE.MeshLambertMaterial({ color: 0xFF3300 });
        var body = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.25, 1.0),
            bodyMat
        );
        body.position.set(0, 0.9, 0);
        group.add(body);

        var armMat = SG.createDarkMetalMaterial ? SG.createDarkMetalMaterial() : new THREE.MeshLambertMaterial({ color: 0xDD8800 });
        for (var i = -1; i <= 1; i += 2) {
            var arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), armMat);
            arm.position.set(i * 0.3, 1.05, 0);
            group.add(arm);
            var rotor = new THREE.Mesh(
                new THREE.CylinderGeometry(0.22, 0.22, 0.02, 6),
                new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.6 })
            );
            rotor.position.set(i * 0.3, 1.08, 0);
            group.add(rotor);
        }

        var beaconMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        var beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), beaconMat);
        beacon.position.set(0, 1.1, 0);
        group.add(beacon);

        var glowMat = new THREE.MeshBasicMaterial({ color: 0xFF8800, transparent: true, opacity: 0.5 });
        var glow = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.2, 0.1, 8), glowMat);
        glow.position.set(0, 0.75, 0);
        group.add(glow);

        var hudMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.4 });
        for (var side = -1; side <= 1; side += 2) {
            var hstrip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.8), hudMat);
            hstrip.position.set(side * 0.6, 0.9, 0);
            group.add(hstrip);
        }

        group.position.set(laneX, 0, zPos);
        group.userData = { type: 'low_flying', lane: lane, width: 1.0, height: 0.8, depth: 0.8, visualDepth: 1.2, yOffset: 0.8 };
        return group;
    };

    SG.createRollUnderTrain = function(lane, zPos) {
        var group = new THREE.Group();
        var laneX = SG.LANE_POSITIONS[lane];

        var top = new THREE.Mesh(
            new THREE.BoxGeometry(1.42, 0.28, 3.75),
            SG.createWarningPanelMaterial ? SG.createWarningPanelMaterial() : new THREE.MeshLambertMaterial({ color: 0xFF6600 })
        );
        top.position.set(0, 1.18, 0);
        group.add(top);

        var stripe = new THREE.Mesh(
            new THREE.BoxGeometry(1.24, 0.035, 3.45),
            new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
        );
        stripe.position.set(0, 0.98, 0);
        group.add(stripe);

        var supMat = SG.createDarkMetalMaterial ? SG.createDarkMetalMaterial() : new THREE.MeshLambertMaterial({ color: 0x555555 });
        for (var side = -1; side <= 1; side += 2) {
            var sup = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.34, 0.10), supMat);
            sup.position.set(side * 0.66, 0.67, 0);
            group.add(sup);
        }

        var warnMat = new THREE.MeshBasicMaterial({ color: 0xFFCC00 });
        for (var side2 = -1; side2 <= 1; side2 += 2) {
            for (var end = -1; end <= 1; end += 2) {
                var w = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), warnMat);
                w.position.set(side2 * 0.72, 0.96, end * 1.78);
                group.add(w);
            }
        }

        var markerMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        for (var side3 = -1; side3 <= 1; side3 += 2) {
            for (var end2 = -1; end2 <= 1; end2 += 2) {
                var m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), markerMat);
                m.position.set(side3 * 0.60, 0.1, end2 * 2.12);
                group.add(m);
            }
        }

        group.position.set(laneX, 0, zPos);
        group.userData = { type: 'roll_under', lane: lane, width: 1.35, height: 0.28, depth: 3.75, visualDepth: 4.1, yOffset: 1.18 };
        return group;
    };

    // ===== OBSTACLE SPAWNING =====
    SG.spawnObstacles = function() {
        for (var i = SG.state.obstacles.length - 1; i >= 0; i--) {
            if (SG.state.obstacles[i].position.z > SG.DESPAWN_BEHIND) {
                SG.disposeObject(SG.state.obstacles[i]);
                SG.scene.remove(SG.state.obstacles[i]);
                SG.state.obstacles.splice(i, 1);
            }
        }

        if (SG.state.obstacles.length === 0) {
            var positions = [];
            var initGap = [30, 20, 15][SG.state.difficulty] || 15;
            var initCount = [10, 15, 20][SG.state.difficulty] || 20;
            for (var zi = -30; zi > -initGap * initCount; zi -= initGap) positions.push(zi);
            for (var pi = 0; pi < positions.length; pi++) {
                var z = positions[pi];
                if (pi % 5 === 0 && Math.random() < 0.5) {
                    var openLane = Math.floor(Math.random() * 3);
                    var lanes = [0,1,2].filter(function(l) { return l !== openLane; });
                    for (var li = 0; li < lanes.length; li++) {
                        var lane = lanes[li];
                        var obs;
                        var t = Math.random();
                        if (t < 0.55) obs = SG.createTrain(lane, z, false);
                        else if (t < 0.80) obs = SG.createLowFlyingObstacle(lane, z);
                        else obs = SG.createRollUnderTrain(lane, z);
                        SG.trackObstacle(obs, lane, z);
                    }
                } else {
                    var lane2 = pi % 3;
                    var type = Math.random();
                    if (type >= 0.4 && type < 0.55) {
                        var hasRollNearby = SG.state.obstacles.some(function(o) {
                            return o.userData.type === 'roll_under' &&
                                Math.abs(o.position.z - positions[pi]) < 10;
                        });
                        if (hasRollNearby) type = 0.8;
                    }
                    var obs2;
                    if (type < 0.35) obs2 = SG.createTrain(lane2, z, false);
                    else if (type < 0.60) obs2 = SG.createLowFlyingObstacle(lane2, z);
                    else if (type < 0.75) obs2 = SG.createFullLaneBarrier(z);
                    else obs2 = SG.createRollUnderTrain(lane2, z);
                    SG.trackObstacle(obs2, lane2, z);
                }
            }
            for (var zc = -5; zc > -28; zc -= 5) {
                var coin = SG.createCoin(Math.floor(Math.random() * 3), zc, 0.3);
                SG.scene.add(coin);
                SG.state.coinObjects.push(coin);
            }
            return;
        }

        var ahead = SG.state.obstacles.filter(function(o) {
            return o.position.z > -90 && o.position.z < 0;
        });

        var diffMult = [0.4, 0.7, 1.0][SG.state.difficulty] || 1.0;
        var targetCount = Math.min(Math.floor((6 + SG.state.speed * 6) * diffMult), Math.floor(18 * diffMult));
        var spawnZ = -(45 + SG.state.speed * 30 * diffMult) - Math.random() * 15 * diffMult;

        if (ahead.length < targetCount) {
            var z2 = spawnZ;
            var rowProbe = { position: { z: z2 }, userData: { type: 'row_probe', lane: 1, depth: 1.0, visualDepth: 1.0 } };
            var zBlocked = !SG.canPlaceObstacle(rowProbe, z2);
            if (!zBlocked) {
                if (Math.random() < 0.10) {
                    var openLane2 = Math.floor(Math.random() * 3);
                    var lanes2 = [0,1,2].filter(function(l) { return l !== openLane2; });
                    for (var li2 = 0; li2 < lanes2.length; li2++) {
                        var lane3 = lanes2[li2];
                        var obs3;
                        var t2 = Math.random();
                        if (t2 < 0.55) obs3 = SG.createTrain(lane3, z2, true);
                        else if (t2 < 0.80) obs3 = SG.createLowFlyingObstacle(lane3, z2);
                        else obs3 = SG.createRollUnderTrain(lane3, z2);
                        SG.trackObstacle(obs3, lane3, z2);
                    }
                } else {
                    var busy = new Set();
                    for (var oi = 0; oi < ahead.length; oi++) {
                        if (ahead[oi].position.z > z2 - 10) {
                            var lv = Math.round((ahead[oi].position.x + SG.LANE_WIDTH) / SG.LANE_WIDTH);
                            if (lv >= 0 && lv <= 2) busy.add(lv);
                        }
                    }
                    var safe = [0,1,2].filter(function(l) { return !busy.has(l); });
                    var lane4 = safe.length > 0 ? safe[Math.floor(Math.random() * safe.length)] : Math.floor(Math.random() * 3);

                    var type2 = Math.random();
                    if (type2 >= 0.4 && type2 < 0.55) {
                        var hasRollUnderNearby = SG.state.obstacles.some(function(o) {
                            return o.userData.type === 'roll_under' &&
                                Math.abs(o.position.z - z2) < 10;
                        });
                        if (hasRollUnderNearby) type2 = 0.8;
                    }
                    if (type2 >= 0.55) {
                        var hasRampNearby = SG.state.obstacles.some(function(o) {
                            return o.userData.hasRamp &&
                                Math.abs(o.position.z - z2) < 8;
                        });
                        if (hasRampNearby) type2 = 0.3;
                    }

                    var obs4;
                    if (type2 < 0.35) obs4 = SG.createTrain(lane4, z2, true);
                    else if (type2 < 0.60) obs4 = SG.createLowFlyingObstacle(lane4, z2);
                    else if (type2 < 0.75) obs4 = SG.createFullLaneBarrier(z2);
                    else obs4 = SG.createRollUnderTrain(lane4, z2);
                    SG.trackObstacle(obs4, lane4, z2);
                }
            }
        }
    };

    SG.spawnCoinsNearObstacle = function(obstacle, lane, z) {
        var coinChance = Math.random();
        var depth = SG.getObstacleDepth(obstacle);
        var safeStartZ = z - depth * 0.5 - 2.4;
        var mapEntry = SG.state.coinObstacleMap.get(obstacle.uuid);
        if (coinChance < 0.5) {
            var coinLane = Math.floor(Math.random() * 3);
            while (coinLane === lane && Math.random() > 0.3) {
                coinLane = (coinLane + 1) % 3;
            }
            SG.addSafeCoin(coinLane, safeStartZ - Math.random() * 4, 0.3, obstacle, mapEntry);
        } else if (coinChance < 0.7) {
            var coinLane2 = Math.floor(Math.random() * 3);
            while (coinLane2 === lane && Math.random() > 0.4) {
                coinLane2 = (coinLane2 + 1) % 3;
            }
            var patterns = ['line', 'arc', 'double', 'zigzag', 'arc', 'zigzag'];
            var pattern = patterns[Math.floor(Math.random() * patterns.length)];
            var coins = SG.createCoinPattern(coinLane2, safeStartZ - 1.0, pattern);
            var mapEntry2 = SG.state.coinObstacleMap.get(obstacle.uuid);
            for (var ci = 0; ci < coins.length; ci++) {
                var coin = coins[ci];
                var coinLane = Math.round((coin.position.x + SG.LANE_WIDTH) / SG.LANE_WIDTH);
                if (coinLane < 0 || coinLane > 2 || !SG.canPlaceCoinAt(coinLane, coin.position.z, obstacle)) {
                    SG.disposeObject(coin);
                    continue;
                }
                SG.scene.add(coin);
                SG.state.coinObjects.push(coin);
                if (mapEntry2) mapEntry2.push(coin);
            }
        }
    };
})();


// ===== ENDLESS RUNNER - Coins =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.createCoin = function(lane, zPos, yOffset) {
        var group = new THREE.Group();
        var laneX = SG.LANE_POSITIONS[lane];

        var coinY = 0.6 + (yOffset || 0);
        var goldMat = new THREE.MeshLambertMaterial({ color: 0xFFD34D, emissive: 0x5a3200, emissiveIntensity: 0.18 });
        var rimMat = new THREE.MeshLambertMaterial({ color: 0xFFAA00, emissive: 0x6c3900, emissiveIntensity: 0.25 });
        var darkDetailMat = new THREE.MeshBasicMaterial({ color: 0x7A3B00 });
        var brightMat = new THREE.MeshBasicMaterial({ color: 0xFFF4B8, transparent: true, opacity: 0.9 });

        var coin = new THREE.Mesh(
            new THREE.CylinderGeometry(SG.COIN_RADIUS, SG.COIN_RADIUS, 0.1, 16),
            goldMat
        );
        coin.rotation.x = Math.PI / 2;
        coin.position.set(0, coinY, 0);
        group.add(coin);

        var outerRim = new THREE.Mesh(
            new THREE.TorusGeometry(SG.COIN_RADIUS * 0.92, 0.035, 6, 24),
            rimMat
        );
        outerRim.position.set(0, coinY, 0.06);
        group.add(outerRim);

        var innerRim = new THREE.Mesh(
            new THREE.TorusGeometry(SG.COIN_RADIUS * 0.48, 0.018, 6, 20),
            darkDetailMat
        );
        innerRim.position.set(0, coinY, 0.065);
        group.add(innerRim);

        var glow = new THREE.Mesh(
            new THREE.RingGeometry(SG.COIN_RADIUS * 0.55, SG.COIN_RADIUS * 1.22, 18),
            new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.25 })
        );
        glow.rotation.x = Math.PI / 2;
        glow.position.set(0, coinY, 0);
        group.add(glow);

        var star = new THREE.Shape();
        for (var si = 0; si < 10; si++) {
            var radius = si % 2 === 0 ? SG.COIN_RADIUS * 0.28 : SG.COIN_RADIUS * 0.12;
            var angle = -Math.PI / 2 + si * Math.PI / 5;
            var sx = Math.cos(angle) * radius;
            var sy = Math.sin(angle) * radius;
            if (si === 0) star.moveTo(sx, sy);
            else star.lineTo(sx, sy);
        }
        star.closePath();
        var emblem = new THREE.Mesh(
            new THREE.ShapeGeometry(star),
            darkDetailMat
        );
        emblem.position.set(0, coinY, 0.071);
        group.add(emblem);

        var highlight = new THREE.Mesh(
            new THREE.CircleGeometry(SG.COIN_RADIUS * 0.08, 12),
            brightMat
        );
        highlight.position.set(0, coinY, 0.076);
        group.add(highlight);

        group.position.set(laneX, 0, zPos);
        for (var ci = 0; ci < group.children.length; ci++) {
            group.children[ci].userData.baseY = group.children[ci].position.y;
        }
        group.userData = { lane: lane, collected: false, baseCoinY: coinY, coinDetail: 'high-contrast-centered-detail' };
        return group;
    };

    SG.createCoinPattern = function(lane, zPos, pattern) {
        var coins = [];
        var fn;
        if (pattern === 'arc') {
            fn = function() {
                for (var i = 0; i < 6; i++) {
                    var l = Math.max(0, Math.min(2, lane + Math.round(Math.sin(i * 1.2) * 1.2)));
                    var yOff = Math.sin(i * 1.0) * 0.3 + 0.4;
                    coins.push(SG.createCoin(l, zPos - i * 2.0, yOff));
                }
            };
        } else if (pattern === 'line') {
            fn = function() { for (var i = 0; i < 5; i++) coins.push(SG.createCoin(lane, zPos - i * 2.2, 0.2)); };
        } else if (pattern === 'double') {
            fn = function() {
                var lanes = [Math.max(0, lane - 1), Math.min(2, lane + 1)];
                for (var i = 0; i < 4; i++) {
                    coins.push(SG.createCoin(lanes[i % 2], zPos - i * 1.8, 0.2));
                }
            };
        } else if (pattern === 'single') {
            fn = function() { coins.push(SG.createCoin(lane, zPos, 0.3)); };
        } else if (pattern === 'zigzag') {
            fn = function() {
                for (var i = 0; i < 4; i++) {
                    var l = i % 2 === 0 ? lane : Math.max(0, Math.min(2, lane + (i < 2 ? 1 : -1)));
                    coins.push(SG.createCoin(l, zPos - i * 2.0, 0.3));
                }
            };
        } else {
            fn = function() { coins.push(SG.createCoin(lane, zPos, 0.3)); };
        }
        fn();
        return coins;
    };
})();


// ===== ENDLESS RUNNER - Gun Pickups =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var THREE = window.THREE;

    SG.GUN_DURATION = 30;
    SG.GUN_SPAWN_MIN = 10;
    SG.GUN_SPAWN_MAX = 16;
    SG.gunModels = SG.gunModels || {};
    SG.gunModelPaths = SG.gunModelPaths || {
        pistol: 'models/guns/pistol.glb',
        longPistol: 'models/guns/long-pistol.glb',
        rifle: 'models/guns/rifle.glb',
        sniper: 'models/guns/sniper-rifle.glb'
    };
    SG.gunCatalog = SG.gunCatalog || [
        { id: 'pistol', name: 'Pistol', modelKey: 'pistol', power: 1.0, fireInterval: 0.34, color: 0x4be7ff, range: 36, pickupScale: 1.0, viewScale: 1.0 },
        { id: 'longPistol', name: 'Long Pistol', modelKey: 'longPistol', power: 1.55, fireInterval: 0.26, color: 0x86ff7a, range: 42, pickupScale: 1.0, viewScale: 1.0 },
        { id: 'rifle', name: 'Rifle', modelKey: 'rifle', power: 2.35, fireInterval: 0.2, color: 0xffd34e, range: 50, pickupScale: 1.0, viewScale: 1.05 },
        { id: 'sniper', name: 'Sniper Rifle', modelKey: 'sniper', power: 3.4, fireInterval: 0.16, color: 0xff5fd7, range: 58, pickupScale: 1.0, viewScale: 1.12 }
    ];

    SG.tuneGunMaterials = function(root, def) {
        if (!root || !root.traverse) return;
        root.traverse(function(node) {
            if (!node || !node.isMesh || !node.material) return;
            var mats = Array.isArray(node.material) ? node.material : [node.material];
            for (var i = 0; i < mats.length; i++) {
                var mat = mats[i];
                if (!mat || !mat.color) continue;
                if (mat.emissive) mat.emissive.setHex(0x000000);
                mat.emissiveIntensity = 0;
                mat.needsUpdate = true;
            }
        });
    };

    SG.getGunDef = function(id) {
        for (var i = 0; i < SG.gunCatalog.length; i++) {
            if (SG.gunCatalog[i].id === id) return SG.gunCatalog[i];
        }
        return SG.gunCatalog[0];
    };

    SG.loadGunModels = function() {
        if (!THREE || !THREE.GLTFLoader || SG.gunModelsLoading) return;
        SG.gunModelsLoading = true;
        var loader = new THREE.GLTFLoader();
        Object.keys(SG.gunModelPaths).forEach(function(key) {
            loader.load(SG.gunModelPaths[key], function(gltf) {
                var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
                if (!model) return;
                model.name = key + '-gun-model';
                model.traverse(function(node) {
                    if (!node || !node.isMesh) return;
                    node.castShadow = true;
                    node.receiveShadow = true;
                });
                var def = SG.getGunDef(Object.keys(SG.gunModelPaths).filter(function(id) { return SG.gunModelPaths[id] === SG.gunModelPaths[key]; })[0]);
                SG.tuneGunMaterials(model, def);
                SG.gunModels[key] = model;
            }, undefined, function(err) {
                SG.gunModelError = err;
            });
        });
    };

    SG.cloneGunModel = function(def, forView) {
        def = def || SG.gunCatalog[0];
        var source = SG.gunModels && SG.gunModels[def.modelKey];
        if (!source) return SG.createFallbackGunModel(def, forView);
        var clone = source.clone(true);
        clone.name = def.id + (forView ? '-view-gun' : '-pickup-gun');
        clone.scale.multiplyScalar(forView ? def.viewScale : def.pickupScale);
        SG.tuneGunMaterials(clone, def);
        return clone;
    };

    SG.createFallbackGunModel = function(def, forView) {
        var group = new THREE.Group();
        group.name = def.id + '-fallback-gun';
        var bodyMat = new THREE.MeshStandardMaterial({ color: 0x1b2434, roughness: 0.55, metalness: 0.2 });
        var accentMat = new THREE.MeshStandardMaterial({ color: def.color || 0x4be7ff, emissive: def.color || 0x4be7ff, emissiveIntensity: 0.25, roughness: 0.4 });
        var len = def.id === 'sniper' ? 1.8 : def.id === 'rifle' ? 1.5 : def.id === 'longPistol' ? 1.15 : 0.9;
        var body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, len), bodyMat);
        body.position.y = 0.18;
        group.add(body);
        var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len * 0.62, 12), accentMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.24, -len * 0.38);
        group.add(barrel);
        var grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.18), bodyMat);
        grip.rotation.x = -0.35;
        grip.position.set(0, -0.08, len * 0.18);
        group.add(grip);
        group.scale.setScalar(forView ? 1.0 : 0.9);
        return group;
    };

    SG.createGunPickup = function(lane, z, def) {
        def = def || SG.gunCatalog[Math.floor(Math.random() * SG.gunCatalog.length)];
        var group = new THREE.Group();
        group.name = def.id + '-pickup';
        group.position.set(SG.LANE_POSITIONS[lane], 0.16, z);
        var model = SG.cloneGunModel(def, false);
        model.rotation.set(-0.08, 0, 0);
        model.position.y = 0.22;
        group.add(model);

        var ringMat = new THREE.MeshBasicMaterial({
            color: def.color,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide
        });
        var ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 28), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.03;
        group.add(ring);

        var light = new THREE.PointLight(def.color, 0.45, 3.2);
        light.position.y = 0.65;
        group.add(light);

        group.userData = {
            type: 'gun_pickup',
            lane: lane,
            gunId: def.id,
            gunName: def.name,
            color: def.color,
            collected: false
        };
        return group;
    };

    SG.canPlaceGunPickup = function(lane, z) {
        if (SG.state.homelander) return false;
        if (!SG.canPlaceCoinAt || !SG.canPlaceCoinAt(lane, z, null)) return false;
        for (var i = 0; i < SG.state.gunPickups.length; i++) {
            if (Math.abs(SG.state.gunPickups[i].position.z - z) < 24) return false;
        }
        return true;
    };

    SG.spawnGunPickups = function(delta) {
        if (!SG.state.started || SG.state.gameOver || SG.state.paused || SG.state.homelander) return;
        SG.state.gunSpawnTimer -= delta;
        if (SG.state.gunSpawnTimer > 0) return;
        SG.state.gunSpawnTimer = SG.GUN_SPAWN_MIN + Math.random() * (SG.GUN_SPAWN_MAX - SG.GUN_SPAWN_MIN);
        if (SG.state.gunPickups.length >= 2) return;

        var z = -(42 + Math.random() * 46);
        var lane = Math.floor(Math.random() * SG.LANE_COUNT);
        for (var tries = 0; tries < 6 && !SG.canPlaceGunPickup(lane, z); tries++) {
            lane = (lane + 1) % SG.LANE_COUNT;
            z -= 8;
        }
        if (!SG.canPlaceGunPickup(lane, z)) return;
        var def = SG.gunCatalog[Math.floor(Math.random() * SG.gunCatalog.length)];
        var pickup = SG.createGunPickup(lane, z, def);
        SG.scene.add(pickup);
        SG.state.gunPickups.push(pickup);
    };

    SG.collectGunPickup = function(pickup) {
        if (!pickup || pickup.userData.collected || SG.state.homelander) return false;
        var def = SG.getGunDef(pickup.userData.gunId);
        pickup.userData.collected = true;
        SG.state.activeGun = {
            id: def.id,
            name: def.name,
            power: def.power,
            fireInterval: def.fireInterval,
            range: def.range,
            color: def.color
        };
        SG.state.gunTimer = SG.GUN_DURATION;
        SG.state.gunShotCooldown = 0;
        if (SG.scene) SG.scene.remove(pickup);
        var idx = SG.state.gunPickups.indexOf(pickup);
        if (idx >= 0) SG.state.gunPickups.splice(idx, 1);
        if (SG.disposeObject) SG.disposeObject(pickup);
        SG.refreshGunViewModel();
        SG.updateGunCrosshair();
        SG.flashGunHUD('Picked up ' + def.name);
        return true;
    };

    SG.clearActiveGun = function() {
        SG.state.activeGun = null;
        SG.state.gunTimer = 0;
        SG.state.gunShotCooldown = 0;
        if (SG.gunViewModel) SG.gunViewModel.visible = false;
        if (SG.playerGunModel) SG.playerGunModel.visible = false;
        SG.updateGunCrosshair();
        SG.updateGunHUD();
    };

    SG.clearGunSystem = function() {
        for (var i = 0; i < SG.state.gunPickups.length; i++) {
            if (SG.scene) SG.scene.remove(SG.state.gunPickups[i]);
            if (SG.disposeObject) SG.disposeObject(SG.state.gunPickups[i]);
        }
        SG.state.gunPickups = [];
        SG.state.gunSpawnTimer = 6;
        SG.clearActiveGun();
    };

    SG.refreshGunViewModel = function() {
        if (!THREE || !SG.scene) return;
        if (SG.gunViewModel) {
            SG.scene.remove(SG.gunViewModel);
            if (SG.disposeObject) SG.disposeObject(SG.gunViewModel);
        }
        if (SG.playerGunModel && SG.player) {
            SG.player.remove(SG.playerGunModel);
            if (SG.disposeObject) SG.disposeObject(SG.playerGunModel);
        }
        SG.gunViewModel = new THREE.Group();
        SG.gunViewModel.name = 'first-person-gun-viewmodel';
        var def = SG.getGunDef(SG.state.activeGun && SG.state.activeGun.id);
        var model = SG.cloneGunModel(def, true);
        model.position.set(0, -0.02, 0);
        model.rotation.set(0.12, 0, 0);
        SG.gunViewModel.add(model);
        SG.gunViewModel.visible = false;
        SG.scene.add(SG.gunViewModel);

        SG.playerGunModel = new THREE.Group();
        SG.playerGunModel.name = 'third-person-held-gun';
        var held = SG.cloneGunModel(def, false);
        held.position.set(0, 0, 0);
        held.rotation.set(0.08, Math.PI, 0);
        held.scale.multiplyScalar(0.82);
        SG.playerGunModel.add(held);
        SG.playerGunModel.position.set(-0.34, 0.66, 0.02);
        SG.playerGunModel.rotation.set(0, 0, 0);
        SG.playerGunModel.visible = false;
        if (SG.player) SG.player.add(SG.playerGunModel);
    };

    SG.updateGunViewModel = function() {
        if (!SG.gunViewModel || !SG.camera) return;
        var show = !!(SG.state.firstPerson && SG.state.activeGun && SG.state.gunTimer > 0 && !SG.state.homelander && SG.state.started && !SG.state.paused && !SG.state.gameOver);
        SG.gunViewModel.visible = show;
        if (SG.playerGunModel) {
            SG.playerGunModel.visible = !!(!SG.state.firstPerson && SG.state.activeGun && SG.state.gunTimer > 0 && !SG.state.homelander && SG.state.started && !SG.state.paused && !SG.state.gameOver);
        }
        if (SG.updateGunCrosshair) SG.updateGunCrosshair();
        if (!show) return;
        var forward = new THREE.Vector3();
        var right = new THREE.Vector3(1, 0, 0).applyQuaternion(SG.camera.quaternion);
        var down = new THREE.Vector3(0, -1, 0).applyQuaternion(SG.camera.quaternion);
        SG.camera.getWorldDirection(forward);
        SG.gunViewModel.position.copy(SG.camera.position)
            .add(right.multiplyScalar(0.34))
            .add(down.multiplyScalar(0.4))
            .add(forward.multiplyScalar(0.82));
        SG.gunViewModel.quaternion.copy(SG.camera.quaternion);
    };

    SG.getGunMuzzlePosition = function() {
        if (!THREE || !SG.player) return null;
        if (SG.state.firstPerson && SG.camera) {
            var forward = new THREE.Vector3();
            var right = new THREE.Vector3(1, 0, 0).applyQuaternion(SG.camera.quaternion);
            var down = new THREE.Vector3(0, -1, 0).applyQuaternion(SG.camera.quaternion);
            SG.camera.getWorldDirection(forward);
            return SG.camera.position.clone()
                .add(right.multiplyScalar(0.34))
                .add(down.multiplyScalar(0.27))
                .add(forward.multiplyScalar(1.12));
        }
        return SG.player.position.clone().add(new THREE.Vector3(0.32, 0.92, -0.58));
    };

    SG.findGunTarget = function() {
        if (!SG.state.activeGun || !SG.player) return null;
        var lane = SG.state.currentLane;
        var best = null;
        var bestZ = -9999;
        var range = SG.state.activeGun.range || 40;
        for (var i = 0; i < SG.state.obstacles.length; i++) {
            var obs = SG.state.obstacles[i];
            if (!obs || !obs.userData || obs.userData.type === 'train') continue;
            if (obs.position.z > 2 || obs.position.z < -range) continue;
            var lanes = SG.getObstacleLanes ? SG.getObstacleLanes(obs) : [obs.userData.lane];
            if (lanes.indexOf(lane) < 0) continue;
            if (obs.position.z > bestZ) {
                best = obs;
                bestZ = obs.position.z;
            }
        }
        return best;
    };

    SG.getObstacleGunHp = function(obstacle) {
        if (!obstacle || !obstacle.userData) return 3;
        if (typeof obstacle.userData.gunHp === 'number') return obstacle.userData.gunHp;
        var type = obstacle.userData.type;
        if (type === 'full_barrier') return 4.4;
        if (type === 'roll_under') return 3.3;
        if (type === 'low_flying') return 2.7;
        if (type === 'barrier') return 2.4;
        return 3.2;
    };

    SG.destroyObstacleByGun = function(obstacle) {
        if (!obstacle || !SG.scene) return;
        var idx = SG.state.obstacles.indexOf(obstacle);
        if (idx >= 0) SG.state.obstacles.splice(idx, 1);
        if (SG.state.coinObstacleMap) SG.state.coinObstacleMap.delete(obstacle.uuid);
        var pos = obstacle.position.clone();
        SG.scene.remove(obstacle);
        if (SG.disposeObject) SG.disposeObject(obstacle);
        if (SG.spawnDestroyParticles) SG.spawnDestroyParticles(pos);
    };

    SG.createGunBeam = function(target) {
        if (!THREE || !SG.scene || !SG.player || !SG.state.activeGun) return;
        var start = SG.getGunMuzzlePosition() || SG.player.position.clone();
        var forward = new THREE.Vector3(0, 0, -1);
        if (SG.camera) SG.camera.getWorldDirection(forward);
        var end = target ? target.position.clone() : start.clone().add(forward.multiplyScalar(SG.state.activeGun.range));
        end.y += target ? Math.min(target.userData.height || 1, 1.1) * 0.55 : 0;
        var dir = end.clone().sub(start);
        var len = Math.max(0.1, dir.length());
        var shotColor = SG.state.activeGun.color || 0xffe34d;
        var mat = new THREE.MeshBasicMaterial({
            color: shotColor,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, len, 12), mat);
        beam.position.copy(start).add(dir.clone().multiplyScalar(0.5));
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
        beam.userData = { vx: 0, vy: 0, vz: 0, life: 1, decay: 0.18 };
        SG.scene.add(beam);
        SG.state.particles.push(beam);

        var glowMat = new THREE.MeshBasicMaterial({
            color: SG.state.activeGun.color || 0x4be7ff,
            transparent: true,
            opacity: 0.42,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        var glow = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, len, 12), glowMat);
        glow.position.copy(beam.position);
        glow.quaternion.copy(beam.quaternion);
        glow.userData = { vx: 0, vy: 0, vz: 0, life: 1, decay: 0.22 };
        SG.scene.add(glow);
        SG.state.particles.push(glow);

        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xfff36a,
            transparent: true,
            opacity: 0.98,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        var flash = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), flashMat);
        flash.position.copy(start);
        flash.userData = { vx: 0, vy: 0, vz: 0, life: 1, decay: 0.32 };
        SG.scene.add(flash);
        SG.state.particles.push(flash);
    };

    SG.playGunSound = function() {
        if (!SG.audioCtx || SG.state.muted) return;
        SG.scheduleSound(0, function(t) {
            try {
                var sfx = SG.state.sfxVolume || 0.8;
                var master = SG.audioCtx.createGain();
                master.gain.setValueAtTime(0.32 * sfx, t);
                master.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
                master.connect(SG.audioCtx.destination);

                var body = SG.audioCtx.createOscillator();
                body.type = 'sawtooth';
                body.frequency.setValueAtTime(150, t);
                body.frequency.exponentialRampToValueAtTime(58, t + 0.11);
                body.connect(master);
                body.start(t);
                body.stop(t + 0.16);

                var crack = SG.audioCtx.createOscillator();
                crack.type = 'square';
                crack.frequency.setValueAtTime(1250, t);
                crack.frequency.exponentialRampToValueAtTime(310, t + 0.045);
                crack.connect(master);
                crack.start(t);
                crack.stop(t + 0.055);

                var bufferSize = Math.floor(SG.audioCtx.sampleRate * 0.055);
                var buffer = SG.audioCtx.createBuffer(1, bufferSize, SG.audioCtx.sampleRate);
                var data = buffer.getChannelData(0);
                for (var i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
                }
                var noise = SG.audioCtx.createBufferSource();
                var noiseGain = SG.audioCtx.createGain();
                noise.buffer = buffer;
                noiseGain.gain.setValueAtTime(0.22 * sfx, t);
                noiseGain.gain.linearRampToValueAtTime(0, t + 0.055);
                noise.connect(noiseGain);
                noiseGain.connect(SG.audioCtx.destination);
                noise.start(t);
            } catch(e) {}
        });
    };

    SG.shootGun = function() {
        if (!SG.state.started || SG.state.paused || SG.state.gameOver || SG.state.homelander) return false;
        if (!SG.state.activeGun || SG.state.gunTimer <= 0 || SG.state.gunShotCooldown > 0) return false;
        if (!SG.audioCtx && SG.initAudio) SG.initAudio();
        SG.state.gunShotCooldown = SG.state.activeGun.fireInterval || 0.24;
        var target = SG.findGunTarget();
        SG.createGunBeam(target);
        SG.playGunSound();
        if (target) {
            var hp = SG.getObstacleGunHp(target) - SG.state.activeGun.power;
            target.userData.gunHp = hp;
            if (hp <= 0) SG.destroyObstacleByGun(target);
        }
        return true;
    };

    SG.flashGunHUD = function(text) {
        var el = document.getElementById('gun-hud');
        if (!el) return;
        el.textContent = text;
        el.style.display = 'block';
        el.style.borderColor = 'rgba(75,231,255,0.55)';
    };

    SG.updateGunHUD = function() {
        var el = document.getElementById('gun-hud');
        if (!el) return;
        if (!SG.state.activeGun || SG.state.gunTimer <= 0 || SG.state.homelander) {
            el.style.display = 'none';
            SG.updateGunCrosshair();
            return;
        }
        el.style.display = 'block';
        el.textContent = 'GUN: ' + SG.state.activeGun.name + '  ' + SG.state.gunTimer.toFixed(1) + 's';
        SG.updateGunCrosshair();
    };

    SG.updateGunCrosshair = function() {
        var el = document.getElementById('gun-crosshair');
        if (!el) return;
        var show = !!(SG.state.firstPerson && SG.state.activeGun && SG.state.gunTimer > 0 && !SG.state.homelander && SG.state.started && !SG.state.paused && !SG.state.gameOver);
        el.style.display = show ? 'block' : 'none';
        el.style.visibility = show ? 'visible' : 'hidden';
        el.style.opacity = show ? '1' : '0';
    };

    SG.updateGunSystem = function(delta) {
        SG.spawnGunPickups(delta);

        for (var i = SG.state.gunPickups.length - 1; i >= 0; i--) {
            var pickup = SG.state.gunPickups[i];
            pickup.position.z += SG.state.speed * delta * 60;
            pickup.rotation.y += delta * 1.8;
            var bob = Math.sin(SG.state.gameTime * 3 + pickup.id) * 0.08;
            if (pickup.children[0]) pickup.children[0].position.y = 0.22 + bob;
            if (!SG.state.homelander && SG.player) {
                var dx = Math.abs(SG.player.position.x - pickup.position.x);
                var dz = Math.abs(SG.player.position.z - pickup.position.z);
                if (dx < 0.85 && dz < 0.9) {
                    SG.collectGunPickup(pickup);
                    continue;
                }
            }
            if (pickup.position.z > SG.DESPAWN_BEHIND) {
                SG.scene.remove(pickup);
                SG.state.gunPickups.splice(i, 1);
                if (SG.disposeObject) SG.disposeObject(pickup);
            }
        }

        if (SG.state.gunShotCooldown > 0) SG.state.gunShotCooldown = Math.max(0, SG.state.gunShotCooldown - delta);
        if (SG.state.activeGun && SG.state.gunTimer > 0 && !SG.state.homelander) {
            SG.state.gunTimer = Math.max(0, SG.state.gunTimer - delta);
            if (SG.state.gunTimer <= 0) SG.clearActiveGun();
        }
        if (SG.state.homelander && SG.state.activeGun) SG.clearActiveGun();
        SG.updateGunViewModel();
        SG.updateGunHUD();
    };
})();


// ===== ENDLESS RUNNER - Particles =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.createCoinParticles = function(position) {
        for (var i = 0; i < 5; i++) {
            var p = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 4, 4),
                new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 1 })
            );
            p.position.copy(position);
            p.userData = { vx: (Math.random() - 0.5) * 0.3, vy: Math.random() * 0.2 + 0.1, vz: (Math.random() - 0.5) * 0.3, life: 1.0, decay: 0.025 };
            SG.scene.add(p);
            SG.state.particles.push(p);
        }
    };

    SG.createCrashParticles = function(position) {
        for (var i = 0; i < 10; i++) {
            var p = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.06, 0.06),
                new THREE.MeshBasicMaterial({ color: [0xff4444, 0xff8800, 0xffcc00][Math.floor(Math.random() * 3)], transparent: true, opacity: 1 })
            );
            p.position.copy(position);
            var speed = 0.15 + Math.random() * 0.2;
            var theta = Math.random() * Math.PI * 2;
            var phi = Math.random() * Math.PI;
            p.userData = {
                vx: Math.sin(phi) * Math.cos(theta) * speed,
                vy: Math.sin(phi) * Math.sin(theta) * speed + 0.1,
                vz: Math.cos(phi) * speed,
                life: 1.0, decay: 0.02
            };
            SG.scene.add(p);
            SG.state.particles.push(p);
        }
    };

    SG.spawnDestroyParticles = function(pos) {
        if (SG.state.particles.length > 300) return;

        var colors = [0xFF4400, 0xFFAA00, 0xFF6600, 0xFFFF00, 0xFF2200];
        var count = 6;

        var flash = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0xFFAA00, transparent: true, opacity: 1 })
        );
        flash.position.copy(pos);
        flash.userData = { vx: 0, vy: 0, vz: 0, life: 0.4, decay: 0.04, scale: true };
        SG.scene.add(flash);
        SG.state.particles.push(flash);

        for (var i = 0; i < count; i++) {
            var p = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.1, 0.1),
                new THREE.MeshBasicMaterial({
                    color: colors[i % colors.length],
                    transparent: true,
                    opacity: 1
                })
            );
            p.position.copy(pos);
            p.position.x += (Math.random() - 0.5) * 0.8;
            p.position.y += Math.random() * 0.3;
            p.position.z += (Math.random() - 0.5) * 0.8;
            var speed2 = 0.12 + Math.random() * 0.2;
            var theta2 = Math.random() * Math.PI * 2;
            var phi2 = Math.random() * Math.PI * 0.7;
            p.userData = {
                vx: Math.sin(phi2) * Math.cos(theta2) * speed2,
                vy: Math.sin(phi2) * Math.sin(theta2) * speed2 + 0.15,
                vz: Math.cos(phi2) * speed2,
                life: 0.8 + Math.random() * 0.3,
                decay: 0.025 + Math.random() * 0.02
            };
            SG.scene.add(p);
            SG.state.particles.push(p);
        }
    };
})();


// ===== ENDLESS RUNNER - Collision Detection =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

    SG.checkCollisions = function() {
        if (SG.state.homelander) return false;
        var playerPos = SG.player.position;
        var state = SG.state;
        var playerHitbox = {
            x: playerPos.x,
            y: playerPos.y + (state.isRolling ? 0.1 : 0.7),
            z: playerPos.z,
            w: 0.4,
            h: state.isRolling ? 0.3 : 1.2,
            d: 0.3
        };

        for (var i = 0; i < state.obstacles.length; i++) {
            var obs = state.obstacles[i];
            var od = obs.userData;

            if (state.onRoof) continue;
            if (state.jumpingFromRoof && od.type === 'train') {
                if (Math.abs(playerPos.z - obs.position.z) < 4) continue;
            }

            var obsY, obsH;
            if (od.type === 'roll_under') {
                obsY = od.yOffset || 1.28;
                obsH = od.height || 0.38;
            } else if (od.type === 'low_flying') {
                obsY = 1.0;
                obsH = 0.8;
            } else {
                obsY = obs.position.y + (od.height || 0.6) / 2;
                obsH = od.height || 0.6;
            }

            var obsBox = {
                x: obs.position.x,
                y: obsY,
                z: obs.position.z,
                w: od.width || 1.6,
                h: obsH,
                d: od.depth || 1.0
            };

            if (od.type === 'roll_under' && state.isRolling) continue;

            if (od.type === 'low_flying') {
                if (state.isRolling) continue;
                if (state.isJumping && state.playerHeight > 0.9) continue;
            }

            if (od.type === 'full_barrier') {
                if (Array.isArray(od.blockedLanes)) {
                    var playerLane = state.currentLane;
                    var nearestDist = Infinity;
                    for (var li = 0; li < SG.LANE_POSITIONS.length; li++) {
                        var laneDist = Math.abs(playerPos.x - SG.LANE_POSITIONS[li]);
                        if (laneDist < nearestDist) {
                            nearestDist = laneDist;
                            playerLane = li;
                        }
                    }
                    if (od.blockedLanes.indexOf(playerLane) < 0) continue;
                    obsBox.x = SG.LANE_POSITIONS[playerLane];
                    obsBox.w = od.width || 1.6;
                }
                if (state.isJumping && state.playerHeight > 0.9) continue;
            }

            if (od.type === 'train' && od.hasRamp && !state.onRoof) {
                var trainBack = obs.position.z + (od.depth || 5.5) / 2;
                var rampReach = (od.rampWidth || 2.0) / 2 + playerHitbox.w / 2;
                if (playerPos.z >= trainBack - 1.5 && playerPos.z <= trainBack + 3.5 &&
                    Math.abs(playerPos.x - obsBox.x) < rampReach) {
                    state.onRoof = true;
                    continue;
                }
            }

            if (state.onRoof && od.type === 'train') continue;

            var dx = Math.abs(playerHitbox.x - obsBox.x);
            var dz = Math.abs(playerHitbox.z - obsBox.z);
            var dy = Math.abs(playerHitbox.y - obsBox.y);
            var zThreshold = (playerHitbox.d + obsBox.d) / 2 + 0.1;

            if (state.equippedAbility === 3 && state.canRoofWalk && !state.onRoof) {
                var obsTop = obsBox.y + obsH / 2;
                var playerBottom = playerHitbox.y - playerHitbox.h / 2;
                if (playerBottom >= obsTop - 0.1) {
                    var sideHit = dx < (playerHitbox.w + obsBox.w) / 2 && dz < zThreshold;
                    if (sideHit && playerBottom >= obsTop - 0.1) {
                        state.onRoof = true;
                        state.playerHeight = obsTop + 0.1;
                        continue;
                    }
                    continue;
                }
            }

            if (dx < (playerHitbox.w + obsBox.w) / 2 &&
                dz < zThreshold &&
                dy < (playerHitbox.h + obsH) / 2) {
                return true;
            }
        }
        return false;
    };

    SG.applyCyberColors = function(on) {
        if (!SG.scene) return;
        function gray(c) {
            var r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
            var lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            var target = lum > 127 ? 200 : 220;
            return (target << 16) | (target << 8) | target;
        }

        SG.scene.traverse(function(child) {
            if (!child.isMesh || !child.material) return;
            var mats = Array.isArray(child.material) ? child.material : [child.material];
            for (var mi = 0; mi < mats.length; mi++) {
                var mat = mats[mi];
                if (!mat.color) continue;
                var hex = mat.color.getHex();
                if (on) {
                    mat.userData = mat.userData || {};
                    if (mat.userData._origColor === undefined) {
                        mat.userData._origColor = hex;
                    }
                    var g = gray(hex);
                    mat.color.setHex(g);
                } else {
                    mat.userData = mat.userData || {};
                    if (mat.userData._origColor !== undefined) {
                        mat.color.setHex(mat.userData._origColor);
                        delete mat.userData._origColor;
                    } else if (child.userData._origColor !== undefined) {
                        mat.color.setHex(child.userData._origColor);
                    }
                }
            }
            if (!on && child.userData._origColor !== undefined) delete child.userData._origColor;
        });

        if (SG.ambientLight) {
            SG.ambientLight.intensity = on ? 1.2 : 0.7;
            SG.ambientLight.color.setHex(0xFFFFFF);
        }
    };
})();


// ===== ENDLESS RUNNER - UI System =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var THREE = window.THREE;

    // ===== SHOP =====
    SG.shopOverlay = null;

    SG.loadShopData = function() {
        try {
            var saved = localStorage.getItem('subwayShop');
            if (saved) {
                var data = JSON.parse(saved);
                SG.state.credits = data.credits || 0;
                SG.state.equippedAbility = data.equippedAbility || 0;
                SG.state.canDoubleJump = data.doubleJump || false;
                SG.state.canJetpack = data.jetpack || false;
                SG.state.canRoofWalk = data.roofWalk || false;
                SG.state.ownedCharacters = Array.isArray(data.ownedCharacters) && data.ownedCharacters.length ? data.ownedCharacters : ['runner'];
                SG.state.selectedCharacter = data.selectedCharacter || SG.state.selectedCharacter || 'runner';
                localStorage.setItem('subwayOwnedCharacters', JSON.stringify(SG.state.ownedCharacters));
                localStorage.setItem('subwaySelectedCharacter', SG.state.selectedCharacter);
            }
        } catch(e) {}
    };

    SG.saveShopData = function() {
        try {
            var data = {
                credits: SG.state.credits,
                equippedAbility: SG.state.equippedAbility,
                doubleJump: SG.state.canDoubleJump,
                jetpack: SG.state.canJetpack,
                roofWalk: SG.state.canRoofWalk,
                ownedCharacters: SG.getOwnedCharacters ? SG.getOwnedCharacters() : (SG.state.ownedCharacters || ['runner']),
                selectedCharacter: SG.state.selectedCharacter || 'runner'
            };
            localStorage.setItem('subwayShop', JSON.stringify(data));
        } catch(e) {}
    };

    SG.showShop = function() {
        // Always read volume from localStorage for persistence
        var v = {
            music: parseFloat(localStorage.getItem('subwayMusicVol') || '0.5'),
            sfx: parseFloat(localStorage.getItem('subwaySfxVol') || '0.8')
        };
        SG.state.musicVolume = v.music;
        SG.state.sfxVolume = v.sfx;

        if (!SG.shopOverlay) {
            SG.shopOverlay = document.createElement('div');
            SG.shopOverlay.id = 'shop-overlay';
            SG.shopOverlay.className = 'overlay';
            SG.shopOverlay.onclick = function(e) { if (e.target === SG.shopOverlay || e.target.closest('.modal-close-btn')) { SG.shopOverlay.style.display = 'none'; SG.updateMenuCredits(); } };
            SG.shopOverlay.addEventListener('touchend', function(e) { if (e.target === SG.shopOverlay || e.target.closest('.modal-close-btn')) { e.preventDefault(); SG.shopOverlay.style.display = 'none'; SG.updateMenuCredits(); } });
        }
        // showShop continues below...
        var prices = [0, 10000, 50000, 100000];
        var names = ['None', 'Double Jump', 'Jetpack', 'Roof Walk'];
        var descs = ['No ability equipped', 'Double jump in mid-air', 'Fly for 15s, max altitude, 30s cooldown', 'Walk on top of obstacles'];
        var icons = ['🚫', '🦘', '🚀', '🏃'];

        var html = '<div class="menu-content" style="max-height:85vh;overflow-y:auto;">';
        html += '<h1 class="menu-title" style="font-size:28px;margin-bottom:5px;">SHOP</h1>';
        html += '<div style="color:#FFD700;font-size:20px;margin-bottom:15px;">💰 ' + SG.state.credits + ' credits</div>';

        var owned = [false, SG.state.canDoubleJump, SG.state.canJetpack, SG.state.canRoofWalk];
        for (var i = 0; i < 4; i++) {
            var isEquipped = SG.state.equippedAbility === i;
            var isOwned = i === 0 || owned[i];
            var btnClass = isEquipped ? 'diff-btn active' : 'diff-btn';
            var btnDisabled = !isOwned && SG.state.credits < prices[i] ? 'disabled' : '';
            html += '<div class="shop-card' + (i > 0 && owned[i] ? ' owned' : '') + '">';
            html += '<div class="shop-ico">' + icons[i] + '</div><div class="shop-body"><div class="shop-name">' + names[i] + '</div>';
            html += '<div class="shop-desc">' + descs[i] + '</div></div>';
            if (i === 0) {
                if (SG.state.equippedAbility === 0) {
                    html += '<button class="' + btnClass + '" disabled style="opacity:0.6;">EQUIPPED</button>';
                } else {
                    html += '<button class="diff-btn" onclick="__neoEquip(0)">EQUIP NONE</button>';
                }
            } else if (isOwned) {
                if (isEquipped) {
                    html += '<button class="diff-btn active" disabled style="opacity:0.6;">EQUIPPED</button>';
                } else {
                    html += '<button class="diff-btn" onclick="__neoEquip(' + i + ')">EQUIP</button>';
                }
            } else {
                if (SG.state.credits >= prices[i]) {
                    html += '<button class="diff-btn" onclick="__neoBuy(' + i + ')">BUY ' + prices[i] + 'cr</button>';
                } else {
                    html += '<button class="' + btnClass + '" disabled style="opacity:0.4;">' + prices[i] + 'cr</button>';
                }
            }
            html += '</div>';
        }

        html += '<hr style="border-color:rgba(255,255,255,0.05);margin:8px 0;">';
        html += '<div style="color:#aaa;font-size:13px;margin-top:5px;">Controls: ↑ Jump | ↓ Roll | ← → Move | 👁 FPV | ` Console | M Menu</div>';
        html += '<div class="menu-btn modal-close-btn" onclick="__neoCloseShop()">CLOSE</div>';
        html += '</div>';

        SG.shopOverlay.innerHTML = html;
        document.body.appendChild(SG.shopOverlay);
        SG.shopOverlay.style.display = 'flex';

        window.__neoEquip = function(idx) {
            SG.state.equippedAbility = idx;
            SG.saveShopData();
            if (SG.accountSave) SG.accountSave();
            SG.showShop();
        };
        window.__neoBuy = function(idx) {
            var prices2 = [0, 10000, 50000, 100000];
            if (SG.state.credits >= prices2[idx]) {
                SG.state.credits -= prices2[idx];
                if (idx === 1) SG.state.canDoubleJump = true;
                else if (idx === 2) SG.state.canJetpack = true;
                else if (idx === 3) SG.state.canRoofWalk = true;
                SG.state.equippedAbility = idx;
                SG.saveShopData();
                if (SG.accountSave) SG.accountSave();
                SG.showShop();
            }
        };
        window.__neoCloseShop = function() {
            SG.shopOverlay.style.display = 'none';
            SG.updateMenuCredits();
        };

    };  // end showShop

    SG.characterOverlay = null;
    SG.characterPreview = null;

    function esc(str) {
        return String(str || '').replace(/[&<>"']/g, function(ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
    }

    function disposeCharacterPreviewModel() {
        if (!SG.characterPreview || !SG.characterPreview.model) return;
        SG.characterPreview.scene.remove(SG.characterPreview.model);
        if (SG.disposeObject) SG.disposeObject(SG.characterPreview.model);
        SG.characterPreview.model = null;
        SG.characterPreview.mixer = null;
    }

    SG.previewCharacter = function(id) {
        if (!SG.characterPreview || !THREE || !THREE.GLTFLoader) return;
        var character = SG.getCharacterById ? SG.getCharacterById(id) : null;
        if (!character) return;
        SG.characterPreview.current = character.id;
        disposeCharacterPreviewModel();
        var loader = new THREE.GLTFLoader();
        loader.load(character.path, function(gltf) {
            var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
            if (!model || !SG.characterPreview || SG.characterPreview.current !== character.id) return;
            model.name = 'Preview-' + character.id;
            if (SG.normalizePlayerModel) SG.normalizePlayerModel(model);
            model.traverse(function(node) {
                if (node && node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            SG.characterPreview.model = model;
            SG.characterPreview.scene.add(model);
            SG.characterPreview.previewTime = 0;
            if (character.id !== 'runner' && gltf.animations && gltf.animations.length && THREE.AnimationMixer) {
                SG.characterPreview.mixer = new THREE.AnimationMixer(model);
                var clip = gltf.animations.filter(function(c) { return String(c.name).toLowerCase() === 'idle'; })[0] || gltf.animations[0];
                SG.characterPreview.mixer.clipAction(clip).play();
            }
        }, undefined, function(err) {
            SG.characterPreview.error = err;
        });
    };

    function ensureCharacterPreview(canvas) {
        if (!canvas || !THREE) return;
        if (!SG.characterPreview) {
            var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
            camera.position.set(0, 1.15, 4.0);
            var hemi = new THREE.HemisphereLight(0xffffff, 0x273347, 1.5);
            scene.add(hemi);
            var key = new THREE.DirectionalLight(0xffffff, 1.8);
            key.position.set(2, 4, 3);
            scene.add(key);
            SG.characterPreview = { renderer: renderer, scene: scene, camera: camera, model: null, mixer: null, clock: new THREE.Clock(), current: null, running: false, previewTime: 0 };
        } else if (SG.characterPreview.renderer.domElement !== canvas) {
            SG.characterPreview.renderer.dispose();
            SG.characterPreview.renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
            SG.characterPreview.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        }

        function loop() {
            if (!SG.characterOverlay || SG.characterOverlay.style.display === 'none' || !SG.characterPreview) {
                if (SG.characterPreview) SG.characterPreview.running = false;
                return;
            }
            SG.characterPreview.running = true;
            var w = Math.max(220, canvas.clientWidth || 320);
            var h = Math.max(260, canvas.clientHeight || 360);
            SG.characterPreview.renderer.setSize(w, h, false);
            SG.characterPreview.camera.aspect = w / h;
            SG.characterPreview.camera.updateProjectionMatrix();
            var delta = Math.min(SG.characterPreview.clock.getDelta(), 0.033);
            SG.characterPreview.previewTime += delta;
            if (SG.characterPreview.mixer) SG.characterPreview.mixer.update(delta);
            if (SG.characterPreview.model) SG.characterPreview.model.rotation.y = Math.sin(SG.characterPreview.previewTime * 0.7) * 0.35;
            SG.characterPreview.renderer.render(SG.characterPreview.scene, SG.characterPreview.camera);
            requestAnimationFrame(loop);
        }
        if (!SG.characterPreview.running) loop();
    }

    SG.showCharacters = function() {
        if (!SG.characterOverlay) {
            SG.characterOverlay = document.createElement('div');
            SG.characterOverlay.id = 'characters-overlay';
            SG.characterOverlay.className = 'overlay';
            SG.characterOverlay.onclick = function(e) { if (e.target === SG.characterOverlay || e.target.closest('.modal-close-btn')) SG.characterOverlay.style.display = 'none'; };
            SG.characterOverlay.addEventListener('touchend', function(e) { if (e.target === SG.characterOverlay || e.target.closest('.modal-close-btn')) { e.preventDefault(); SG.characterOverlay.style.display = 'none'; } });
            document.body.appendChild(SG.characterOverlay);
        }

        var selected = SG.state.selectedCharacter || 'runner';
        var owned = SG.getOwnedCharacters ? SG.getOwnedCharacters() : ['runner'];
        var nextPrice = SG.getNextCharacterPrice ? SG.getNextCharacterPrice() : 0;
        var html = '<div class="menu-content character-modal">';
        html += '<h1 class="menu-title" style="font-size:28px;margin-bottom:5px;">CHARACTERS</h1>';
        html += '<div class="character-credit-line">' + (SG.state.credits || 0) + ' credits</div>';
        html += '<div class="character-layout">';
        html += '<div class="character-preview-wrap"><canvas id="character-preview-canvas"></canvas><div id="character-preview-name">' + esc((SG.getCharacterById ? SG.getCharacterById(selected).name : selected)) + '</div></div>';
        html += '<div class="character-list">';
        for (var i = 0; i < SG.characterCatalog.length; i++) {
            var ch = SG.characterCatalog[i];
            var isOwned = owned.indexOf(ch.id) >= 0;
            var isSelected = selected === ch.id;
            html += '<div class="character-card' + (isOwned ? ' owned' : '') + (isSelected ? ' selected' : '') + '" onclick="__neoPreviewCharacter(\'' + ch.id + '\')">';
            html += '<div class="character-info"><div class="character-name">' + esc(ch.name) + '</div><div class="character-desc">' + esc(ch.desc) + '</div></div>';
            if (isSelected) html += '<button class="diff-btn active" disabled>SELECTED</button>';
            else if (isOwned) html += '<button class="diff-btn" onclick="event.stopPropagation();__neoSelectCharacter(\'' + ch.id + '\')">SELECT</button>';
            else html += '<button class="diff-btn" onclick="event.stopPropagation();__neoBuyCharacter(\'' + ch.id + '\')">' + nextPrice + 'cr</button>';
            html += '</div>';
        }
        html += '</div></div>';
        html += '<div class="menu-btn modal-close-btn">CLOSE</div>';
        html += '</div>';

        SG.characterOverlay.innerHTML = html;
        SG.characterOverlay.style.display = 'flex';

        window.__neoPreviewCharacter = function(id) {
            var ch = SG.getCharacterById(id);
            var nameEl = document.getElementById('character-preview-name');
            if (ch && nameEl) nameEl.textContent = ch.name;
            SG.previewCharacter(id);
        };
        window.__neoSelectCharacter = function(id) {
            if (SG.selectCharacter(id)) {
                if (SG.saveShopData) SG.saveShopData();
                if (SG.accountSave) SG.accountSave();
                SG.showCharacters();
            }
        };
        window.__neoBuyCharacter = function(id) {
            if (SG.buyCharacter(id)) SG.showCharacters();
        };

        ensureCharacterPreview(document.getElementById('character-preview-canvas'));
        SG.previewCharacter(selected);
    };

    SG.updateMenuCredits = function() {
        var el = document.getElementById('menu-credits');
        if (el) el.textContent = '💰 TOTAL: ' + SG.state.credits;
    };

    SG.getSpeedKmh = function() {
        var metersPerSecond = typeof SG.state.instantSpeedMps === 'number'
            ? SG.state.instantSpeedMps
            : (SG.getDistanceRate ? SG.getDistanceRate(SG.state.speed) : ((SG.state.speed || 0) * 10));
        return Math.max(0, Math.round(metersPerSecond * 3.6));
    };

    SG.updateSpeedHUD = function() {
        var el = SG.speedHudEl || document.getElementById('third-person-speed-hud');
        if (!el || !SG.camera || !SG.player || !window.THREE) return;
        if (!SG.state.started || SG.state.gameOver || SG.state.firstPerson || SG.state.homelander) {
            el.style.display = 'none';
            return;
        }

        var pos = SG.player.position.clone();
        pos.x += 0.26;
        pos.y += 1.45;
        pos.project(SG.camera);

        if (pos.z < -1 || pos.z > 1) {
            el.style.display = 'none';
            return;
        }

        el.textContent = SG.getSpeedKmh() + ' km/h';
        el.style.left = ((pos.x * 0.5 + 0.5) * window.innerWidth) + 'px';
        el.style.top = ((-pos.y * 0.5 + 0.5) * window.innerHeight) + 'px';
        el.style.display = 'block';
    };

    // ===== SETTINGS OVERLAY =====
    SG.showSettings = function() {
        var overlay = document.getElementById('settings-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'settings-overlay';
            overlay.className = 'overlay';
            overlay.onclick = function(e) { if (e.target === overlay || e.target.closest('.modal-close-btn')) overlay.style.display = 'none'; };
            overlay.addEventListener('touchend', function(e) { if (e.target === overlay || e.target.closest('.modal-close-btn')) { e.preventDefault(); overlay.style.display = 'none'; } });
            document.body.appendChild(overlay);
        }
        var music = parseFloat(localStorage.getItem('subwayMusicVol') || '0.5');
        var sfx = parseFloat(localStorage.getItem('subwaySfxVol') || '0.8');
        var rollDelay = Math.max(0, Math.min(1000, parseInt(localStorage.getItem('subwayRollReleaseDelay') || String(SG.state.rollReleaseDelay || 200))));
        var bindings = SG.getKeyBindings ? SG.getKeyBindings() : { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };
        var thirdPersonView = localStorage.getItem('subwayThirdPersonView') || SG.state.thirdPersonView || 'near';
        var fpPitch = Math.max(-5, Math.min(5, parseFloat(localStorage.getItem('subwayFirstPersonPitchDeg') || String(typeof SG.state.firstPersonPitchDeg === 'number' ? SG.state.firstPersonPitchDeg : 1))));
        SG.state.musicVolume = music;
        SG.state.sfxVolume = sfx;
        SG.state.rollReleaseDelay = rollDelay;
        SG.state.thirdPersonView = thirdPersonView;
        SG.state.firstPersonPitchDeg = fpPitch;

        var actionOrder = ['up', 'down', 'left', 'right'];
        var viewOptions = [
            { key: 'far', label: 'Farthest', desc: 'Current camera distance' },
            { key: 'medium', label: 'Medium', desc: 'Closer third-person view' },
            { key: 'near', label: 'Closest', desc: 'Most immersive third-person view' }
        ];
        var html = '<div class="menu-content" style="max-width:640px;width:min(94vw,640px);max-height:88vh;overflow:auto;">';
        html += '<h1 class="menu-title" style="font-size:24px;">⚙ SETTINGS</h1>';
        html += '<div style="margin:12px 0;text-align:center;">';
        html += '<span class="s-label">🔊 Master</span>';
        html += '<button class="diff-btn" id="__mute-btn">' + (SG.state.muted ? 'OFF' : 'ON') + '</button>';
        html += '</div>';
        html += '<div style="margin:10px 0;">';
        html += '<div style="display:grid;grid-template-columns:30px 76px 1fr 44px;align-items:center;gap:8px;">';
        html += '<span style="justify-self:start;font-size:18px;">🎵</span><span class="s-label">Music</span><input type="range" min="0" max="1" step="0.1" value="' + music + '" class="__vol-slider" data-key="subwayMusicVol"><span class="vol-pct">' + Math.round(music * 100) + '%</span>';
        html += '</div>';
        html += '</div>';
        html += '<div style="margin:10px 0;">';
        html += '<div style="display:grid;grid-template-columns:30px 76px 1fr 44px;align-items:center;gap:8px;">';
        html += '<span style="justify-self:start;font-size:18px;">🔊</span><span class="s-label">SFX</span><input type="range" min="0" max="1" step="0.1" value="' + sfx + '" class="__vol-slider" data-key="subwaySfxVol"><span class="vol-pct">' + Math.round(sfx * 100) + '%</span>';
        html += '</div>';
        html += '</div>';
        html += '<div style="margin:14px 0 10px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:end;gap:10px;margin-bottom:6px;"><div><div class="s-label">Crouch Release Delay / 蹲起延迟</div><div style="color:#aaa;font-size:12px;text-align:left;">How long the character stays crouched after releasing Down</div></div><span id="__roll-delay-val" class="vol-pct">' + rollDelay + 'ms</span></div>';
        html += '<input type="range" min="0" max="1000" step="50" value="' + rollDelay + '" id="__roll-delay" style="width:100%;">';
        html += '</div>';
        html += '<div style="margin:14px 0 10px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:end;gap:10px;margin-bottom:6px;"><div><div class="s-label">First-Person View Height / 第一人称视角高度</div><div style="color:#aaa;font-size:12px;text-align:left;">Adjust camera pitch from -5° to +5°</div></div><span id="__fp-pitch-val" class="vol-pct">' + fpPitch.toFixed(0) + '°</span></div>';
        html += '<div style="display:grid;grid-template-columns:42px 1fr 42px;align-items:center;gap:8px;"><button class="diff-btn" id="__fp-pitch-down" style="min-width:42px;padding:8px;">-</button><input type="range" min="-5" max="5" step="1" value="' + fpPitch + '" id="__fp-pitch" style="width:100%;"><button class="diff-btn" id="__fp-pitch-up" style="min-width:42px;padding:8px;">+</button></div>';
        html += '</div>';
        html += '<div style="margin:14px 0 10px;">';
        html += '<div class="s-label" style="margin-bottom:8px;">Third-Person Camera</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">';
        for (var vi = 0; vi < viewOptions.length; vi++) {
            var view = viewOptions[vi];
            var active = view.key === thirdPersonView ? ' selected' : '';
            html += '<button class="diff-btn __view-btn' + active + '" data-view="' + view.key + '" style="min-height:58px;padding:8px 6px;border:1px solid rgba(255,255,255,0.2);transition:background 0.12s,border-color 0.12s,box-shadow 0.12s,transform 0.12s;color:#fff;"><strong>' + view.label + '</strong><small style="display:block;color:#aaa;font-size:11px;margin-top:4px;line-height:1.2;">' + view.desc + '</small></button>';
        }
        html += '</div>';
        html += '</div>';
        html += '<div style="margin:14px 0 8px;">';
        html += '<div class="s-label" style="margin-bottom:8px;">Key Bindings</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">';
        for (var ai = 0; ai < actionOrder.length; ai++) {
            var action = actionOrder[ai];
            var label = SG.keyBindingLabels && SG.keyBindingLabels[action] ? SG.keyBindingLabels[action] : action;
            var keyLabel = SG.formatKeyName ? SG.formatKeyName(bindings[action]) : bindings[action];
            html += '<button class="diff-btn __bind-btn" data-action="' + action + '" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 10px;"><span>' + label + '</span><strong>' + keyLabel + '</strong></button>';
        }
        html += '</div>';
        html += '<button class="diff-btn" id="__reset-bindings" style="width:100%;margin-top:8px;">RESET KEYS</button>';
        html += '</div>';
        html += '<div class="menu-btn modal-close-btn" id="__settings-close">CLOSE</div>';
        html += '</div>';

        overlay.innerHTML = html;
        overlay.style.display = 'flex';

        // Wire up mute button
        var muteBtn = document.getElementById('__mute-btn');
        if (muteBtn) {
            muteBtn.onclick = function() {
                SG.toggleMute();
                var overlay2 = document.getElementById('settings-overlay');
                if (overlay2) SG.showSettings();
            };
        }
        // Wire up volume sliders
        var sliders = overlay.querySelectorAll('.__vol-slider');
        for (var si = 0; si < sliders.length; si++) {
            sliders[si].oninput = function() {
                var key = this.getAttribute('data-key');
                var val = parseFloat(this.value);
                localStorage.setItem(key, String(val));
                if (key === 'subwayMusicVol') SG.state.musicVolume = val;
                else if (key === 'subwaySfxVol') SG.state.sfxVolume = val;
                if (SG.updateHomelanderAudioVolume) SG.updateHomelanderAudioVolume();
                var pct = this.parentNode.querySelector('.vol-pct');
                if (pct) pct.textContent = Math.round(val * 100) + '%';
            };
        }
        var rollDelaySlider = document.getElementById('__roll-delay');
        if (rollDelaySlider) {
            rollDelaySlider.oninput = function() {
                var val = Math.max(0, Math.min(1000, parseInt(this.value || '200')));
                SG.state.rollReleaseDelay = val;
                localStorage.setItem('subwayRollReleaseDelay', String(val));
                var out = document.getElementById('__roll-delay-val');
                if (out) out.textContent = val + 'ms';
            };
        }
        var fpPitchSlider = document.getElementById('__fp-pitch');
        function setFirstPersonPitch(val) {
            val = Math.max(-5, Math.min(5, parseFloat(val || '1')));
            SG.state.firstPersonPitchDeg = val;
            localStorage.setItem('subwayFirstPersonPitchDeg', String(val));
            if (fpPitchSlider) fpPitchSlider.value = String(val);
            var out = document.getElementById('__fp-pitch-val');
            if (out) out.textContent = val.toFixed(0) + '°';
        }
        if (fpPitchSlider) {
            fpPitchSlider.oninput = function() { setFirstPersonPitch(this.value); };
        }
        var fpPitchDown = document.getElementById('__fp-pitch-down');
        var fpPitchUp = document.getElementById('__fp-pitch-up');
        if (fpPitchDown) fpPitchDown.onclick = function(e) { e.preventDefault(); setFirstPersonPitch((SG.state.firstPersonPitchDeg || 1) - 1); };
        if (fpPitchUp) fpPitchUp.onclick = function(e) { e.preventDefault(); setFirstPersonPitch((SG.state.firstPersonPitchDeg || 1) + 1); };
        function refreshViewButtons() {
            var btns = overlay.querySelectorAll('.__view-btn');
            for (var vi = 0; vi < btns.length; vi++) {
                var active = btns[vi].getAttribute('data-view') === SG.state.thirdPersonView;
                btns[vi].classList.toggle('selected', active);
                btns[vi].setAttribute('aria-pressed', active ? 'true' : 'false');
                btns[vi].style.borderColor = active ? '#22d3ee' : 'rgba(255,255,255,0.2)';
                btns[vi].style.background = active ? 'linear-gradient(135deg, rgba(34,211,238,0.34), rgba(250,204,21,0.18))' : '';
                btns[vi].style.boxShadow = active ? '0 0 0 2px rgba(34,211,238,0.35), 0 0 20px rgba(34,211,238,0.28)' : 'none';
                btns[vi].style.transform = active ? 'translateY(-1px)' : 'translateY(0)';
            }
        }
        var viewBtns = overlay.querySelectorAll('.__view-btn');
        for (var vk = 0; vk < viewBtns.length; vk++) {
            viewBtns[vk].onclick = function(e) {
                e.preventDefault();
                var view = this.getAttribute('data-view') || 'far';
                SG.state.thirdPersonView = view;
                localStorage.setItem('subwayThirdPersonView', view);
                refreshViewButtons();
            };
        }
        refreshViewButtons();
        function refreshBindingButtons() {
            var btns = overlay.querySelectorAll('.__bind-btn');
            var current = SG.getKeyBindings ? SG.getKeyBindings() : bindings;
            for (var bi = 0; bi < btns.length; bi++) {
                var action = btns[bi].getAttribute('data-action');
                var strong = btns[bi].querySelector('strong');
                if (strong) strong.textContent = SG.formatKeyName ? SG.formatKeyName(current[action]) : current[action];
                btns[bi].classList.remove('selected');
            }
        }
        var bindBtns = overlay.querySelectorAll('.__bind-btn');
        for (var bj = 0; bj < bindBtns.length; bj++) {
            bindBtns[bj].onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                var btn = this;
                var action = btn.getAttribute('data-action');
                refreshBindingButtons();
                btn.classList.add('selected');
                var strong = btn.querySelector('strong');
                if (strong) strong.textContent = '...';
                var capture = function(ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    document.removeEventListener('keydown', capture, true);
                    if (ev.key === 'Escape') {
                        refreshBindingButtons();
                        return;
                    }
                    if (SG.setKeyBinding) SG.setKeyBinding(action, ev.key);
                    refreshBindingButtons();
                };
                setTimeout(function() { document.addEventListener('keydown', capture, true); }, 0);
            };
        }
        var resetBindings = document.getElementById('__reset-bindings');
        if (resetBindings) {
            resetBindings.onclick = function(e) {
                e.preventDefault();
                if (SG.resetKeyBindings) SG.resetKeyBindings();
                refreshBindingButtons();
            };
        }
        // Wire up close button
        var closeBtn = document.getElementById('__settings-close');
        if (closeBtn) {
            closeBtn.onclick = function() { overlay.style.display = 'none'; };
        }
    };

    // ===== UI SETUP =====
    SG.setupUI = function() {
        SG.uiOverlay = document.createElement('div');
        SG.uiOverlay.id = 'ui-overlay';

        // ===== MAIN MENU =====
        SG.menuOverlay = document.createElement('div');
        SG.menuOverlay.id = 'menu-overlay';
        SG.menuOverlay.className = 'overlay';
        SG.menuOverlay.innerHTML = '' +
            '<div class="menu-shell">' +
                '<aside class="menu-sidebar">' +
                    '<div class="menu-brand">ENDLESS RUNNER<small>NEO EDITION</small></div>' +
                    '<div class="menu-nav-btn" id="shop-btn-menu"><span class="nav-ico">🛒</span> Shop</div>' +
                    '<div class="menu-nav-btn" id="characters-btn"><span class="nav-ico">◆</span> Characters</div>' +
                    '<div class="menu-nav-btn" id="profile-btn"><span class="nav-ico">👤</span> Profile</div>' +
                    '<div class="menu-nav-btn" id="leaderboard-btn"><span class="nav-ico">🏆</span> Leaderboard</div>' +
                    '<div class="menu-nav-btn" id="pvp-btn-menu"><span class="nav-ico">VS</span> PVP</div>' +
                    '<div class="menu-nav-btn" id="settings-btn-menu"><span class="nav-ico">⚙</span> Settings</div>' +
                    '<div class="menu-nav-btn danger" id="signout-btn"><span class="nav-ico">🚪</span> Sign Out</div>' +
                '</aside>' +
                '<section class="menu-main">' +
                    '<h1 class="menu-title">ENDLESS RUNNER</h1>' +
                    '<p class="menu-subtitle">Neo Edition</p>' +
                    '<div class="tap-to-start pulse">TAP TO START</div>' +
                    '<div class="diff-select">' +
                        '<button class="diff-btn" data-diff="0">EASY</button>' +
                        '<button class="diff-btn" data-diff="1">MEDIUM</button>' +
                        '<button class="diff-btn active" data-diff="2">HARD</button>' +
                    '</div>' +
                    '<div id="menu-credits">💰 TOTAL: 0</div>' +
                    '<div class="menu-controls">' +
                        '<span class="key">←</span> <span class="key">→</span> Move &nbsp;|&nbsp;' +
                        '<span class="key">↑</span> Jump &nbsp;|&nbsp;' +
                        '<span class="key">↓</span> Roll' +
                    '</div>' +
                    '<div class="menu-keys">ESC / P = Pause &nbsp;|&nbsp; M = Menu &nbsp;|&nbsp; 👁 FPV</div>' +
                    '<div class="menu-mobile-hint">Swipe to play on mobile</div>' +
                '</section>' +
            '</div>';
        SG.uiOverlay.appendChild(SG.menuOverlay);

        var pvpOverlay = document.createElement('div');
        pvpOverlay.id = 'pvp-overlay';
        pvpOverlay.className = 'overlay';
        pvpOverlay.style.display = 'none';
        pvpOverlay.innerHTML = '<div id="pvp-panel" style="width:min(1040px,94vw);max-height:88vh;overflow:auto;background:rgba(4,6,14,.92);border:1px solid rgba(255,44,207,.45);box-shadow:0 0 34px rgba(155,77,255,.28);padding:24px;border-radius:8px;color:#f5f7ff;font-family:Arial,sans-serif;"></div>';
        SG.uiOverlay.appendChild(pvpOverlay);
        SG.pvpOverlay = pvpOverlay;

        // ===== PAUSE OVERLAY =====
        SG.pauseOverlay = document.createElement('div');
        SG.pauseOverlay.id = 'pause-overlay';
        SG.pauseOverlay.className = 'overlay';
        SG.pauseOverlay.style.display = 'none';
        SG.pauseOverlay.innerHTML = '' +
            '<div class="menu-content">' +
                '<h1 class="menu-title">PAUSED</h1>' +
                '<div class="tap-to-start">TAP TO CONTINUE</div>' +
                '<div class="menu-btn" id="pause-menu-btn">RETURN TO MENU</div>' +
            '</div>';
        SG.uiOverlay.appendChild(SG.pauseOverlay);

        // ===== DEV CONSOLE =====
        var consoleEl = document.createElement('div');
        consoleEl.id = 'dev-console';
        consoleEl.style.display = 'none';
        consoleEl.innerHTML = '<div id="console-output"></div><div class="console-row"><span class="console-prompt">&gt;</span><input type="text" id="console-input" placeholder="help" autofocus/></div>';
        SG.uiOverlay.appendChild(consoleEl);

        SG.speedHudEl = document.createElement('div');
        SG.speedHudEl.id = 'third-person-speed-hud';
        SG.speedHudEl.style.cssText = 'position:fixed;left:50%;top:50%;z-index:18;display:none;pointer-events:none;transform:translate(-8px,2px);padding:3px 7px;border-radius:5px;background:rgba(0,0,0,0.16);border:1px solid rgba(255,255,255,0.14);color:rgba(255,255,255,0.94);font:700 12px/1.25 Arial,sans-serif;text-shadow:0 1px 6px rgba(0,0,0,0.85);letter-spacing:0;';
        SG.uiOverlay.appendChild(SG.speedHudEl);

        var pvpHud = document.createElement('div');
        pvpHud.id = 'pvp-hud';
        pvpHud.style.cssText = 'position:absolute;top:16px;right:16px;display:none;min-width:220px;max-width:280px;padding:10px 12px;border-radius:8px;background:rgba(4,5,12,0.52);border:1px solid rgba(255,44,207,0.34);box-shadow:0 0 18px rgba(155,77,255,0.2);color:rgba(245,247,255,0.92);font:700 12px/1.45 Arial,sans-serif;pointer-events:none;text-shadow:0 1px 7px rgba(0,0,0,0.9);';
        SG.uiOverlay.appendChild(pvpHud);
        SG.pvpHudEl = pvpHud;

        // ===== PAUSE BUTTON =====
        SG.pauseBtnEl = document.createElement('div');
        SG.pauseBtnEl.id = 'pause-btn';
        SG.pauseBtnEl.textContent = '\u23F8';
        SG.pauseBtnEl.style.display = 'none';
        SG.uiOverlay.appendChild(SG.pauseBtnEl);

        // ===== FPV TOGGLE BUTTON =====
        var fpvBtn = document.createElement('div');
        fpvBtn.id = 'fpv-btn';
        fpvBtn.textContent = '\uD83D\uDC41';
        fpvBtn.style.display = 'none';
        SG.uiOverlay.appendChild(fpvBtn);
        fpvBtn.addEventListener('click', function() { SG.state.firstPerson = !SG.state.firstPerson; fpvBtn.textContent = SG.state.firstPerson ? '\uD83D\uDC41' : '\uD83D\uDC41'; });
        fpvBtn.addEventListener('touchend', function(e) { e.preventDefault(); SG.state.firstPerson = !SG.state.firstPerson; });

        // ===== CONSOLE BUTTON =====
        var conBtn = document.createElement('div');
        conBtn.id = 'con-btn';
        conBtn.textContent = '>_';
        conBtn.style.display = 'none';
        SG.uiOverlay.appendChild(conBtn);
        conBtn.addEventListener('click', SG.toggleConsole);
        conBtn.addEventListener('touchend', function(e) { e.preventDefault(); SG.toggleConsole(); });

        // ===== MUTE BUTTON =====
        (function() {
            var btn = document.createElement('div');
            btn.id = 'mute-btn';
            btn.textContent = '\uD83D\uDD0A';
            btn.style.display = 'none';
            btn.style.cssText = 'position:absolute;top:16px;left:66px;width:40px;height:40px;font-size:18px;cursor:pointer;z-index:15;pointer-events:auto;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);border-radius:10px;border:1px solid rgba(255,255,255,0.08);transition:all 0.2s;color:rgba(255,255,255,0.7);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);text-align:center;line-height:40px;';
            SG.uiOverlay.appendChild(btn);
            btn.addEventListener('click', function() { SG.toggleMute(); });
            btn.addEventListener('touchend', function(e) { e.preventDefault(); SG.toggleMute(); });
        })();

        // ===== POLICE DISTANCE INDICATOR =====
        var policeEl = document.createElement('div');
        policeEl.id = 'police-indicator';
        policeEl.style.cssText = 'position:absolute;top:100px;left:50%;transform:translateX(-50%);font-size:16px;color:#ff4444;text-shadow:0 1px 8px rgba(0,0,0,0.9);display:none;pointer-events:none;background:rgba(0,0,0,0.4);padding:4px 14px;border-radius:8px;border:1px solid rgba(255,0,0,0.3);';
        policeEl.textContent = '\uD83D\uDE94 DISTANCE: 8.0m';
        SG.uiOverlay.appendChild(policeEl);
        SG.policeIndicatorEl = policeEl;

        // ===== MOBILE CONTROLS =====
        var mobileCtrl = document.createElement('div');
        mobileCtrl.id = 'mobile-controls';
        mobileCtrl.innerHTML = '' +
            '<div class="m-row">' +
                '<button class="m-btn" id="m-jump">▲</button>' +
            '</div>' +
            '<div class="m-row">' +
                '<button class="m-btn" id="m-left">◀</button>' +
                '<button class="m-btn" id="m-roll">▼</button>' +
                '<button class="m-btn" id="m-right">▶</button>' +
            '</div>';
        SG.uiOverlay.appendChild(mobileCtrl);

        // ===== SCORE DISPLAY =====
        var scoreDiv = document.createElement('div');
        scoreDiv.id = 'score-display';
        var coinsSpan = document.createElement('span');
        coinsSpan.className = 'coins-label';
        coinsSpan.textContent = '\uD83E\uDE99 ';
        var coinCount = document.createElement('span');
        coinCount.id = 'coin-count';
        coinCount.textContent = '0';
        coinsSpan.appendChild(coinCount);
        var sep = document.createTextNode('  |  ');
        var distSpan = document.createElement('span');
        distSpan.className = 'dist-label';
        distSpan.textContent = '\uD83C\uDFC3 ';
        var distCount = document.createElement('span');
        distCount.id = 'distance-count';
        distCount.textContent = '0';
        distSpan.appendChild(distCount);
        var mSpan = document.createTextNode('m');
        scoreDiv.appendChild(coinsSpan);
        scoreDiv.appendChild(sep);
        scoreDiv.appendChild(distSpan);
        scoreDiv.appendChild(mSpan);
        SG.uiOverlay.appendChild(scoreDiv);
        SG.scoreEl = distCount;
        SG.coinsEl = coinCount;

        // ===== BEST SCORE HUD =====
        var bestSmall = document.createElement('div');
        bestSmall.id = 'hud-best';
        bestSmall.style.cssText = 'position:absolute;top:72px;left:50%;transform:translateX(-50%);font-size:13px;color:rgba(136,204,255,0.6);text-shadow:0 1px 5px rgba(0,0,0,0.8);pointer-events:none;';
        bestSmall.textContent = 'BEST: ' + SG.state.bestScore + 'm';
        SG.uiOverlay.appendChild(bestSmall);

        // ===== SPEED INDICATOR =====
        var speedDiv = document.createElement('div');
        speedDiv.id = 'speed-indicator';
        speedDiv.textContent = 'SPD: 1x';
        SG.uiOverlay.appendChild(speedDiv);

        // ===== SKILL INDICATOR (equipped ability name) =====
        (function() {
            var el = document.createElement('div');
            el.id = 'skill-indicator';
            el.style.cssText = 'position:absolute;top:64px;right:16px;color:rgba(255,255,255,0.8);font-size:12px;text-shadow:0 1px 8px rgba(0,0,0,0.9);background:rgba(0,0,0,0.35);padding:4px 10px;border-radius:10px;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);border:1px solid rgba(255,200,50,0.2);display:none;pointer-events:none;';
            el.textContent = '';
            SG.uiOverlay.appendChild(el);
        })();

        // ===== JETPACK TIMER (fuel / cooldown) =====
        (function() {
            var el = document.createElement('div');
            el.id = 'jetpack-timer';
            el.style.cssText = 'position:absolute;top:90px;right:16px;color:rgba(255,255,255,0.8);font-size:11px;text-shadow:0 1px 8px rgba(0,0,0,0.9);background:rgba(0,0,0,0.35);padding:3px 10px;border-radius:10px;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);border:1px solid rgba(100,200,255,0.2);display:none;pointer-events:none;';
            el.textContent = '';
            SG.uiOverlay.appendChild(el);
        })();

        // ===== GUN TIMER =====
        (function() {
            var el = document.createElement('div');
            el.id = 'gun-hud';
            el.style.cssText = 'position:absolute;top:116px;right:16px;color:rgba(255,255,255,0.86);font-size:11px;text-shadow:0 1px 8px rgba(0,0,0,0.9);background:rgba(0,0,0,0.32);padding:3px 10px;border-radius:10px;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);border:1px solid rgba(75,231,255,0.24);display:none;pointer-events:none;';
            el.textContent = '';
            SG.uiOverlay.appendChild(el);
        })();

        // ===== GUN CROSSHAIR =====
        (function() {
            var cross = document.createElement('div');
            cross.id = 'gun-crosshair';
            cross.style.cssText = 'position:fixed;left:50%;top:50%;width:24px;height:24px;transform:translate(-50%,-50%);display:none;visibility:hidden;opacity:0;pointer-events:none;z-index:9999;';
            var h = document.createElement('div');
            h.style.cssText = 'position:absolute;left:2px;right:2px;top:11px;height:2px;background:#ffe84a;box-shadow:0 0 6px rgba(255,232,74,0.95),0 0 1px #000;';
            var v = document.createElement('div');
            v.style.cssText = 'position:absolute;top:2px;bottom:2px;left:11px;width:2px;background:#ffe84a;box-shadow:0 0 6px rgba(255,232,74,0.95),0 0 1px #000;';
            var dot = document.createElement('div');
            dot.style.cssText = 'position:absolute;left:10px;top:10px;width:4px;height:4px;border-radius:50%;background:#fff38a;box-shadow:0 0 7px rgba(255,232,74,1);';
            cross.appendChild(h);
            cross.appendChild(v);
            cross.appendChild(dot);
            SG.uiOverlay.appendChild(cross);
        })();

        // ===== GAME OVER SCREEN =====
        var gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'game-over-screen';

        var h1 = document.createElement('h1');
        h1.textContent = 'GAME OVER';
        gameOverDiv.appendChild(h1);

        var finalScoreDiv = document.createElement('div');
        finalScoreDiv.className = 'final-score';
        finalScoreDiv.textContent = 'Distance: ';
        var finalDistSpan = document.createElement('span');
        finalDistSpan.id = 'final-distance';
        finalDistSpan.textContent = '0';
        finalScoreDiv.appendChild(finalDistSpan);
        finalScoreDiv.appendChild(document.createTextNode('m'));
        gameOverDiv.appendChild(finalScoreDiv);

        var finalCoinsDiv = document.createElement('div');
        finalCoinsDiv.className = 'final-coins';
        finalCoinsDiv.textContent = 'Coins: ';
        var finalCoinSpan = document.createElement('span');
        finalCoinSpan.id = 'final-coins';
        finalCoinSpan.textContent = '0';
        finalCoinsDiv.appendChild(finalCoinSpan);
        gameOverDiv.appendChild(finalCoinsDiv);

        var bestDiv = document.createElement('div');
        bestDiv.id = 'best-score';
        bestDiv.className = 'final-coins';
        bestDiv.style.marginBottom = '20px';
        bestDiv.style.color = '#88ccff';
        bestDiv.textContent = 'BEST: ' + SG.state.bestScore + 'm';
        gameOverDiv.appendChild(bestDiv);

        var restartBtn = document.createElement('div');
        restartBtn.className = 'restart-btn';
        restartBtn.id = 'restart-btn';
        restartBtn.textContent = 'TAP TO RETRY';
        gameOverDiv.appendChild(restartBtn);

        var quitBtn = document.createElement('div');
        quitBtn.className = 'menu-btn';
        quitBtn.id = 'quit-btn';
        quitBtn.textContent = 'RETURN TO MENU';
        gameOverDiv.appendChild(quitBtn);

        SG.uiOverlay.appendChild(gameOverDiv);
        SG.gameOverEl = gameOverDiv;
        SG.finalScoreEl = finalDistSpan;
        SG.finalCoinsEl = finalCoinSpan;
        SG.restartBtnEl = restartBtn;

        // ===== INSTRUCTIONS =====
        var instrDiv = document.createElement('div');
        instrDiv.id = 'instructions';
        instrDiv.innerHTML = '' +
            '<span class="key">←</span> <span class="key">→</span> Move &nbsp;|&nbsp;' +
            '<span class="key">↑</span> Jump &nbsp;|&nbsp;' +
            '<span class="key">↓</span> Roll<br>' +
            'Swipe on mobile';
        SG.uiOverlay.appendChild(instrDiv);
        SG.instructionsEl = instrDiv;

        document.body.appendChild(SG.uiOverlay);

        var countdownDiv = document.createElement('div');
        countdownDiv.id = 'start-countdown';
        countdownDiv.style.cssText = 'display:none;position:fixed;inset:0;align-items:center;justify-content:center;z-index:99999;pointer-events:none;font-family:Arial Black,Impact,sans-serif;font-size:clamp(78px,18vw,220px);font-weight:900;letter-spacing:0;color:#fff3a6;text-shadow:0 0 24px rgba(255,190,40,.95),0 8px 0 rgba(0,0,0,.38),0 0 2px #111;transform:translateY(-3vh);';
        document.body.appendChild(countdownDiv);
        SG.countdownOverlay = countdownDiv;

        // ===== EVENT LISTENERS =====
        SG.restartBtnEl.addEventListener('click', SG.restartGame);
        SG.restartBtnEl.addEventListener('touchend', function(e) { e.preventDefault(); SG.restartGame(); });

        var quitBtnEl = document.getElementById('quit-btn');
        if (quitBtnEl) {
            quitBtnEl.addEventListener('click', SG.quitToMenu);
            quitBtnEl.addEventListener('touchend', function(e) { e.preventDefault(); SG.quitToMenu(); });
        }

        SG.menuOverlay.addEventListener('click', function(e) { if (e.target.closest('.tap-to-start')) SG.startGameFromMenu(); });
        SG.menuOverlay.addEventListener('touchend', function(e) {
            e.preventDefault();
            if (e.target.closest('.tap-to-start')) SG.startGameFromMenu();
        });

        document.querySelectorAll('.diff-btn').forEach(function(btn) {
            var setDiff = function() {
                SG.state.difficulty = parseInt(btn.dataset.diff);
                document.querySelectorAll('.diff-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
            };
            btn.addEventListener('click', setDiff);
            btn.addEventListener('touchend', function(e) { e.preventDefault(); setDiff(); });
        });

        var shopBtnMenu = document.getElementById('shop-btn-menu');
        if (shopBtnMenu) {
            shopBtnMenu.addEventListener('click', function(e) { e.stopPropagation(); SG.showShop(); });
            shopBtnMenu.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.showShop(); });
        }
        var charactersBtn = document.getElementById('characters-btn');
        if (charactersBtn) {
            charactersBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.showCharacters(); });
            charactersBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.showCharacters(); });
        }
        var profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.showProfile(); });
            profileBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.showProfile(); });
        }
        var leaderboardBtn = document.getElementById('leaderboard-btn');
        if (leaderboardBtn) {
            leaderboardBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.showLeaderboard(); });
            leaderboardBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.showLeaderboard(); });
        }
        var pvpBtn = document.getElementById('pvp-btn-menu');
        if (pvpBtn) {
            pvpBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.showPvpLobby(); });
            pvpBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.showPvpLobby(); });
        }
        var settingsBtn = document.getElementById('settings-btn-menu');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.showSettings(); });
            settingsBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.showSettings(); });
        }
        var signoutBtn = document.getElementById('signout-btn');
        if (signoutBtn) {
            signoutBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.accountLogout(); });
            signoutBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.accountLogout(); });
        }

        var pauseTapBtn = SG.pauseOverlay.querySelector('.tap-to-start');
        if (pauseTapBtn) {
            pauseTapBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.togglePause(); });
            pauseTapBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.togglePause(); });
        }
        SG.pauseOverlay.addEventListener('click', function(e) {
            if (e.target.closest('.menu-btn')) return;
            if (e.target === SG.pauseOverlay) SG.togglePause();
        });
        SG.pauseOverlay.addEventListener('touchend', function(e) {
            if (e.target.closest('.menu-btn')) return;
            e.preventDefault();
            if (e.target === SG.pauseOverlay) SG.togglePause();
        });

        SG.pauseBtnEl.addEventListener('click', SG.togglePause);
        SG.pauseBtnEl.addEventListener('touchend', function(e) { e.preventDefault(); SG.togglePause(); });

        var pauseMenuBtn = document.getElementById('pause-menu-btn');
        if (pauseMenuBtn) {
            pauseMenuBtn.addEventListener('click', function(e) { e.stopPropagation(); SG.quitToMenu(); });
            pauseMenuBtn.addEventListener('touchend', function(e) { e.stopPropagation(); e.preventDefault(); SG.quitToMenu(); });
        }

        var conInput = document.getElementById('console-input');
        if (conInput) {
            SG.consoleHistory = SG.consoleHistory || [];
            SG.consoleHistoryIndex = SG.consoleHistory.length;
            SG.consoleCommands = SG.consoleCommands || {};

            SG.consoleLog = function(text, kind) {
                var out = document.getElementById('console-output');
                if (!out) return;
                var line = document.createElement('div');
                line.className = 'console-line' + (kind ? ' ' + kind : '');
                line.textContent = String(text);
                out.appendChild(line);
                while (out.children.length > 80) out.removeChild(out.firstChild);
                out.scrollTop = out.scrollHeight;
            };

            SG.clearConsole = function() {
                var out = document.getElementById('console-output');
                if (out) out.innerHTML = '';
            };

            SG.registerConsoleCommand = function(name, description, handler) {
                SG.consoleCommands[name] = { description: description, handler: handler };
            };

            SG.registerConsoleCommand('help', 'List available commands', function() {
                var names = Object.keys(SG.consoleCommands).filter(function(name) { return name !== 'homelander'; }).sort();
                SG.consoleLog('Commands: ' + names.join(', '), 'ok');
                SG.consoleLog('Try: status, speed 20, coins 5000, ability jetpack, normal');
            });
            SG.registerConsoleCommand('clear', 'Clear console output', function() { SG.clearConsole(); });
            SG.registerConsoleCommand('status', 'Show run state', function() {
                var speedLevel = SG.getSpeedLevel ? SG.getSpeedLevel(SG.state.speed) : 1;
                SG.consoleLog('score=' + Math.floor(SG.state.score || 0) + 'm coins=' + (SG.state.coins || 0) + ' speed=' + speedLevel + 'x ability=' + (SG.state.equippedAbility || 0), 'ok');
            });
            SG.registerConsoleCommand('speed', 'Set speed level 1-50', function(args) {
                var level = Math.max(1, Math.min(50, parseInt(args[0] || '1', 10) || 1));
                SG.state.speed = SG.speedForLevel ? SG.speedForLevel(level) : SG.START_SPEED + (SG.MAX_SPEED - SG.START_SPEED) * ((level - 1) / 49);
                SG.consoleLog('speed set to ' + level + 'x', 'ok');
            });
            SG.registerConsoleCommand('coins', 'Add credits/coins to this run', function(args) {
                var amount = Math.max(0, parseInt(args[0] || '0', 10) || 0);
                SG.state.coins += amount;
                SG.state.credits += amount;
                if (SG.updateMenuCredits) SG.updateMenuCredits();
                SG.consoleLog('added ' + amount + ' coins and credits', 'ok');
            });
            SG.registerConsoleCommand('ability', 'Equip ability: none/double/jetpack/roof', function(args) {
                var key = String(args[0] || '').toLowerCase();
                var map = { none: 0, double: 1, dj: 1, jetpack: 2, jet: 2, roof: 3 };
                if (!(key in map)) { SG.consoleLog('usage: ability none|double|jetpack|roof', 'err'); return; }
                SG.state.equippedAbility = map[key];
                if (SG.state.equippedAbility === 1) SG.state.canDoubleJump = true;
                if (SG.state.equippedAbility === 2) SG.state.canJetpack = true;
                if (SG.state.equippedAbility === 3) SG.state.canRoofWalk = true;
                if (SG.saveShopData) SG.saveShopData();
                SG.consoleLog('equipped ability ' + key, 'ok');
            });
            SG.registerConsoleCommand('restart', 'Restart current run', function() {
                if (SG.restartGame) SG.restartGame();
                SG.consoleLog('run restarted', 'ok');
            });
            SG.registerConsoleCommand('homelander', 'Easter egg: enable Homelander mode', function() {
                SG.state.homelander = true;
                SG.pendingHomelanderVoice = true;
                if (SG.activateHomelander) SG.activateHomelander();
                SG.consoleLog('homelander mode enabled', 'ok');
            });
            SG.registerConsoleCommand('normal', 'Disable Homelander mode', function() {
                if (SG.deactivateHomelander) SG.deactivateHomelander();
                SG.consoleLog('homelander mode disabled', 'ok');
            });
            SG.registerConsoleCommand('quit', 'Alias for normal', function() {
                if (SG.deactivateHomelander) SG.deactivateHomelander();
                SG.consoleLog('homelander mode disabled', 'ok');
            });

            SG.executeConsoleCommand = function(raw) {
                raw = String(raw || '').trim();
                if (!raw) return;
                SG.consoleLog('> ' + raw, 'cmd');
                SG.consoleHistory.push(raw);
                SG.consoleHistoryIndex = SG.consoleHistory.length;
                var parts = raw.split(/\s+/);
                var name = parts.shift().toLowerCase();
                var cmd = SG.consoleCommands[name];
                if (!cmd) {
                    SG.consoleLog('unknown command: ' + name + ' (type help)', 'err');
                    return;
                }
                try {
                    cmd.handler(parts, raw);
                } catch (err) {
                    SG.consoleLog('error: ' + (err && err.message ? err.message : err), 'err');
                }
            };

            function submitConsoleCommand() {
                var val = conInput.value.trim();
                conInput.value = '';
                SG.executeConsoleCommand(val);
            }
            conInput.addEventListener('keydown', function(e) {
                if (e.key === '`' || e.key === '~') {
                    e.preventDefault();
                    e.stopPropagation();
                    SG.toggleConsole();
                    return;
                }
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    submitConsoleCommand();
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    SG.consoleHistoryIndex = Math.max(0, SG.consoleHistoryIndex - 1);
                    conInput.value = SG.consoleHistory[SG.consoleHistoryIndex] || '';
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    SG.consoleHistoryIndex = Math.min(SG.consoleHistory.length, SG.consoleHistoryIndex + 1);
                    conInput.value = SG.consoleHistory[SG.consoleHistoryIndex] || '';
                }
                if (e.key === 'Escape') {
                    if (SG.closeConsole) SG.closeConsole();
                }
                e.stopPropagation();
            });
            conInput.addEventListener('input', function() {
                if (conInput.value.includes('\n')) {
                    submitConsoleCommand();
                }
            });
            conInput.addEventListener('blur', function() {
                setTimeout(function() {
                    var con = document.getElementById('dev-console');
                    if (con && con.style.display === 'flex') conInput.focus();
                }, 0);
            });
        }

        // ===== MOBILE BUTTONS =====
        function bindMobileBtn(id, action, key) {
            var btn = document.getElementById(id);
            if (!btn) return;
            var start = function(e) {
                e.preventDefault(); e.stopPropagation();
                if (key) SG.keys[key] = true;
                if (SG.state.started && !SG.state.paused && !SG.state.gameOver) action();
            };
            var end = function(e) { if (key) SG.keys[key] = false; };
            btn.addEventListener('touchstart', start, { passive: false });
            btn.addEventListener('touchend', end, { passive: false });
            btn.addEventListener('touchcancel', end, { passive: false });
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', end);
        }
        bindMobileBtn('m-left', SG.moveLeft, 'ArrowLeft');
        bindMobileBtn('m-right', SG.moveRight, 'ArrowRight');
        bindMobileBtn('m-jump', SG.jump, 'w');
        bindMobileBtn('m-roll', SG.roll, 's');
    };

    // ===== PVP Phase 1 local room prototype =====
    SG.pvpRooms = SG.pvpRooms || [
        { id: 'R-101', name: 'Neon Rush', host: 'Astra', players: [{ name: 'Astra', ready: true }, { name: 'Byte', ready: false }], maxPlayers: 3, locked: false },
        { id: 'R-204', name: 'Glass Track', host: 'Vector', players: [{ name: 'Vector', ready: true }, { name: 'Echo', ready: true }, { name: 'Nova', ready: false }], maxPlayers: 3, locked: false }
    ];

    SG.getLocalPvpName = function() {
        return (SG.state && SG.state.username) || localStorage.getItem('subwayUsername') || 'You';
    };

    SG.createLocalPvpRoom = function() {
        var room = {
            id: 'LOCAL-' + Math.floor(1000 + Math.random() * 9000),
            name: 'Cyber Sprint',
            host: SG.getLocalPvpName(),
            localHost: true,
            players: [
                { name: SG.getLocalPvpName(), ready: true, local: true, lane: 1 },
                { name: 'Echo', ready: false, invited: false, bot: true, lane: 0 },
                { name: 'Vector', ready: false, invited: false, bot: true, lane: 2 }
            ],
            maxPlayers: 3,
            locked: false
        };
        SG.state.pvpRoom = room;
        SG.renderPvpLobby();
    };

    SG.joinLocalPvpRoom = function(roomId) {
        var room = null;
        for (var i = 0; i < SG.pvpRooms.length; i++) {
            if (SG.pvpRooms[i].id === roomId) room = SG.pvpRooms[i];
        }
        if (!room) return;
        var copy = {
            id: room.id,
            name: room.name,
            host: room.host,
            localHost: false,
            players: room.players.slice(0, 2).map(function(p, idx) {
                return { name: p.name, ready: !!p.ready, bot: true, lane: idx === 0 ? 0 : 2 };
            }),
            maxPlayers: 3,
            locked: room.locked
        };
        copy.players.push({ name: SG.getLocalPvpName(), ready: false, local: true, lane: 1 });
        SG.state.pvpRoom = copy;
        SG.renderPvpLobby();
    };

    SG.invitePvpBot = function(index, accept) {
        var room = SG.state.pvpRoom;
        if (!room || !room.players[index]) return;
        room.players[index].invited = true;
        room.players[index].ready = !!accept;
        room.players[index].declined = !accept;
        SG.renderPvpLobby();
    };

    SG.togglePvpReady = function() {
        var room = SG.state.pvpRoom;
        if (!room) return;
        for (var i = 0; i < room.players.length; i++) {
            if (room.players[i].local) room.players[i].ready = !room.players[i].ready;
        }
        SG.renderPvpLobby();
    };

    SG.isPvpRoomReady = function(room) {
        if (!room || room.players.length < 2) return false;
        for (var i = 0; i < room.players.length; i++) {
            if (!room.players[i].ready) return false;
        }
        return true;
    };

    SG.renderPvpLobby = function() {
        var panel = document.getElementById('pvp-panel');
        if (!panel) return;
        var room = SG.state.pvpRoom;
        var html = '<div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px;">' +
            '<div><div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:0;">PVP Rooms</div>' +
            '<div style="color:rgba(231,224,255,.72);font-size:13px;margin-top:4px;">Phase 1 local prototype - server sync lands in Phase 2</div></div>' +
            '<button id="pvp-close" style="height:38px;padding:0 16px;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;font-weight:800;cursor:pointer;">Close</button></div>';
        if (!room) {
            html += '<button id="pvp-create" style="width:100%;height:44px;margin-bottom:16px;border:0;border-radius:6px;background:linear-gradient(90deg,#ff2ccf,#8d35ff);color:#fff;font-weight:900;cursor:pointer;">Create Room</button>';
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;">';
            for (var r = 0; r < SG.pvpRooms.length; r++) {
                var listed = SG.pvpRooms[r];
                html += '<div style="border:1px solid rgba(141,53,255,.35);background:rgba(255,255,255,.05);border-radius:8px;padding:14px;">' +
                    '<div style="font-size:17px;font-weight:900;color:#fff;">' + listed.name + '</div>' +
                    '<div style="font-size:12px;color:rgba(231,224,255,.7);margin:5px 0 12px;">Host: ' + listed.host + ' | ' + listed.players.length + '/' + listed.maxPlayers + '</div>' +
                    '<button class="pvp-join" data-room="' + listed.id + '" style="width:100%;height:36px;border-radius:6px;border:1px solid rgba(255,44,207,.55);background:rgba(255,44,207,.14);color:#fff;font-weight:800;cursor:pointer;">Join</button>' +
                '</div>';
            }
            html += '</div>';
        } else {
            html += '<div style="display:grid;grid-template-columns:1.2fr .8fr;gap:16px;">';
            html += '<section style="border:1px solid rgba(255,44,207,.35);border-radius:8px;padding:16px;background:rgba(255,255,255,.045);">' +
                '<div style="font-size:20px;font-weight:900;color:#fff;margin-bottom:4px;">' + room.name + '</div>' +
                '<div style="font-size:12px;color:rgba(231,224,255,.7);margin-bottom:14px;">Room ' + room.id + ' | Host: ' + room.host + ' | Max 3 players</div>';
            for (var p = 0; p < room.players.length; p++) {
                var player = room.players[p];
                var status = player.declined ? 'DECLINED' : (player.ready ? 'READY' : (player.invited ? 'INVITED' : 'WAITING'));
                html += '<div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;margin:8px 0;padding:10px;border-radius:6px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);">' +
                    '<div><strong>' + player.name + '</strong><span style="margin-left:8px;color:' + (player.ready ? '#68ffcc' : '#ffd36b') + ';">' + status + '</span><div style="font-size:11px;color:rgba(231,224,255,.58);">Lane ' + (player.lane + 1) + '</div></div>';
                if (room.localHost && player.bot && !player.ready) {
                    html += '<div><button class="pvp-invite-accept" data-index="' + p + '" style="height:30px;margin-right:6px;border:0;border-radius:5px;background:#25d6a2;color:#06120f;font-weight:900;cursor:pointer;">Accept</button><button class="pvp-invite-decline" data-index="' + p + '" style="height:30px;border:0;border-radius:5px;background:#36243d;color:#fff;font-weight:800;cursor:pointer;">Refuse</button></div>';
                } else {
                    html += '<div></div>';
                }
                html += '</div>';
            }
            var ready = SG.isPvpRoomReady(room);
            html += '<div style="display:flex;gap:10px;margin-top:16px;">' +
                '<button id="pvp-ready" style="flex:1;height:40px;border-radius:6px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#fff;font-weight:900;cursor:pointer;">Ready</button>' +
                '<button id="pvp-start" ' + (!room.localHost || !ready ? 'disabled' : '') + ' style="flex:1;height:40px;border-radius:6px;border:0;background:' + (room.localHost && ready ? 'linear-gradient(90deg,#ff2ccf,#8d35ff)' : 'rgba(255,255,255,.12)') + ';color:#fff;font-weight:900;cursor:' + (room.localHost && ready ? 'pointer' : 'not-allowed') + ';">Start Game</button>' +
                '<button id="pvp-leave" style="height:40px;padding:0 14px;border-radius:6px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font-weight:800;cursor:pointer;">Leave</button>' +
            '</div></section>';
            html += '<aside style="border:1px solid rgba(141,53,255,.32);border-radius:8px;padding:16px;background:rgba(0,0,0,.22);font-size:13px;color:rgba(241,237,255,.82);line-height:1.5;">' +
                '<strong style="display:block;color:#fff;font-size:16px;margin-bottom:8px;">Phase 1 Rules</strong>' +
                '<div>Scene: cyber glass track</div><div>Difficulty: medium obstacles</div><div>Countdown: 10 seconds</div><div>Pause and console disabled</div><div>Players: no body collision</div><div>Ghosts: local placeholders now, realtime sync next</div></aside>';
            html += '</div>';
        }
        panel.innerHTML = html;
        var close = document.getElementById('pvp-close');
        if (close) close.onclick = function() { SG.pvpOverlay.style.display = 'none'; };
        var create = document.getElementById('pvp-create');
        if (create) create.onclick = SG.createLocalPvpRoom;
        var leave = document.getElementById('pvp-leave');
        if (leave) leave.onclick = function() { SG.state.pvpRoom = null; SG.renderPvpLobby(); };
        var readyBtn = document.getElementById('pvp-ready');
        if (readyBtn) readyBtn.onclick = SG.togglePvpReady;
        var startBtn = document.getElementById('pvp-start');
        if (startBtn) startBtn.onclick = SG.startPvpRace;
        var joins = panel.querySelectorAll('.pvp-join');
        for (var j = 0; j < joins.length; j++) joins[j].onclick = function() { SG.joinLocalPvpRoom(this.getAttribute('data-room')); };
        var accepts = panel.querySelectorAll('.pvp-invite-accept');
        for (var a = 0; a < accepts.length; a++) accepts[a].onclick = function() { SG.invitePvpBot(parseInt(this.getAttribute('data-index'), 10), true); };
        var declines = panel.querySelectorAll('.pvp-invite-decline');
        for (var d = 0; d < declines.length; d++) declines[d].onclick = function() { SG.invitePvpBot(parseInt(this.getAttribute('data-index'), 10), false); };
    };

    SG.showPvpLobby = function() {
        if (!SG.pvpOverlay) return;
        SG.renderPvpLobby();
        SG.pvpOverlay.style.display = 'flex';
    };

    SG.createPvpGhostGroup = function(name, lane, color) {
        var group = new THREE.Group();
        group.userData.pvpGhost = true;
        group.userData.name = name;
        group.userData.lane = lane;
        var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.34, depthWrite: false });
        var coreGeo = THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.28, 0.9, 4, 8) : new THREE.CylinderGeometry(0.28, 0.28, 1.25, 12);
        var core = new THREE.Mesh(coreGeo, mat);
        core.position.y = 0.85;
        group.add(core);
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), mat);
        head.position.y = 1.62;
        group.add(head);
        var halo = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.5, 24), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
        halo.position.y = 0.05;
        halo.rotation.x = Math.PI / 2;
        group.add(halo);
        group.position.set(SG.LANE_POSITIONS[lane], SG.PLAYER_Y, -2);
        return group;
    };

    SG.spawnPvpGhosts = function(room) {
        SG.state.pvpGhosts = [];
        if (!room || !SG.scene) return;
        var colors = [0xff2ccf, 0x8d35ff, 0x42f5ff];
        for (var i = 0; i < room.players.length; i++) {
            var p = room.players[i];
            if (p.local) continue;
            var ghost = {
                name: p.name,
                lane: typeof p.lane === 'number' ? p.lane : (i % 3),
                distance: 0,
                speedBias: 0.9 + i * 0.18,
                group: SG.createPvpGhostGroup(p.name, typeof p.lane === 'number' ? p.lane : (i % 3), colors[i % colors.length])
            };
            SG.scene.add(ghost.group);
            SG.state.pvpGhosts.push(ghost);
        }
    };

    SG.updatePvpGhosts = function(delta) {
        if (!SG.state.pvpMode) return;
        var playerDistance = SG.state.score || 0;
        for (var i = 0; i < SG.state.pvpGhosts.length; i++) {
            var ghost = SG.state.pvpGhosts[i];
            ghost.distance += (SG.getDistanceRate ? SG.getDistanceRate(SG.state.speed) : 8) * ghost.speedBias * delta;
            var lead = Math.max(-6, Math.min(10, (ghost.distance - playerDistance) * 0.22));
            if (ghost.group) {
                ghost.group.position.x += (SG.LANE_POSITIONS[ghost.lane] - ghost.group.position.x) * 0.12;
                ghost.group.position.z += (lead - ghost.group.position.z) * 0.12;
                ghost.group.position.y = SG.PLAYER_Y + Math.sin(SG.state.gameTime * 9 + i) * 0.035;
                ghost.group.rotation.y = Math.PI;
                ghost.group.visible = true;
            }
        }
        if (SG.pvpHudEl) {
            var lines = ['PVP ROOM ' + (SG.state.pvpRoom ? SG.state.pvpRoom.id : 'LOCAL')];
            lines.push('You ' + Math.floor(playerDistance) + 'm');
            for (var g = 0; g < SG.state.pvpGhosts.length; g++) {
                lines.push(SG.state.pvpGhosts[g].name + ' ' + Math.floor(SG.state.pvpGhosts[g].distance) + 'm');
            }
            SG.pvpHudEl.innerHTML = lines.join('<br>');
        }
    };

    SG.buildPvpResult = function(playerDistance) {
        var rows = [{ name: SG.getLocalPvpName(), distance: playerDistance || 0 }];
        for (var i = 0; i < SG.state.pvpGhosts.length; i++) {
            rows.push({ name: SG.state.pvpGhosts[i].name, distance: SG.state.pvpGhosts[i].distance || 0 });
        }
        rows.sort(function(a, b) { return b.distance - a.distance; });
        return rows;
    };

    SG.exitPvpToLobby = function() {
        SG.stopBgMusic();
        SG.state.pvpMode = false;
        SG.state.started = false;
        SG.state.gameOver = false;
        SG.state.countdownActive = false;
        if (SG.pvpHudEl) SG.pvpHudEl.style.display = 'none';
        if (SG.gameOverEl) {
            SG.gameOverEl.classList.remove('visible');
            var title = SG.gameOverEl.querySelector('h1');
            if (title) title.textContent = 'GAME OVER';
        }
        SG.resetAllGameObjects();
        SG.resetCyberMode();
        SG.spawnInitialTrack();
        SG.spawnBuildings();
        SG.spawnObstacles();
        if (SG.menuOverlay) SG.menuOverlay.style.display = 'none';
        if (SG.pvpOverlay) {
            SG.renderPvpLobby();
            SG.pvpOverlay.style.display = 'flex';
        }
    };

    SG.startPvpRace = function() {
        var room = SG.state.pvpRoom;
        if (!SG.isPvpRoomReady(room) || !room.localHost) return;
        if (SG.cancelStartCountdown) SG.cancelStartCountdown();
        SG.stopBgMusic();
        SG.stopPoliceChase();
        SG.resetAllGameObjects();
        SG.state.pvpMode = true;
        SG.state.pvpResult = null;
        SG.state.difficulty = 1;
        SG.state.score = 0;
        SG.state.coins = 0;
        SG.state.speed = SG.START_SPEED;
        SG.state.gameOver = false;
        SG.state.started = false;
        SG.state.paused = false;
        SG.state.currentLane = 1;
        SG.state.targetLane = 1;
        SG.state.laneLerp = 1;
        SG.state.isJumping = false;
        SG.state.isRolling = false;
        SG.state.jumpVelocity = 0;
        SG.state.playerHeight = SG.PLAYER_Y;
        SG.state.targetPlayerHeight = SG.PLAYER_Y;
        SG.state.gameTime = 0;
        if (SG.player) {
            SG.player.position.set(SG.LANE_POSITIONS[1], SG.PLAYER_Y, 0);
            SG.player.rotation.set(0, Math.PI, 0);
            SG.player.visible = true;
        }
        if (SG.menuOverlay) SG.menuOverlay.style.display = 'none';
        if (SG.pvpOverlay) SG.pvpOverlay.style.display = 'none';
        if (SG.pauseOverlay) SG.pauseOverlay.style.display = 'none';
        if (SG.pauseBtnEl) SG.pauseBtnEl.style.display = 'none';
        var con = document.getElementById('con-btn');
        if (con) con.style.display = 'none';
        if (SG.pvpHudEl) SG.pvpHudEl.style.display = 'block';
        SG.applyPvpScene(true);
        SG.spawnInitialTrack();
        SG.spawnBuildings();
        SG.spawnObstacles();
        SG.spawnPvpGhosts(room);
        SG.beginRunWithCountdown();
    };

    // ===== Toggle functions (on SG for cross-module access) =====
    SG.countdownSequence = ['3', '2', '1', 'RUN!'];
    SG.COUNTDOWN_STEP_MS = SG.COUNTDOWN_STEP_MS || 720;
    SG.COUNTDOWN_RUN_MS = SG.COUNTDOWN_RUN_MS || 560;
    SG.PVP_COUNTDOWN_STEP_MS = SG.PVP_COUNTDOWN_STEP_MS || 1000;
    SG.PVP_COUNTDOWN_RUN_MS = SG.PVP_COUNTDOWN_RUN_MS || 650;

    SG.getCountdownSequence = function() {
        if (!SG.state.pvpMode) return SG.countdownSequence || ['3', '2', '1', 'RUN!'];
        var seq = [];
        for (var i = SG.state.pvpCountdownSeconds || 10; i >= 1; i--) seq.push(String(i));
        seq.push('RUN!');
        return seq;
    };

    SG.cancelStartCountdown = function() {
        if (SG.countdownTimer) {
            clearTimeout(SG.countdownTimer);
            SG.countdownTimer = null;
        }
        SG.state.countdownActive = false;
        if (SG.countdownOverlay) SG.countdownOverlay.style.display = 'none';
    };

    SG.runStartCountdown = function(done) {
        if (SG.skipCountdownForTests) {
            SG.state.countdownActive = false;
            if (SG.countdownOverlay) SG.countdownOverlay.style.display = 'none';
            if (done) done();
            return;
        }
        if (SG.state.countdownActive) return;
        SG.state.countdownActive = true;
        SG.state.started = false;
        SG.state.paused = false;
        var seq = SG.getCountdownSequence ? SG.getCountdownSequence() : (SG.countdownSequence || ['3', '2', '1', 'RUN!']);
        var index = 0;
        var overlay = SG.countdownOverlay || document.getElementById('start-countdown');
        function showNext() {
            if (!overlay) {
                SG.state.countdownActive = false;
                if (done) done();
                return;
            }
            overlay.textContent = seq[index];
            overlay.style.display = 'flex';
            overlay.style.transform = 'translateY(-3vh) scale(1.08)';
            overlay.style.opacity = '1';
            requestAnimationFrame(function() {
                overlay.style.transition = 'transform 180ms ease-out, opacity 180ms ease-out';
                overlay.style.transform = 'translateY(-3vh) scale(1)';
            });
            index++;
            var delay = seq[index - 1] === 'RUN!'
                ? (SG.state.pvpMode ? SG.PVP_COUNTDOWN_RUN_MS : SG.COUNTDOWN_RUN_MS)
                : (SG.state.pvpMode ? SG.PVP_COUNTDOWN_STEP_MS : SG.COUNTDOWN_STEP_MS);
            SG.countdownTimer = setTimeout(function() {
                if (index >= seq.length) {
                    overlay.style.opacity = '0';
                    SG.countdownTimer = setTimeout(function() {
                        overlay.style.display = 'none';
                        overlay.style.transition = '';
                        SG.state.countdownActive = false;
                        SG.countdownTimer = null;
                        if (done) done();
                    }, 140);
                    return;
                }
                showNext();
            }, delay);
        }
        showNext();
    };

    SG.beginRunWithCountdown = function() {
        SG.state.started = false;
        SG.state.paused = false;
        if (SG.pauseBtnEl) SG.pauseBtnEl.style.display = 'none';
        SG.runStartCountdown(function() {
            SG.state.started = true;
            SG.state.paused = false;
            if (SG.pauseBtnEl && !SG.state.pvpMode) {
                SG.pauseBtnEl.style.display = 'block';
                SG.pauseBtnEl.textContent = '\u23F8';
            }
            var cb = document.getElementById('con-btn');
            if (cb) cb.style.display = SG.state.pvpMode ? 'none' : 'block';
            var f = document.getElementById('fpv-btn');
            if (f) f.style.display = 'block';
            if (SG.clock) SG.clock.getDelta();
            SG.startBgMusic();
        });
    };

    SG.startGameFromMenu = function() {
        if (SG.state.started || SG.state.countdownActive) return;
        SG.state.pvpMode = false;
        SG.menuOverlay.style.display = 'none';
        var cb = document.getElementById('con-btn');
        if (cb) cb.style.display = 'block';
        var audioBtns = ['mute-btn'];
        audioBtns.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'flex';
        });
        if (!SG.audioCtx) SG.initAudio();
        SG.beginRunWithCountdown();
    };

    SG.closeConsole = function() {
        var con = document.getElementById('dev-console');
        if (!con) return;
        con.style.display = 'none';
        SG.state.paused = false;
        if (SG.updateGunCrosshair) SG.updateGunCrosshair();
        if (SG.updateGunViewModel) SG.updateGunViewModel();
        if (SG.playPendingHomelanderVoice) SG.playPendingHomelanderVoice();
    };

    SG.toggleConsole = function() {
        if (SG.state.pvpMode) return;
        var con = document.getElementById('dev-console');
        if (!con) return;
        if (con.style.display === 'flex') {
            SG.closeConsole();
            return;
        }
        con.style.display = 'flex';
        SG.state.paused = true;
        if (SG.updateGunCrosshair) SG.updateGunCrosshair();
        if (SG.updateGunViewModel) SG.updateGunViewModel();
        var ci = document.getElementById('console-input');
        if (ci) {
            ci.value = '';
            ci.focus();
            setTimeout(function() { ci.focus(); }, 100);
        }
    };

    SG.togglePause = function() {
        if (SG.state.pvpMode) return;
        if (!SG.state.started || SG.state.gameOver) return;
        SG.state.paused = !SG.state.paused;
        if (SG.state.paused) {
            SG.pauseOverlay.style.display = 'flex';
            SG.pauseBtnEl.textContent = '\u25B6';
            if (SG.clock) SG.clock.getDelta();
        } else {
            SG.pauseOverlay.style.display = 'none';
            SG.pauseBtnEl.textContent = '\u23F8';
            if (SG.clock) SG.clock.getDelta();
        }
        if (SG.updateGunCrosshair) SG.updateGunCrosshair();
        if (SG.updateGunViewModel) SG.updateGunViewModel();
    };

    SG.toggleMute = function() {
        SG.state.muted = !SG.state.muted;
        var muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.textContent = SG.state.muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
        }
        if (SG.state.muted && SG.audioCtx) {
            try { SG.audioCtx.suspend(); } catch(e) {}
            SG.stopBgMusic();
            SG.stopSiren();
            if (SG.stopHomelanderAudio) SG.stopHomelanderAudio();
        } else if (!SG.state.muted && SG.audioCtx && SG.audioCtx.state === 'suspended') {
            try { SG.audioCtx.resume(); } catch(e) {}
            if (SG.state.started && !SG.state.gameOver) SG.startBgMusic();
            if (SG.state.homelander && SG.startHomelanderTheme) SG.startHomelanderTheme();
        }
    };
})();


// ===== ENDLESS RUNNER - Controls =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var THREE = window.THREE;

    SG.keys = {};
    SG.defaultKeyBindings = SG.defaultKeyBindings || {
        left: 'ArrowLeft',
        right: 'ArrowRight',
        up: 'ArrowUp',
        down: 'ArrowDown'
    };

    SG.keyBindingLabels = SG.keyBindingLabels || {
        left: 'Left',
        right: 'Right',
        up: 'Up',
        down: 'Down'
    };

    SG.loadKeyBindings = function() {
        var saved = null;
        try { saved = JSON.parse(localStorage.getItem('subwayKeyBindings') || 'null'); } catch(e) {}
        var bindings = {};
        for (var action in SG.defaultKeyBindings) {
            if (!Object.prototype.hasOwnProperty.call(SG.defaultKeyBindings, action)) continue;
            bindings[action] = (saved && typeof saved[action] === 'string' && saved[action]) ?
                saved[action] : SG.defaultKeyBindings[action];
        }
        SG.keyBindings = bindings;
        return bindings;
    };

    SG.getKeyBindings = function() {
        if (!SG.keyBindings) return SG.loadKeyBindings();
        return SG.keyBindings;
    };

    SG.saveKeyBindings = function(bindings) {
        SG.keyBindings = bindings || SG.getKeyBindings();
        try { localStorage.setItem('subwayKeyBindings', JSON.stringify(SG.keyBindings)); } catch(e) {}
    };

    SG.setKeyBinding = function(action, key) {
        if (!SG.defaultKeyBindings[action] || !key) return false;
        var bindings = SG.getKeyBindings();
        bindings[action] = key;
        SG.saveKeyBindings(bindings);
        return true;
    };

    SG.resetKeyBindings = function() {
        SG.keyBindings = Object.assign({}, SG.defaultKeyBindings);
        SG.saveKeyBindings(SG.keyBindings);
    };

    SG.formatKeyName = function(key) {
        var names = {
            ArrowLeft: 'Left',
            ArrowRight: 'Right',
            ArrowUp: 'Up',
            ArrowDown: 'Down',
            ' ': 'Space'
        };
        return names[key] || key;
    };

    SG.getInputActionForKey = function(key) {
        var bindings = SG.getKeyBindings();
        for (var action in bindings) {
            if (Object.prototype.hasOwnProperty.call(bindings, action) && bindings[action] === key) return action;
        }
        return null;
    };

    SG.isActionHeld = function(action) {
        var key = SG.getKeyBindings()[action];
        return !!(key && SG.keys[key]);
    };

    SG.forceJetpackLanding = function() {
        if (!(SG.state.equippedAbility === 2 && SG.state.canJetpack && SG.state.jetpackFuel > 0)) return false;
        SG.state.jetpackFuel = 0;
        SG.state.jetpackCooldown = SG.JETPACK_COOLDOWN_MAX;
        SG.state.isJumping = false;
        SG.state.hasDoubleJumped = false;
        SG.state.jumpingFromRoof = false;
        SG.state.jumpVelocity = 0;
        SG.state.playerHeight = SG.PLAYER_Y;
        SG.state.targetPlayerHeight = SG.PLAYER_Y;
        if (SG.player) SG.player.position.y = SG.PLAYER_Y;
        return true;
    };

    SG.moveLeft = function() {
        if (SG.state.homelander && SG.homelanderGroup) {
            SG.homelanderGroup.position.x -= 0.35;
            return;
        }
        if (SG.state.currentLane > 0) {
            SG.state.startLaneX = SG.player.position.x;
            SG.state.currentLane--;
            SG.state.targetLane = SG.state.currentLane;
            SG.state.laneLerp = 0;
        }
    };

    SG.moveRight = function() {
        if (SG.state.homelander && SG.homelanderGroup) {
            SG.homelanderGroup.position.x += 0.35;
            return;
        }
        if (SG.state.currentLane < SG.LANE_COUNT - 1) {
            SG.state.startLaneX = SG.player.position.x;
            SG.state.currentLane++;
            SG.state.targetLane = SG.state.currentLane;
            SG.state.laneLerp = 0;
        }
    };

    SG.jump = function() {
        if (SG.state.isJumping) {
            // Only use the EQUIPPED skill
            if (SG.state.equippedAbility === 2 && SG.state.canJetpack && SG.state.jetpackCooldown <= 0 && SG.state.jetpackFuel <= 0) {
                SG.state.jetpackFuel = SG.JETPACK_FUEL_MAX;
                SG.state.jumpVelocity = 0;
                SG.playJumpSound();
                return;
            }
            if (SG.state.equippedAbility === 2 && SG.state.canJetpack && SG.state.jetpackFuel > 0) {
                return;
            }
            if (SG.state.equippedAbility === 1 && SG.state.canDoubleJump && !SG.state.hasDoubleJumped) {
                SG.state.hasDoubleJumped = true;
                SG.state.jumpVelocity = SG.DOUBLE_JUMP_VELOCITY;
                SG.state.playerHeight = Math.max(SG.state.playerHeight, 0.5);
                SG.playJumpSound();
                return;
            }
            return;
        }

        SG.state.isJumping = true;
        if (SG.state.isRolling) {
            SG.state.rollEndTime = Date.now() + 99999;
            SG.state.targetPlayerHeight = SG.ROLL_HEIGHT;
            SG.state.jumpVelocity = SG.JUMP_VELOCITY * 1.5;
            SG.playJumpSound();
            return;
        }
        if (SG.state.onRoof) {
            SG.state.jumpingFromRoof = true;
            SG.state.onRoof = false;
            SG.state.jumpVelocity = SG.JUMP_VELOCITY;
            SG.playJumpSound();
            return;
        }
        SG.state.jumpVelocity = SG.JUMP_VELOCITY;
        SG.playJumpSound();
    };

    SG.roll = function() {
        var landedFromJetpack = SG.forceJetpackLanding();
        if (SG.state.isRolling) return;
        SG.state.isRolling = true;
        SG.state.targetPlayerHeight = SG.ROLL_HEIGHT;
        SG.state.rollEndTime = Date.now() + (landedFromJetpack ? 520 : 400);
        SG.playRollSound();
    };

    SG.handleKeyInput = function(key) {
        if (SG.state.gameOver || !SG.state.started) return;
        var action = SG.getInputActionForKey(key);
        if (SG.state.homelander && action) return;

        if (!SG.audioCtx) SG.initAudio();

        switch (action) {
            case 'left':
                SG.moveLeft();
                break;
            case 'right':
                SG.moveRight();
                break;
            case 'up':
                SG.jump();
                break;
            case 'down':
                SG.roll();
                break;
        }
    };

    SG.setupControls = function() {
        document.addEventListener('keydown', function(e) {
            SG.keys[e.key] = true;
            if (e.keyCode) { SG.keys['_kc_' + e.keyCode] = true; }

            if (SG.state.homelander && SG.homelanderGroup) {
                var hlSpeed = 0.25;
                var hla = SG.getInputActionForKey(e.key);
                if (hla === 'left') { SG.homelanderGroup.position.x -= hlSpeed; e.preventDefault(); }
                if (hla === 'right') { SG.homelanderGroup.position.x += hlSpeed; e.preventDefault(); }
                if (hla === 'up') { SG.homelanderGroup.position.y = Math.min(20, SG.homelanderGroup.position.y + hlSpeed); e.preventDefault(); }
                if (hla === 'down') { SG.homelanderGroup.position.y = Math.max(1, SG.homelanderGroup.position.y - hlSpeed); e.preventDefault(); }
            }

            if (e.key === 'Escape') {
                if (SG.state.pvpMode) {
                    e.preventDefault();
                    return;
                }
                var devCon = document.getElementById('dev-console');
                if (devCon && devCon.style.display === 'flex') {
                    SG.toggleConsole();
                    return;
                }
                if (SG.state.started && !SG.state.gameOver) {
                    SG.togglePause();
                    return;
                }
            }
            if (e.key === '`' || e.key === '~') {
                e.preventDefault();
                if (SG.state.pvpMode) return;
                SG.toggleConsole();
                return;
            }

            if (!SG.state.started && (e.key === ' ' || e.key === 'Enter')) {
                SG.startGameFromMenu();
                return;
            }

            if ((e.key === 'f' || e.key === 'F') && SG.shootGun && SG.state.started) {
                if (SG.shootGun()) {
                    e.preventDefault();
                    return;
                }
            }

            if ((e.key === 'm' || e.key === 'M') && SG.state.started) {
                if (SG.state.pvpMode) {
                    e.preventDefault();
                    return;
                }
                if (!SG.state.gameOver) {
                    SG.togglePause();
                    setTimeout(SG.quitToMenu, 100);
                } else {
                    SG.quitToMenu();
                }
                return;
            }

            SG.handleKeyInput(e.key);
        });

        document.addEventListener('keyup', function(e) {
            SG.keys[e.key] = false;
            if (e.keyCode) { SG.keys['_kc_' + e.keyCode] = false; }
        });

        document.addEventListener('mousedown', function(e) {
            if (!SG.shootGun || e.button !== 0) return;
            if (!SG.state.started || SG.state.paused || SG.state.gameOver) return;
            var target = e.target;
            if (target && target.closest && target.closest('#menu-overlay,#pause-overlay,#game-over-screen,#settings-overlay,#characters-overlay,#dev-console,button,input,textarea,select,.mobile-btn')) return;
            if (SG.shootGun()) e.preventDefault();
        });

        // Touch controls
        var touchStartX = 0, touchStartY = 0, touchStartTime = 0;
        var isTouching = false;

        document.addEventListener('touchstart', function(e) {
            if (SG.state.gameOver) return;
            var touch = e.changedTouches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
            isTouching = true;
            SG.state.hasStartedTouch = true;
            if (!SG.audioCtx) SG.initAudio();
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchmove', function(e) {
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchend', function(e) {
            if (SG.state.gameOver) return;
            if (!isTouching) return;
            isTouching = false;

            var touch = e.changedTouches[0];
            var dx = touch.clientX - touchStartX;
            var dy = touch.clientY - touchStartY;
            var elapsed = Date.now() - touchStartTime;

            if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 0.7) {
                if (dx > 0) SG.moveRight();
                else SG.moveLeft();
            } else if (dy < -40 && Math.abs(dy) > Math.abs(dx) * 0.7) {
                SG.jump();
            } else if (dy > 40 && Math.abs(dy) > Math.abs(dx) * 0.7) {
                SG.roll();
            } else if (Math.abs(dx) < 30 && Math.abs(dy) < 30 && elapsed < 300) {
                var third = window.innerWidth / 3;
                if (touch.clientX < third) SG.moveLeft();
                else if (touch.clientX > third * 2) SG.moveRight();
                else SG.jump();
            }

            e.preventDefault();
        }, { passive: false });
    };
})();


// ===== ENDLESS RUNNER - Homelander Easter Egg =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var THREE = window.THREE;

    SG.homelanderGroup = null;
    SG.laserBeams = [];
    SG.laserLeftBeam = null;
    SG.laserRightBeam = null;
    SG.homelanderCape = null;
    SG.homelanderModelPath = SG.homelanderModelPath || 'models/homelander.glb';
    SG.homelanderModelTuning = SG.homelanderModelTuning || {
        targetHeight: 1.85,
        modelRotationY: 0,
        modelYOffset: -0.16,
        eyeOffsetX: 0.055,
        eyeOffsetY: 1.63,
        eyeOffsetZ: -0.50
    };

    function normalizeHomelanderModel(model) {
        var box = new THREE.Box3().setFromObject(model);
        var size = new THREE.Vector3();
        var center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        var targetHeight = SG.homelanderModelTuning.targetHeight;
        var scale = size.y > 0 ? targetHeight / size.y : 1;
        model.scale.setScalar(scale);
        model.updateMatrixWorld(true);
        box.setFromObject(model);
        box.getCenter(center);
        model.position.set(-center.x, -box.min.y + SG.homelanderModelTuning.modelYOffset, -center.z);
    }

    SG.loadHomelanderModel = function(group, proceduralParts) {
        if (!group || !THREE || !THREE.GLTFLoader) return;
        var loader = new THREE.GLTFLoader();
        loader.load(SG.homelanderModelPath, function(gltf) {
            if (!SG.homelanderGroup || group !== SG.homelanderGroup) return;
            var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
            if (!model) return;
            model.name = 'HomelanderGLB';
            normalizeHomelanderModel(model);
            model.rotation.y = SG.homelanderModelTuning.modelRotationY;
            model.traverse(function(node) {
                if (node && node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    if (node.material) {
                        var mats = Array.isArray(node.material) ? node.material : [node.material];
                        for (var mi = 0; mi < mats.length; mi++) {
                            if (mats[mi]) {
                                mats[mi].side = THREE.DoubleSide;
                                mats[mi].needsUpdate = true;
                            }
                        }
                    }
                }
            });
            group.add(model);
            SG.homelanderModel = model;
            for (var i = 0; i < proceduralParts.length; i++) {
                if (proceduralParts[i]) proceduralParts[i].visible = false;
            }
        }, undefined, function(err) {
            SG.homelanderModelError = err;
        });
    };

    SG.activateHomelander = function() {
        SG.state.legitRun = false; // Homelander: exclude from leaderboard
        if (!SG.player) return;
        SG.player.visible = false;
        SG.homelanderGroup = new THREE.Group();
        SG.homelanderGroup.position.copy(SG.player.position);
        SG.homelanderGroup.position.y = 6;
        SG.homelanderGroup.rotation.y = Math.PI;

        var suitMat = new THREE.MeshLambertMaterial({ color: 0x1A237E });
        var suitMatDark = new THREE.MeshLambertMaterial({ color: 0x15205A });
        var jointMat = new THREE.MeshLambertMaterial({ color: 0x23358A });

        var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.10, 8), suitMat);
        neck.position.set(0, 1.08, 0);
        SG.homelanderGroup.add(neck);

        var chest = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.30), suitMat);
        chest.position.set(0, 0.82, 0);
        SG.homelanderGroup.add(chest);

        var waist = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.25, 0.25), suitMatDark);
        waist.position.set(0, 0.48, 0);
        SG.homelanderGroup.add(waist);

        var shoulderMat = new THREE.MeshLambertMaterial({ color: 0x1A237E });
        var shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.10, 0.30), shoulderMat);
        shoulder.position.y = 1.00;
        SG.homelanderGroup.add(shoulder);

        var pecMat = new THREE.MeshLambertMaterial({ color: 0x1E2A6E });
        for (var side = -1; side <= 1; side += 2) {
            var pec = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.06), pecMat);
            pec.position.set(side * 0.14, 0.82, 0.17);
            SG.homelanderGroup.add(pec);
        }

        var skinMat = new THREE.MeshLambertMaterial({ color: 0xFFDDCC });
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), skinMat);
        head.position.y = 1.32;
        head.scale.set(1, 1.15, 0.85);
        SG.homelanderGroup.add(head);

        var jaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.10, 0.16), skinMat);
        jaw.position.set(0, 1.14, 0.20);
        SG.homelanderGroup.add(jaw);

        var chin = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), skinMat);
        chin.position.set(0, 1.07, 0.24);
        SG.homelanderGroup.add(chin);

        var noseMat = new THREE.MeshLambertMaterial({ color: 0xEECCB8 });
        var nose = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.06), noseMat);
        nose.position.set(0, 1.26, 0.24);
        SG.homelanderGroup.add(nose);
        var noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), noseMat);
        noseTip.position.set(0, 1.24, 0.27);
        SG.homelanderGroup.add(noseTip);

        var browMat = new THREE.MeshLambertMaterial({ color: 0xCCAA55 });
        for (var side2 = -1; side2 <= 1; side2 += 2) {
            var brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.04), browMat);
            brow.position.set(side2 * 0.08, 1.38, 0.22);
            brow.rotation.z = side2 * 0.15;
            SG.homelanderGroup.add(brow);
        }

        var hairMat = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });
        var hair = new THREE.Mesh(new THREE.SphereGeometry(0.30, 10, 8), hairMat);
        hair.position.set(0, 1.50, 0.02);
        hair.scale.set(1.05, 0.35, 0.75);
        SG.homelanderGroup.add(hair);
        for (var side3 = -1; side3 <= 1; side3 += 2) {
            var sideHair = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.12), hairMat);
            sideHair.position.set(side3 * 0.20, 1.42, 0.08);
            SG.homelanderGroup.add(sideHair);
        }
        var swoop = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.20), hairMat);
        swoop.position.set(0, 1.52, -0.08);
        swoop.rotation.x = -0.3;
        SG.homelanderGroup.add(swoop);
        var topHair = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.16), hairMat);
        topHair.position.set(0, 1.53, 0.04);
        SG.homelanderGroup.add(topHair);

        var scleraMat = new THREE.MeshLambertMaterial({ color: 0xFFEEEE });
        var pupilMat = new THREE.MeshBasicMaterial({ color: 0xFF2200 });
        for (var side4 = -1; side4 <= 1; side4 += 2) {
            var sclera = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), scleraMat);
            sclera.position.set(side4 * 0.08, 1.34, 0.22);
            SG.homelanderGroup.add(sclera);
            var pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), pupilMat);
            pupil.position.set(side4 * 0.08, 1.34, 0.24);
            SG.homelanderGroup.add(pupil);
        }

        // Cape
        var capeGroup = new THREE.Group();
        capeGroup.position.set(0, 0.60, -0.28);
        capeGroup.rotation.x = 0.25;
        SG.homelanderGroup.add(capeGroup);
        SG.homelanderCape = capeGroup;

        var CW = 0.9, CH = 0.85;
        var stripeH = CH / 13;
        var ds = THREE.DoubleSide;

        var baseMat = new THREE.MeshBasicMaterial({ color: 0xB22234, side: ds });
        var baseCape = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), baseMat);
        capeGroup.add(baseCape);

        var whiteMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: ds });
        for (var i = 1; i < 13; i += 2) {
            var yPos = CH/2 - (i + 0.5) * stripeH;
            var s = new THREE.Mesh(new THREE.BoxGeometry(CW - 0.02, stripeH * 0.9, 0.015), whiteMat);
            s.position.set(0, yPos, -0.015);
            capeGroup.add(s);
        }

        var cantonW = CW * 0.40;
        var cantonH = stripeH * 7;
        var cantonMat = new THREE.MeshBasicMaterial({ color: 0x3C3B6E, side: ds });
        var canton = new THREE.Mesh(new THREE.BoxGeometry(cantonW, cantonH, 0.015), cantonMat);
        canton.position.set(-CW/2 + cantonW/2, CH/2 - cantonH/2, -0.015);
        capeGroup.add(canton);

        var starMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: ds });
        var starCols = [6, 5, 6, 5, 6, 5, 6, 5, 6];
        var cellW = cantonW / 7;
        var cellH = cantonH / 10;
        var starS = Math.min(cellW, cellH) * 0.12;
        var starGeo = new THREE.BoxGeometry(starS, starS, 0.02);
        for (var row = 0; row < 9; row++) {
            for (var col = 0; col < starCols[row]; col++) {
                var sx = -CW/2 + (col + 1) * cellW - cellW/2;
                var sy = CH/2 - (row + 1) * cellH + cellH/2;
                var star = new THREE.Mesh(starGeo, starMat);
                star.position.set(sx, sy, -0.02);
                capeGroup.add(star);
            }
        }

        var backMat = new THREE.MeshBasicMaterial({ color: 0x550000, side: THREE.DoubleSide });
        var backCape = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.96), backMat);
        backCape.position.set(0, 0.60, -0.35);
        backCape.rotation.x = 0.25;
        SG.homelanderGroup.add(backCape);

        var claspMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
        var clasp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 6), claspMat);
        clasp.position.set(0, 0.97, -0.13);
        clasp.rotation.x = 0.5;
        SG.homelanderGroup.add(clasp);

        for (var side5 = -1; side5 <= 1; side5 += 2) {
            var btn = new THREE.Mesh(new THREE.CircleGeometry(0.04, 6), new THREE.MeshBasicMaterial({ color: 0xFFD700 }));
            btn.position.set(side5 * 0.12, 0.95, -0.14);
            SG.homelanderGroup.add(btn);
        }

        var emblemMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        var emblem = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.02), emblemMat);
        emblem.position.set(0, 0.75, 0.18);
        SG.homelanderGroup.add(emblem);
        var emblemGlow = new THREE.Mesh(
            new THREE.CircleGeometry(0.16, 18),
            new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending })
        );
        emblemGlow.position.set(0, 0.75, 0.191);
        SG.homelanderGroup.add(emblemGlow);
        for (var side6 = -1; side6 <= 1; side6 += 2) {
            var wing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), emblemMat);
            wing.position.set(side6 * 0.15, 0.78, 0.18);
            wing.rotation.z = side6 * 0.4;
            SG.homelanderGroup.add(wing);
        }

        var armMat = new THREE.MeshLambertMaterial({ color: 0x1A237E });
        var gloveMat = new THREE.MeshLambertMaterial({ color: 0xCC0000 });
        for (var side7 = -1; side7 <= 1; side7 += 2) {
            var shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), jointMat);
            shoulderJoint.position.set(side7 * 0.34, 0.92, 0);
            shoulderJoint.scale.set(1.05, 0.9, 1);
            SG.homelanderGroup.add(shoulderJoint);
            var upper = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.10), armMat);
            upper.position.set(side7 * 0.34, 0.75, 0);
            SG.homelanderGroup.add(upper);
            var elbow = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), jointMat);
            elbow.position.set(side7 * 0.34, 0.61, 0);
            SG.homelanderGroup.add(elbow);
            var fore = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.08), armMat);
            fore.position.set(side7 * 0.34, 0.48, 0);
            SG.homelanderGroup.add(fore);
            var glove = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.10), gloveMat);
            glove.position.set(side7 * 0.34, 0.33, 0);
            SG.homelanderGroup.add(glove);
        }

        var legMat = new THREE.MeshLambertMaterial({ color: 0x1A237E });
        var bootMat = new THREE.MeshLambertMaterial({ color: 0xCC0000 });
        var soleMat = new THREE.MeshLambertMaterial({ color: 0x661111 });
        for (var side8 = -1; side8 <= 1; side8 += 2) {
            var hip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), suitMatDark);
            hip.position.set(side8 * 0.14, 0.43, 0);
            SG.homelanderGroup.add(hip);
            var thigh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.20, 0.14), legMat);
            thigh.position.set(side8 * 0.14, 0.32, 0);
            SG.homelanderGroup.add(thigh);
            var knee = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), jointMat);
            knee.position.set(side8 * 0.14, 0.23, 0);
            SG.homelanderGroup.add(knee);
            var calf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), legMat);
            calf.position.set(side8 * 0.14, 0.14, 0);
            SG.homelanderGroup.add(calf);
            var boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.10, 0.22), bootMat);
            boot.position.set(side8 * 0.14, 0.05, 0.03);
            SG.homelanderGroup.add(boot);
            var sole = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.25), soleMat);
            sole.position.set(side8 * 0.14, -0.02, 0.045);
            SG.homelanderGroup.add(sole);
        }

        var belt = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 0.18), new THREE.MeshLambertMaterial({ color: 0x222222 }));
        belt.position.set(0, 0.36, 0.12);
        SG.homelanderGroup.add(belt);
        var buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0xFFD700 }));
        buckle.position.set(0, 0.36, 0.22);
        SG.homelanderGroup.add(buckle);

        SG.homelanderAura = new THREE.Mesh(
            new THREE.RingGeometry(0.42, 0.7, 32),
            new THREE.MeshBasicMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.12, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
        );
        SG.homelanderAura.position.set(0, 0.75, -0.42);
        SG.homelanderAura.rotation.x = Math.PI / 2;
        SG.homelanderGroup.add(SG.homelanderAura);

        SG.homelanderProceduralParts = SG.homelanderGroup.children.filter(function(child) {
            return child !== SG.homelanderAura;
        });
        SG.loadHomelanderModel(SG.homelanderGroup, SG.homelanderProceduralParts);

        SG.scene.add(SG.homelanderGroup);
        if (window.__neoGame) window.__neoGame.homelanderGroup = SG.homelanderGroup;

        SG.state.isJumping = false;
        SG.state.isRolling = false;
        if (SG.clearActiveGun) SG.clearActiveGun();
        if (SG.startHomelanderTheme) SG.startHomelanderTheme();
    };

    SG.deactivateHomelander = function() {
        SG.state.homelander = false;
        if (SG.homelanderGroup) {
            if (SG.homelanderCape && SG.homelanderCape.material) {
                if (SG.homelanderCape.material.map) SG.homelanderCape.material.map.dispose();
                SG.homelanderCape.material.dispose();
            }
            SG.scene.remove(SG.homelanderGroup);
            SG.disposeObject(SG.homelanderGroup);
            SG.homelanderGroup = null;
        }
        if (SG.laserLeftBeam) {
            if (SG.laserLeftBeam.userData.glow) {
                SG.scene.remove(SG.laserLeftBeam.userData.glow);
                SG.laserLeftBeam.userData.glow.geometry.dispose();
                SG.laserLeftBeam.userData.glow.material.dispose();
            }
            SG.scene.remove(SG.laserLeftBeam);
            SG.laserLeftBeam.geometry.dispose();
            SG.laserLeftBeam.material.dispose();
        }
        if (SG.laserRightBeam) {
            if (SG.laserRightBeam.userData.glow) {
                SG.scene.remove(SG.laserRightBeam.userData.glow);
                SG.laserRightBeam.userData.glow.geometry.dispose();
                SG.laserRightBeam.userData.glow.material.dispose();
            }
            SG.scene.remove(SG.laserRightBeam);
            SG.laserRightBeam.geometry.dispose();
            SG.laserRightBeam.material.dispose();
        }
        SG.laserLeftBeam = null;
        SG.laserRightBeam = null;
        SG.laserBeams = [];
        SG.homelanderCape = null;
        SG.homelanderAura = null;
        SG.homelanderModel = null;
        SG.homelanderProceduralParts = [];
        if (SG.player) SG.player.visible = true;
        if (SG.stopHomelanderAudio) SG.stopHomelanderAudio();
        if (SG.state.started && !SG.state.gameOver && !SG.state.muted && SG.startBgMusic) SG.startBgMusic();
    };

    SG.updateHomelander = function(delta) {
        if (!SG.state.homelander || !SG.homelanderGroup) return;

        var speed = 0.15;
        var k = SG.keys;
        if (k['ArrowUp'] || k['w'] || k['W']) SG.homelanderGroup.position.y += speed * delta * 60;
        if (k['ArrowDown'] || k['s'] || k['S']) SG.homelanderGroup.position.y -= speed * delta * 60;
        if (k['ArrowLeft'] || k['a'] || k['A']) SG.homelanderGroup.position.x -= speed * delta * 60;
        if (k['ArrowRight'] || k['d'] || k['D']) SG.homelanderGroup.position.x += speed * delta * 60;

        if (!k['ArrowUp'] && !k['w'] && !k['W'] && !k['ArrowDown'] && !k['s'] && !k['S']) {
            SG.homelanderGroup.position.y += Math.sin(SG.state.gameTime * 1.5) * 0.008;
        }

        if (SG.homelanderGroup.position.y < 1) SG.homelanderGroup.position.y = 1;
        if (SG.homelanderGroup.position.y > 20) SG.homelanderGroup.position.y = 20;

        if (SG.homelanderCape) {
            var flutter = Math.sin(SG.state.gameTime * 3);
            var tilt = 0.25 + flutter * 0.20;
            SG.homelanderCape.rotation.x = tilt;
            SG.homelanderCape.rotation.z = Math.sin(SG.state.gameTime * 2.5) * 0.06;
            for (var i = SG.homelanderGroup.children.length - 1; i >= 0; i--) {
                var child = SG.homelanderGroup.children[i];
                if (child === SG.homelanderCape) continue;
                if (Math.abs(child.position.z - (-0.35)) < 0.01) {
                    child.rotation.x = tilt;
                    child.rotation.z = SG.homelanderCape.rotation.z;
                    break;
                }
            }
        }
        if (SG.homelanderAura) {
            var auraPulse = 1 + Math.sin(SG.state.gameTime * 4) * 0.08;
            SG.homelanderAura.scale.set(auraPulse, auraPulse, auraPulse);
            SG.homelanderAura.material.opacity = 0.10 + Math.sin(SG.state.gameTime * 5) * 0.04;
        }

        var laserBaseLength = 18;
        var laserLength = SG.state.firstPerson ? 18 : 12;
        SG.laserBeams.length = 0;
        var eyeY = SG.homelanderGroup.position.y + SG.homelanderModelTuning.eyeOffsetY;

        for (var side9 = -1; side9 <= 1; side9 += 2) {
            var bx = SG.homelanderGroup.position.x + side9 * SG.homelanderModelTuning.eyeOffsetX;
            var by = eyeY;
            var bz = SG.homelanderGroup.position.z + SG.homelanderModelTuning.eyeOffsetZ;

            var dirZ = -1.0;
            var dirY = -0.28;
            if (SG.state.firstPerson && SG.camera) {
                bx = SG.camera.position.x + side9 * 0.035;
                by = SG.camera.position.y - 0.08;
                bz = SG.camera.position.z - 1.2;
                dirY = -0.08;
            }
            var len = Math.sqrt(dirZ * dirZ + dirY * dirY);
            var nz = dirZ / len;
            var ny = dirY / len;

            var beam = side9 === -1 ? SG.laserLeftBeam : SG.laserRightBeam;
            if (!beam) {
                var laserGeo = new THREE.CylinderGeometry(0.008, 0.012, laserBaseLength, 8);
                var laserMat = new THREE.MeshBasicMaterial({
                    color: 0xFFF1A0, transparent: true, opacity: 1.0,
                    blending: THREE.AdditiveBlending
                });
                beam = new THREE.Mesh(laserGeo, laserMat);
                var glowGeo = new THREE.CylinderGeometry(0.026, 0.040, laserBaseLength, 8);
                var glowMat = new THREE.MeshBasicMaterial({
                    color: 0xFF0000, transparent: true, opacity: 0.22,
                    blending: THREE.AdditiveBlending
                });
                var glow = new THREE.Mesh(glowGeo, glowMat);
                beam.userData.glow = glow;
                SG.scene.add(glow);
                SG.scene.add(beam);
                if (side9 === -1) SG.laserLeftBeam = beam;
                else SG.laserRightBeam = beam;
            }

            beam.scale.x = 1;
            beam.scale.y = laserLength / laserBaseLength;
            beam.scale.z = 1;
            beam.visible = true;
            if (beam.userData.glow) beam.userData.glow.visible = true;

            var endX = bx;
            var endY = by + ny * laserLength;
            var endZ = bz + nz * laserLength;
            var midX = (bx + endX) / 2;
            var midY = (by + endY) / 2;
            var midZ = (bz + endZ) / 2;
            beam.position.set(midX, midY, midZ);

            var angle = Math.atan2(dirZ, dirY);
            beam.rotation.x = angle;

            if (beam.userData.glow) {
                beam.userData.glow.position.copy(beam.position);
                beam.userData.glow.rotation.copy(beam.rotation);
                beam.userData.glow.scale.y = beam.scale.y;
            }

            var pulse = 0.86 + Math.sin(SG.state.gameTime * 12 + side9) * 0.14;
            beam.material.opacity = SG.state.firstPerson ? pulse * 0.58 : pulse;
            if (beam.userData.glow) beam.userData.glow.material.opacity = SG.state.firstPerson ? pulse * 0.05 : pulse * 0.20;

            for (var oi = SG.state.obstacles.length - 1; oi >= 0; oi--) {
                var obs = SG.state.obstacles[oi];
                var obsZ = obs.position.z;
                if (obsZ > bz || obsZ < bz - laserLength) continue;
                var dx2 = Math.abs(obs.position.x - bx);
                if (dx2 > 0.7) continue;
                var fraction = (bz - obsZ) / laserLength;
                var beamY = by - fraction * Math.abs(ny) * laserLength / Math.abs(nz);
                var obsHeight = obs.userData.height || 0.6;
                var obsTop = obs.position.y + obsHeight;
                if (beamY < obsTop + 0.5 && beamY > obs.position.y - 0.3) {
                    SG.disposeObject(obs);
                    SG.scene.remove(obs);
                    SG.state.obstacles.splice(oi, 1);
                    SG.spawnDestroyParticles(obs.position);
                }
            }
        }

        SG.state.gameOver = false;
    };
})();


// ===== ENDLESS RUNNER - Police Chase System =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var THREE = window.THREE;

    var policeGroup = null;
    var lightLeft, lightRight;
    var lastSirenToggle = 0;

    SG.createPoliceCar = function() {
        if (policeGroup) {
            SG.scene.remove(policeGroup);
            SG.disposeObject(policeGroup);
        }
        policeGroup = new THREE.Group();

        // Main body (black/white)
        var bodyMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        var body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 3.0), bodyMat);
        body.position.set(0, 0.25, 0);
        policeGroup.add(body);

        // White doors
        var doorMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        for (var side = -1; side <= 1; side += 2) {
            var door = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.8), doorMat);
            door.position.set(side * 0.81, 0.3, 0);
            policeGroup.add(door);
        }

        // Roof / cabin
        var cabinMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.4), cabinMat);
        cabin.position.set(0, 0.65, -0.2);
        policeGroup.add(cabin);

        // Windshield
        var glassMat = new THREE.MeshBasicMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.5 });
        var windshield = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.02), glassMat);
        windshield.position.set(0, 0.65, -0.9);
        policeGroup.add(windshield);

        // Rear window
        var rearWindow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.02), glassMat);
        rearWindow.position.set(0, 0.65, 0.9);
        policeGroup.add(rearWindow);

        // Light bar on roof
        var barMat = new THREE.MeshLambertMaterial({ color: 0xCCCCCC });
        var lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.25), barMat);
        lightBar.position.set(0, 0.85, -0.2);
        policeGroup.add(lightBar);

        // Red light
        var redMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        lightLeft = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), redMat);
        lightLeft.position.set(-0.3, 0.93, -0.2);
        policeGroup.add(lightLeft);

        // Blue light
        var blueMat = new THREE.MeshBasicMaterial({ color: 0x0044FF });
        lightRight = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), blueMat);
        lightRight.position.set(0.3, 0.93, -0.2);
        policeGroup.add(lightRight);

        // Headlights
        var headMat = new THREE.MeshBasicMaterial({ color: 0xFFFFAA });
        for (var side2 = -1; side2 <= 1; side2 += 2) {
            var head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.05), headMat);
            head.position.set(side2 * 0.4, 0.2, 1.55);
            policeGroup.add(head);
        }

        // Tail lights
        var tailMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        for (var side3 = -1; side3 <= 1; side3 += 2) {
            var tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.04), tailMat);
            tail.position.set(side3 * 0.4, 0.2, -1.55);
            policeGroup.add(tail);
        }

        // Wheels (simple discs)
        var wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        for (var side4 = -1; side4 <= 1; side4 += 2) {
            for (var wf = -1; wf <= 1; wf += 2) {
                var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8), wheelMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(side4 * 0.85, 0.08, wf * 0.9);
                policeGroup.add(wheel);
            }
        }

        // Siren text decal (POLICE)
        var decalMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        var decal = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.02), decalMat);
        decal.position.set(0, 0.35, 0.75);
        policeGroup.add(decal);
        // Small badge decal
        var badgeMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        var badge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), badgeMat);
        badge.position.set(-0.3, 0.35, 0.75);
        policeGroup.add(badge);

        // Position behind player
        policeGroup.position.set(SG.player ? SG.player.position.x : 0, 0, 8);
        SG.scene.add(policeGroup);
        return policeGroup;
    };

    SG.updatePolice = function(delta) {
        if (!SG.state.policeChasing || !policeGroup || SG.state.gameOver) return;

        var playerPos = SG.player ? SG.player.position : { x: 0, z: 0 };

        // Police catches up at a SLOW constant rate (not speed-proportional)
        // 0.0015 per frame ~= 0.09 units/sec at 60fps = ~90 seconds to close 8m gap
        var catchRate = 0.0015;
        // Speed up slightly at higher player speeds for challenge
        catchRate += Math.max(0, (SG.state.speed - 0.5)) * 0.0005;
        
        SG.state.policeDistance -= catchRate * delta * 60;

        // Clamp police distance
        if (SG.state.policeDistance < 0) SG.state.policeDistance = 0;
        if (SG.state.policeDistance > 12) SG.state.policeDistance = 12;

        // Position police car behind the player
        policeGroup.position.x += (playerPos.x - policeGroup.position.x) * 0.05;
        policeGroup.position.z = SG.state.policeDistance;

        // Orient police car to face forward (-Z)
        policeGroup.rotation.y = Math.PI;

        // Flashing lights
        var time = Date.now() / 1000;
        var flashOn = Math.sin(time * 8) > 0;
        if (lightLeft && lightRight) {
            lightLeft.material.color.setHex(flashOn ? 0xFF0000 : 0x880000);
            lightRight.material.color.setHex(flashOn ? 0x0000FF : 0x000088);
            var flashScale = flashOn ? 1.3 : 0.7;
            lightLeft.scale.setScalar(flashScale);
            lightRight.scale.setScalar(flashScale);
        }

        // Siren starts when police gets closer
        if (SG.state.policeDistance < 6 && !SG.state.policeSiren) {
            SG.startSiren();
        } else if (SG.state.policeDistance >= 8 && SG.state.policeSiren) {
            SG.stopSiren();
        }

        // Update HUD
        var policeEl = document.getElementById('police-indicator');
        if (policeEl) {
            policeEl.style.display = 'block';
            var dist = Math.round(SG.state.policeDistance * 10) / 10;
            policeEl.textContent = '\uD83D\uDE94 DISTANCE: ' + dist + 'm';
            if (dist < 2) {
                policeEl.style.color = '#ff0000';
                policeEl.style.borderColor = 'rgba(255,0,0,0.6)';
            } else if (dist < 4) {
                policeEl.style.color = '#ff6600';
                policeEl.style.borderColor = 'rgba(255,100,0,0.4)';
            } else {
                policeEl.style.color = '#ffaa00';
                policeEl.style.borderColor = 'rgba(255,200,0,0.3)';
            }
        }

        // Check if caught
        if (SG.state.policeDistance < 0.5) {
            SG.state.policeCaught = true;
            SG.stopSiren();
            SG.gameOver();
        }
    };

    SG.startPoliceChase = function() {
        SG.state.policeChasing = true;
        SG.state.policeDistance = 8.0;
        SG.createPoliceCar();
        // Show police indicator
        var policeEl = document.getElementById('police-indicator');
        if (policeEl) policeEl.style.display = 'block';
    };

    SG.stopPoliceChase = function() {
        SG.state.policeChasing = false;
        SG.state.policeDistance = 8.0;
        SG.stopSiren();
        if (policeGroup) {
            SG.scene.remove(policeGroup);
            SG.disposeObject(policeGroup);
            policeGroup = null;
        }
        var policeEl = document.getElementById('police-indicator');
        if (policeEl) policeEl.style.display = 'none';
    };

    SG.coinPushBackPolice = function() {
        if (!SG.state.policeChasing) return;
        SG.state.policeDistance = Math.min(12, SG.state.policeDistance + 1.0);
    };
})();


// ===== ENDLESS RUNNER - Main Game Loop & Init =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var THREE = window.THREE;

    // ===== EASE =====
    SG.easeOutQuad = function(t) {
        return t * (2 - t);
    };

    // ===== CAMERA =====
    SG.thirdPersonCameraViews = SG.thirdPersonCameraViews || {
        far: { label: 'Farthest', y: 5.0, z: 7.0, lookY: -1.0, lookZ: -10.0 },
        medium: { label: 'Medium', y: 4.1, z: 5.4, lookY: -0.65, lookZ: -8.0 },
        near: { label: 'Closest', y: 3.0, z: 3.7, lookY: -0.25, lookZ: -6.2 }
    };

    SG.getThirdPersonCameraView = function() {
        var key = SG.state.thirdPersonView || 'near';
        return SG.thirdPersonCameraViews[key] || SG.thirdPersonCameraViews.near;
    };

    SG.updateCamera = function() {
        if (!SG.camera) return;

        var camTarget = (SG.state.homelander && SG.homelanderGroup) ? SG.homelanderGroup.position : (SG.player ? SG.player.position : null);
        if (!camTarget) return;

        if (isNaN(camTarget.x)) camTarget.x = 0;
        if (isNaN(camTarget.y)) camTarget.y = 1;
        if (isNaN(camTarget.z)) camTarget.z = 0;

        if (SG.state.firstPerson) {
            var rollDrop = SG.state.isRolling ? -0.9 : 0;
            var eyeY = camTarget.y + 1.3 + rollDrop;
            var eyeZ = camTarget.z + 0.5;
            SG.camera.position.set(camTarget.x, eyeY, eyeZ);
            var pitchDeg = Math.max(-5, Math.min(5, typeof SG.state.firstPersonPitchDeg === 'number' ? SG.state.firstPersonPitchDeg : 1));
            var pitchUp = Math.tan(pitchDeg * Math.PI / 180) * 30;
            SG.camera.lookAt(camTarget.x, camTarget.y + 0.3 + pitchUp, camTarget.z - 30);
            if (SG.player) SG.player.visible = false;
            if (SG.homelanderGroup) SG.homelanderGroup.visible = false;
        } else {
            if (SG.homelanderGroup) SG.homelanderGroup.visible = true;
            var view = SG.getThirdPersonCameraView();
            var targetX = camTarget.x;
            var targetY = camTarget.y + view.y;
            var targetZ = camTarget.z + view.z;
            var shakeX = 0, shakeY = 0;
            if (SG.state.cameraShake > 0.01) {
                shakeX = (Math.random() - 0.5) * SG.state.cameraShake * 0.3;
                shakeY = (Math.random() - 0.5) * SG.state.cameraShake * 0.3;
            }
            SG.camera.position.x += (targetX + shakeX - SG.camera.position.x) * 0.1;
            SG.camera.position.y += (targetY + shakeY - SG.camera.position.y) * 0.1;
            SG.camera.position.z += (targetZ - SG.camera.position.z) * 0.1;
            SG.camera.lookAt(camTarget.x, camTarget.y + view.lookY, camTarget.z + view.lookZ);
            if (SG.player && !SG.state.homelander) SG.player.visible = true;
        }
    };

    // ===== RESET ALL GAME OBJECTS =====
    SG.resetAllGameObjects = function() {
        var i;
        for (i = 0; i < SG.state.trackSegments.length; i++) { SG.scene.remove(SG.state.trackSegments[i]); SG.disposeObject(SG.state.trackSegments[i]); }
        for (i = 0; i < SG.state.obstacles.length; i++) { SG.scene.remove(SG.state.obstacles[i]); SG.disposeObject(SG.state.obstacles[i]); }
        for (i = 0; i < SG.state.coinObjects.length; i++) { SG.scene.remove(SG.state.coinObjects[i]); SG.disposeObject(SG.state.coinObjects[i]); }
        for (i = 0; i < SG.state.gunPickups.length; i++) { SG.scene.remove(SG.state.gunPickups[i]); SG.disposeObject(SG.state.gunPickups[i]); }
        for (i = 0; i < SG.state.buildings.length; i++) { SG.scene.remove(SG.state.buildings[i]); SG.disposeObject(SG.state.buildings[i]); }
        for (i = 0; i < SG.state.particles.length; i++) { SG.scene.remove(SG.state.particles[i]); SG.disposeObject(SG.state.particles[i]); }
        if (SG.state.pvpGhosts) {
            for (i = 0; i < SG.state.pvpGhosts.length; i++) {
                if (SG.state.pvpGhosts[i].group) {
                    SG.scene.remove(SG.state.pvpGhosts[i].group);
                    SG.disposeObject(SG.state.pvpGhosts[i].group);
                }
            }
        }
        SG.state.trackSegments = [];
        SG.state.obstacles = [];
        SG.state.coinObjects = [];
        SG.state.gunPickups = [];
        SG.state.coinObstacleMap = new Map();
        SG.state.buildings = [];
        SG.state.particles = [];
        SG.state.pvpGhosts = [];
        if (SG.clearActiveGun) SG.clearActiveGun();
    };

    SG.applyPvpScene = function(active) {
        if (!SG.scene) return;
        if (active) {
            SG.state.cyberMode = true;
            if (SG.applyCyberColors) SG.applyCyberColors(true);
            if (SG.scene.background) SG.scene.background.setHex(0x02030a);
            if (SG.scene.fog) {
                SG.scene.fog.color.setHex(0x05000a);
                SG.scene.fog.near = 24;
                SG.scene.fog.far = 82;
            }
            if (SG.updateSkyDome) SG.updateSkyDome(0, 'cyber');
            if (SG.updateLightRigForTheme) SG.updateLightRigForTheme(3);
            return;
        }
        SG.resetCyberMode();
    };

    SG.resetCyberMode = function() {
        if (SG.applyCyberColors) SG.applyCyberColors(false);
        SG.state.cyberMode = false;
        if (SG.scene) {
            if (SG.scene.background) SG.scene.background.setHex(0x87CEEB);
            if (SG.updateSkyDome) SG.updateSkyDome(0, 'normal');
            if (SG.scene.fog) {
                SG.scene.fog.color.setHex(0x87CEEB);
                SG.scene.fog.near = 60;
                SG.scene.fog.far = 120;
            }
        }
    };

    // ===== QUIT TO MENU =====
    SG.quitToMenu = function() {
        if (SG.cancelStartCountdown) SG.cancelStartCountdown();
        SG.stopPoliceChase();
        SG.state.pvpMode = false;
        SG.state.pvpRoom = null;
        SG.state.pvpResult = null;
        if (SG.pvpHudEl) SG.pvpHudEl.style.display = 'none';
        SG.resetCyberMode();
        SG.resetAllGameObjects();
        SG.state.score = 0;
        SG.state.coins = 0;
        SG.state.speed = SG.START_SPEED;
        SG.state.gameOver = false;
        SG.state.started = false;
        SG.state.countdownActive = false;
        SG.state.paused = false;
        SG.state.currentLane = 1;
        SG.state.targetLane = 1;
        SG.state.laneLerp = 1;
        SG.state.isJumping = false;
        SG.state.isRolling = false;
        SG.state.jumpVelocity = 0;
        SG.state.playerHeight = SG.PLAYER_Y;
        SG.state.targetPlayerHeight = SG.PLAYER_Y;
        SG.state.instantSpeedMps = 0;
        SG.state._speedSample = null;
        SG.state.lastObstacleZ = 0;
        SG.state.gameTime = 0;
        SG.state.scoreTimer = 0;
        SG.state.instructionTimer = 8;
        SG.state.cameraShake = 0;
        SG.state.hasStartedTouch = false;
        SG.state.onRoof = false;
        SG.state.hasDoubleJumped = false;
        SG.state.jumpingFromRoof = false;
        SG.state.jetpackFuel = 0;
        SG.state.jetpackCooldown = 0;
        SG.state.gunSpawnTimer = 6;
        SG.state.policeChasing = false;
        SG.state.policeDistance = 12.0;
        SG.state.policeCaught = false;

        if (SG.player) {
            SG.player.position.set(0, 0, 0);
            SG.player.rotation.set(0, Math.PI, 0);
            SG.player.scale.set(1, 1, 1);
        }
        if (SG.camera) {
            SG.camera.position.set(0, 6, 8);
            SG.camera.lookAt(0, 0, -10);
        }

        if (SG.state.homelander) {
            SG.deactivateHomelander();
            SG.state.homelander = false;
        }

        if (SG.state.theme !== 0) {
            SG.switchTheme(0);
        }

        if (SG.gameOverEl) SG.gameOverEl.classList.remove('visible');
        if (SG.pauseOverlay) SG.pauseOverlay.style.display = 'none';
        SG.stopBgMusic();
        if (SG.pauseBtnEl) SG.pauseBtnEl.style.display = 'none';
        if (SG.menuOverlay) SG.menuOverlay.style.display = 'flex';
        SG.updateMenuCredits();
        ['mute-btn'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        SG.spawnInitialTrack();
        SG.spawnBuildings();
        SG.spawnObstacles();
    };

    // ===== RESTART GAME =====
    SG.restartGame = function() {
        if (SG.cancelStartCountdown) SG.cancelStartCountdown();
        if (SG.state.pvpMode && SG.exitPvpToLobby) {
            SG.exitPvpToLobby();
            return;
        }
        SG.stopPoliceChase();
        SG.resetCyberMode();
        SG.resetAllGameObjects();

        SG.state.score = 0;
        SG.state.coins = 0;
        SG.state.speed = SG.START_SPEED;
        SG.state.gameOver = false;
        SG.state.started = false;
        SG.state.countdownActive = false;
        SG.state.paused = false;
        SG.state.onRoof = false;
        SG.state.currentLane = 1;
        SG.state.targetLane = 1;
        SG.state.laneLerp = 1;
        SG.state.isJumping = false;
        SG.state.isRolling = false;
        SG.state.jumpVelocity = 0;
        SG.state.playerHeight = SG.PLAYER_Y;
        SG.state.targetPlayerHeight = SG.PLAYER_Y;
        SG.state.instantSpeedMps = 0;
        SG.state._speedSample = null;
        SG.state.lastObstacleZ = 0;
        SG.state.gameTime = 0;
        SG.state.scoreTimer = 0;
        SG.state.cameraShake = 0;
        SG.state.hasStartedTouch = false;
        SG.state.hasDoubleJumped = false;
        SG.state.jumpingFromRoof = false;
        SG.state.jetpackFuel = 0;
        SG.state.jetpackCooldown = 0;
        SG.state.gunSpawnTimer = 6;
        SG.state.policeChasing = false;
        SG.state.policeDistance = 12.0;
        SG.state.policeCaught = false;

        if (SG.player) {
            SG.player.position.set(0, SG.PLAYER_Y, 0);
            SG.player.rotation.set(0, Math.PI, 0);
            SG.player.scale.set(1, 1, 1);
        }
        if (SG.camera) {
            SG.camera.position.set(0, 5.5, 7);
            SG.camera.lookAt(0, 0, -10);
        }

        if (SG.pauseBtnEl) {
            SG.pauseBtnEl.style.display = 'none';
            SG.pauseBtnEl.textContent = '\u23F8';
        }
        if (SG.gameOverEl) SG.gameOverEl.classList.remove('visible');
        if (SG.pauseOverlay) SG.pauseOverlay.style.display = 'none';
        if (SG.clock) SG.clock.getDelta();

        if (SG.state.homelander) {
            SG.deactivateHomelander();
            SG.state.homelander = false;
        }

        if (SG.state.theme !== 0) {
            SG.switchTheme(0);
        }

        SG.spawnInitialTrack();
        SG.spawnBuildings();
        SG.spawnObstacles();
        if (SG.beginRunWithCountdown) SG.beginRunWithCountdown();
        else SG.state.started = true;
    };

    // ===== GAME OVER =====
    SG.gameOver = function() {
        SG.state.gameOver = true;
        SG.state.cameraShake = 0.5;
        SG.createCrashParticles(SG.player.position.clone());
        SG.playCrashSound();
        SG.stopSiren();
        SG.stopPoliceChase();

        var score = Math.floor(SG.state.score);
        if (score > SG.state.bestScore) {
            SG.state.bestScore = score;
            try { localStorage.setItem('subwayBest', String(score)); } catch(e) {}
        }
        // Per-difficulty max distance (NOT in homelander mode)
        if (!SG.state.homelander) {
            var diff = SG.state.difficulty;
            var diffKey = ['maxEasy','maxMedium','maxHard'][diff] || 'maxHard';
            var abilityKey = diffKey + 'Ability';
            if (score > (SG.state[diffKey] || 0)) {
                SG.state[diffKey] = score;
                SG.state[abilityKey] = SG.state.equippedAbility || 0;
            }
        }
        SG.finalScoreEl.textContent = score;
        SG.finalCoinsEl.textContent = SG.state.coins;
        var title = SG.gameOverEl ? SG.gameOverEl.querySelector('h1') : null;
        if (title) title.textContent = 'GAME OVER';

        if (SG.state.pvpMode) {
            SG.state.pvpResult = SG.buildPvpResult ? SG.buildPvpResult(score) : null;
            if (title) title.textContent = 'PVP FINISHED';
            var oldRanks = document.getElementById('pvp-results');
            if (oldRanks) oldRanks.remove();
            if (SG.state.pvpResult && SG.gameOverEl) {
                var ranks = document.createElement('div');
                ranks.id = 'pvp-results';
                ranks.style.cssText = 'margin:12px auto 16px;max-width:320px;text-align:left;font:700 13px/1.5 Arial,sans-serif;color:#f7eaff;background:rgba(14,4,24,.55);border:1px solid rgba(255,44,207,.3);border-radius:8px;padding:10px 12px;';
                ranks.innerHTML = SG.state.pvpResult.map(function(row, idx) {
                    return '<div>' + (idx + 1) + '. ' + row.name + ' - ' + Math.floor(row.distance) + 'm</div>';
                }).join('');
                SG.gameOverEl.insertBefore(ranks, SG.restartBtnEl || null);
            }
        }

        var multipliers = [1, 5, 10];
        var multiplier = multipliers[SG.state.difficulty] || 1;
        var earned = SG.state.coins * multiplier;

        // Homelander: don't save coins/credits or shop data
        if (!SG.state.homelander && !SG.state.pvpMode) {
            SG.state.credits += earned;
            SG.state.totalCoins += SG.state.coins;
            try {
                localStorage.setItem('subwayCredits', String(SG.state.credits));
                localStorage.setItem('subwayTotalCoins', String(SG.state.totalCoins));
            } catch(e) {}
            SG.saveShopData();
        } else {
            earned = 0; // Homelander/PVP: show 0 credits earned
        }

        var oldCredits = document.getElementById('credits-earned');
        if (oldCredits) oldCredits.remove();
        var creditsInfo = document.createElement('div');
        creditsInfo.id = 'credits-earned';
        creditsInfo.className = 'final-coins';
        creditsInfo.style.color = '#FFD700';
        creditsInfo.style.fontSize = '14px';
        creditsInfo.textContent = '+ ' + earned + ' credits (' + multiplier + 'x)';
        var refEl = SG.gameOverEl.querySelector('.final-coins');
        if (refEl) refEl.after(creditsInfo);

        SG.gameOverEl.classList.add('visible');
        var bestEl = document.getElementById('best-score');
        if (bestEl) bestEl.textContent = 'BEST: ' + SG.state.bestScore + 'm';
        if (SG.pauseBtnEl) SG.pauseBtnEl.style.display = 'none';
        var muteGO = document.getElementById('mute-btn');
        if (muteGO) muteGO.style.display = 'none';
    };

    // ===== UPDATE LOOP =====
    SG.update = function() {
        if (SG.state.gameOver) {
            if (SG.state.cameraShake > 0) {
                SG.state.cameraShake *= 0.95;
                if (SG.state.cameraShake < 0.01) SG.state.cameraShake = 0;
            }
            SG.updateCamera();
            return;
        }
        if (!SG.state.started || SG.state.paused) {
            return;
        }

        var delta = Math.min(SG.clock.getDelta(), 0.05);
        SG.state.gameTime += delta;
        if (SG.updatePvpGhosts) SG.updatePvpGhosts(delta);
        if (SG.updatePlayerModelAnimation) SG.updatePlayerModelAnimation(delta);

        // Speed increase
        if (SG.state.speed < SG.MAX_SPEED) {
            SG.state.speed += SG.getDifficultySpeedIncrement() * delta * 60;
            if (SG.state.speed > SG.MAX_SPEED) SG.state.speed = SG.MAX_SPEED;
        }

        // Distance is meters; faster speeds cover more meters per second.
        SG.state.score += SG.getDistanceRate(SG.state.speed) * delta;

        SG.state.policeTotalDistance += delta * SG.state.speed * 60;

        // Update score display
        if (SG.scoreEl) SG.scoreEl.textContent = Math.floor(SG.state.score);
        if (SG.coinsEl) SG.coinsEl.textContent = SG.state.coins;
        if (SG.updateAbilityVisuals) SG.updateAbilityVisuals();
        if (SG.updateAbilityHUD) SG.updateAbilityHUD();
        if (SG.updateSpeedHUD) SG.updateSpeedHUD();

        // Speed indicator
        var speedEl = document.getElementById('speed-indicator');
        if (speedEl) {
            var speedLevel = SG.getSpeedLevel(SG.state.speed);
            speedEl.textContent = 'SPD: ' + speedLevel + 'x';
            speedEl.style.color = speedLevel > 35 ? 'rgba(255,30,30,1)' : speedLevel > 15 ? 'rgba(255,100,50,0.9)' : 'rgba(255,255,255,0.5)';
        }

        // Update best score HUD
        var hudBest = document.getElementById('hud-best');
        if (hudBest) hudBest.textContent = 'BEST: ' + SG.state.bestScore + 'm';

        // Instructions fade
        if (SG.state.instructionTimer > 0) {
            SG.state.instructionTimer -= delta;
            if (SG.state.instructionTimer <= 0) {
                SG.instructionsEl.style.opacity = '0';
            } else if (SG.state.instructionTimer < 3) {
                SG.instructionsEl.style.opacity = SG.state.instructionTimer / 3;
            }
        }

        // Move track segments
        for (var si = 0; si < SG.state.trackSegments.length; si++) {
            SG.state.trackSegments[si].position.z += SG.state.speed * delta * 60;
        }

        // Recycle track segments
        for (var ti = SG.state.trackSegments.length - 1; ti >= 0; ti--) {
            if (SG.state.trackSegments[ti].position.z > SG.TRACK_SEGMENT_LENGTH) {
                SG.state.trackSegments[ti].position.z -= SG.TRACK_SEGMENT_LENGTH * SG.state.trackSegments.length;
            }
        }

        // Move obstacles
        for (var oi = 0; oi < SG.state.obstacles.length; oi++) {
            SG.state.obstacles[oi].position.z += SG.state.speed * delta * 60;
        }

        // Moving obstacles
        for (var mi = 0; mi < SG.state.obstacles.length; mi++) {
            var obs = SG.state.obstacles[mi];
            if (obs.userData.moving) {
                var ud = obs.userData;
                ud.movePhase += delta * 2.0;
                var offset = Math.sin(ud.movePhase) * SG.LANE_WIDTH * 1.0;
                obs.position.x = ud.baseX + offset;
                if (ud.warningLights) {
                    var flashOn = Math.sin(SG.state.gameTime * 12) > 0;
                    for (var wli = 0; wli < ud.warningLights.length; wli++) {
                        var light = ud.warningLights[wli];
                        if (light && light.material) {
                            light.material.color.setHex(flashOn ? 0xFFFF00 : 0x886600);
                        }
                    }
                }
            }
        }

        // Move coins
        for (var ci = 0; ci < SG.state.coinObjects.length; ci++) {
            var coin = SG.state.coinObjects[ci];
            coin.position.z += SG.state.speed * delta * 60;
            coin.rotation.y += delta * 3;
            var children = coin.children;
            if (children.length > 0) {
                var coinBob = Math.sin(SG.state.gameTime * 2 + coin.id) * 0.1;
                for (var cci = 0; cci < children.length; cci++) {
                    var childBaseY = children[cci].userData && typeof children[cci].userData.baseY === 'number'
                        ? children[cci].userData.baseY
                        : (coin.userData.baseCoinY || 0.6);
                    children[cci].position.y = childBaseY + coinBob;
                }
            }
        }

        // Move buildings
        for (var bi = 0; bi < SG.state.buildings.length; bi++) {
            SG.state.buildings[bi].position.z += SG.state.speed * delta * 60;
        }

        // Particles
        for (var pi = SG.state.particles.length - 1; pi >= 0; pi--) {
            var p = SG.state.particles[pi];
            var pud = p.userData;
            p.position.x += pud.vx;
            p.position.y += pud.vy;
            p.position.z += pud.vz;
            pud.vy -= 0.003;
            pud.life -= pud.decay;
            p.material.opacity = Math.max(0, pud.life);
            p.scale.setScalar(pud.life);
            if (pud.life <= 0) {
                SG.scene.remove(p);
                SG.state.particles.splice(pi, 1);
            }
        }

        // Player lane movement
        if (SG.state.laneLerp < 1) {
            SG.state.laneLerp += delta * 10;
            if (SG.state.laneLerp > 1) SG.state.laneLerp = 1;
            var targetX = SG.LANE_POSITIONS[SG.state.targetLane];
            SG.player.position.x = SG.state.startLaneX + (targetX - SG.state.startLaneX) * SG.easeOutQuad(SG.state.laneLerp);
        } else {
            SG.player.position.x = SG.LANE_POSITIONS[SG.state.currentLane];
        }

        // Jetpack
        if (SG.state.isJumping && SG.state.equippedAbility === 2 && SG.state.canJetpack && SG.state.jetpackFuel > 0 && SG.state.jetpackCooldown <= 0) {
            SG.state.jumpVelocity = 0;
            if (SG.state.playerHeight < SG.JETPACK_MAX_HEIGHT) {
                SG.state.playerHeight += SG.JETPACK_LIFT * delta * 60;
                if (SG.state.playerHeight > SG.JETPACK_MAX_HEIGHT) SG.state.playerHeight = SG.JETPACK_MAX_HEIGHT;
            }
            SG.state.jetpackFuel -= delta;
            if (SG.state.jetpackFuel <= 0) {
                SG.state.jetpackFuel = 0;
                SG.state.jetpackCooldown = SG.JETPACK_COOLDOWN_MAX;
            }
        } else if (SG.state.jetpackCooldown > 0) {
            SG.state.jetpackCooldown -= delta;
            if (SG.state.jetpackCooldown < 0) SG.state.jetpackCooldown = 0;
        }

        // Jump physics
        if (SG.state.isJumping) {
            SG.state.playerHeight += SG.state.jumpVelocity * delta * 60;
            var gravMult = SG.state.isRolling ? 2.5 : 1.0;
            SG.state.jumpVelocity += SG.GRAVITY * gravMult * delta * 60;
            if (SG.state.playerHeight <= SG.PLAYER_Y) {
                SG.state.playerHeight = SG.PLAYER_Y;
                SG.state.isJumping = false;
                SG.state.hasDoubleJumped = false;
                SG.state.jumpingFromRoof = false;
                SG.state.jumpVelocity = 0;
                if (SG.state.isRolling && !SG.state.rolledLand) {
                    SG.state.rolledLand = true;
                    SG.state.rolledLandTime = Date.now();
                }
            }
        }

        // Roll height
        if (SG.state.isRolling) {
            SG.state.playerHeight += (SG.state.targetPlayerHeight - SG.state.playerHeight) * 0.2;
            if (Math.abs(SG.state.playerHeight - SG.state.targetPlayerHeight) < 0.01) {
                SG.state.playerHeight = SG.state.targetPlayerHeight;
            }
        } else if (!SG.state.isJumping) {
            SG.state.playerHeight += (SG.PLAYER_Y - SG.state.playerHeight) * 0.2;
            if (Math.abs(SG.state.playerHeight - SG.PLAYER_Y) < 0.01) {
                SG.state.playerHeight = SG.PLAYER_Y;
            }
        }

        SG.player.position.y = SG.state.playerHeight;

        // Roll scale
        if (SG.state.isRolling) {
            var scaleY = (SG.ROLL_HEIGHT + 0.2) / (SG.PLAYER_Y + 0.2);
            SG.player.scale.y = 1 - (1 - scaleY) * 0.7;
            SG.player.position.y = SG.state.playerHeight;
        } else {
            SG.player.scale.y += (1 - SG.player.scale.y) * 0.15;
        }

        // Roll release
        if (SG.state.isRolling && !SG.state.isJumping) {
            var now = Date.now();
            var rollReleaseDelay = Math.max(0, Math.min(1000, SG.state.rollReleaseDelay || 200));
            var downHeld = SG.isActionHeld ? SG.isActionHeld('down') : SG.keys['ArrowDown'];
            if (downHeld) {
                SG.state.rollEndTime = now + rollReleaseDelay;
                SG.state.rolledLand = false;
            } else if (SG.state.rolledLand && now > SG.state.rolledLandTime + 400) {
                SG.state.isRolling = false;
                SG.state.targetPlayerHeight = SG.PLAYER_Y;
                SG.state.rolledLand = false;
            } else if (now < SG.state.rollEndTime) {
                // still in min roll duration
            } else {
                SG.state.isRolling = false;
                SG.state.targetPlayerHeight = SG.PLAYER_Y;
            }
        }

        // Roof mechanics
        if (SG.state.onRoof && !SG.state.isJumping) {
            SG.state.playerHeight = SG.ROOF_TOP_Y + SG.PLAYER_Y;
            SG.player.position.y = SG.state.playerHeight;
            var hasSurfaceBelow = SG.state.obstacles.some(function(o) {
                return Math.abs(o.position.z) < 4 &&
                    Math.abs(o.position.x - SG.player.position.x) < 1.5;
            });
            if (!hasSurfaceBelow) {
                SG.state.onRoof = false;
            }
        }

        if (SG.state.jumpingFromRoof && !SG.state.isJumping) {
            SG.state.jumpingFromRoof = false;
        }

        // Running animation
        var runCycle = SG.state.gameTime * 8;
        if (!SG.state.isJumping && !SG.state.isRolling) {
            SG.player.position.y += Math.sin(runCycle) * 0.04;
        }

        var forwardMps = SG.getDistanceRate ? SG.getDistanceRate(SG.state.speed) : ((SG.state.speed || 0) * 10);
        var lateralMps = 0;
        var verticalMps = 0;
        if (SG.state._speedSample) {
            lateralMps = (SG.player.position.x - SG.state._speedSample.x) / delta;
            verticalMps = ((SG.state.playerHeight || 0) - SG.state._speedSample.height) / delta;
        }
        SG.state.instantSpeedMps = Math.sqrt(
            forwardMps * forwardMps +
            lateralMps * lateralMps +
            verticalMps * verticalMps
        );
        SG.state._speedSample = {
            x: SG.player.position.x,
            height: SG.state.playerHeight || 0
        };

        if (SG.playerLeftArm && SG.playerRightArm) {
            SG.playerLeftArm.rotation.x = Math.sin(runCycle) * 0.4;
            SG.playerRightArm.rotation.x = Math.sin(runCycle + Math.PI) * 0.4;
        }
        if (SG.playerLeftLeg && SG.playerRightLeg) {
            SG.playerLeftLeg.rotation.x = Math.sin(runCycle + Math.PI) * 0.3;
            SG.playerRightLeg.rotation.x = Math.sin(runCycle) * 0.3;
        }

        // Body lean
        var leanTargetX = SG.LANE_POSITIONS[SG.state.targetLane];
        var leanTarget = (SG.player.position.x - leanTargetX) * 0.3;
        SG.player.rotation.z += (leanTarget - SG.player.rotation.z) * 0.1;

        // Coin collection
        for (var coi = SG.state.coinObjects.length - 1; coi >= 0; coi--) {
            var coinObj = SG.state.coinObjects[coi];
            var coinLane = coinObj.userData.lane;
            var coinX = SG.LANE_POSITIONS[coinLane];
            var dx = Math.abs(SG.player.position.x - coinX);
            var dz = Math.abs(SG.player.position.z - coinObj.position.z);

            if (dx < 0.8 && dz < 0.8 && !coinObj.userData.collected) {
                coinObj.userData.collected = true;
                SG.createCoinParticles(coinObj.position.clone());
                SG.state.coins++;
                SG.playCoinSound();
                SG.scene.remove(coinObj);
                SG.state.coinObjects.splice(coi, 1);
                // Police pushback
                SG.coinPushBackPolice();
            }

            if (coinObj.position.z > SG.DESPAWN_BEHIND) {
                SG.scene.remove(coinObj);
                SG.state.coinObjects.splice(coi, 1);
            }
        }

        // Spawn new objects
        if (SG.updateGunSystem) SG.updateGunSystem(delta);
        SG.spawnObstacles();
        SG.spawnBuildings();

        // Homelander override
        if (SG.state.homelander) SG.state.gameOver = false;

        // Collision
        if (SG.checkCollisions()) {
            SG.gameOver();
            SG.updateCamera();
            return;
        }

        // Theme change
        if (!SG.state.pvpMode) SG.checkThemeChange();

        // Background color changes with speed
        var speedLvl = SG.getSpeedLevel(SG.state.speed);
        var speedRatio = Math.min(SG.state.speed / SG.MAX_SPEED, 1.0);
        var inCyber = speedLvl >= 48;
        if (SG.state.pvpMode) {
            SG.applyPvpScene(true);
            return;
        }
        if (inCyber !== SG.state.cyberMode) {
            SG.state.cyberMode = inCyber;
            SG.applyCyberColors(inCyber);
            if (SG.updateSkyDome) SG.updateSkyDome(SG.state.theme || 0, inCyber ? 'cyber' : 'normal');
        }
        if (inCyber) {
            SG.scene.background.setHex(0x000000);
            SG.scene.fog.color.setHex(0x000000);
            SG.scene.fog.near = 25;
            SG.scene.fog.far = 70;
        } else if (speedRatio < 0.3) {
            SG.scene.background.setHex(0x87CEEB);
            SG.scene.fog.color.setHex(0x87CEEB);
            SG.scene.fog.near = 60;
            SG.scene.fog.far = 120;
        } else if (speedRatio < 0.6) {
            var t = (speedRatio - 0.3) / 0.3;
            var r = Math.round(0x87 * (1-t) + 0xFF * t);
            var g = Math.round(0xCE * (1-t) + 0x99 * t);
            var b = Math.round(0xEB * (1-t) + 0x33 * t);
            SG.scene.background.setRGB(r/255, g/255, b/255);
            SG.scene.fog.color.copy(SG.scene.background);
        } else {
            var t2 = Math.min((speedRatio - 0.6) / 0.4, 1.0);
            var r2 = Math.round(0xFF * (1-t2) + 0x55 * t2);
            var g2 = Math.round(0x99 * (1-t2) + 0x11 * t2);
            var b2 = Math.round(0x33 * (1-t2) + 0x11 * t2);
            SG.scene.background.setRGB(r2/255, g2/255, b2/255);
            SG.scene.fog.color.copy(SG.scene.background);
        }

        // Police chase: start after 100m
        if (!SG.state.policeChasing && SG.state.policeTotalDistance > 200 && !SG.state.gameOver && !SG.state.homelander) {
            SG.startPoliceChase();
        }

        // Police update
        if (SG.state.policeChasing) {
            SG.updatePolice(delta);
            if (SG.state.policeCaught) {
                SG.updateCamera();
                return;
            }
        }

        if (SG.state.homelander) SG.updateHomelander(delta);
        SG.updateBgMusic(delta);
        if (SG.updateAbilityHUD) SG.updateAbilityHUD();
        SG.updateCamera();
        if (SG.updateGunViewModel) SG.updateGunViewModel();
    };

    SG.updateAbilityHUD = function() {
        var skillEl = document.getElementById('skill-indicator');
        var jetEl = document.getElementById('jetpack-timer');
        if (!skillEl || !jetEl) return;

        if (!SG.state.started || SG.state.gameOver || SG.state.paused) {
            skillEl.style.display = 'none';
            jetEl.style.display = 'none';
            return;
        }

        var abilityNames = ['None', 'Double Jump', 'Jetpack', 'Roof Walk'];
        var abilityIcons = ['-', 'DJ', 'JET', 'ROOF'];
        var ability = SG.state.equippedAbility || 0;
        skillEl.style.display = 'block';
        skillEl.textContent = 'SKILL: ' + (abilityIcons[ability] || '-') + ' ' + (abilityNames[ability] || 'None');

        if (ability === 2 && SG.state.canJetpack) {
            jetEl.style.display = 'block';
            if (SG.state.jetpackFuel > 0) {
                var fuel = Math.max(0, SG.state.jetpackFuel);
                var capped = SG.state.playerHeight >= SG.JETPACK_MAX_HEIGHT - 0.01;
                jetEl.textContent = 'JETPACK: ' + fuel.toFixed(1) + 's' + (capped ? ' | MAX ALT' : '');
                jetEl.style.borderColor = 'rgba(100,200,255,0.45)';
            } else if (SG.state.jetpackCooldown > 0) {
                jetEl.textContent = 'JETPACK CD: ' + SG.state.jetpackCooldown.toFixed(1) + 's';
                jetEl.style.borderColor = 'rgba(255,120,80,0.45)';
            } else {
                jetEl.textContent = 'JETPACK READY';
                jetEl.style.borderColor = 'rgba(80,255,160,0.45)';
            }
        } else {
            jetEl.style.display = 'none';
        }
    };

    SG.updateAbilityVisuals = function() {
        var showDJ = SG.state.equippedAbility === 1 && SG.state.canDoubleJump;
        var showJetpack = SG.state.equippedAbility === 2 && SG.state.canJetpack;
        var showRW = SG.state.equippedAbility === 3 && SG.state.canRoofWalk;

        if (SG.shoesLeft) SG.shoesLeft.visible = false;
        if (SG.shoesRight) SG.shoesRight.visible = false;
        var showNeoShoeOverlay = (SG.state.selectedCharacter || 'runner') === 'runner';
        if (SG.shoesDJLeft) SG.shoesDJLeft.visible = showDJ && showNeoShoeOverlay;
        if (SG.shoesDJRight) SG.shoesDJRight.visible = showDJ && showNeoShoeOverlay;
        if (SG.shoesRWLeft) SG.shoesRWLeft.visible = showRW && showNeoShoeOverlay;
        if (SG.shoesRWRight) SG.shoesRWRight.visible = showRW && showNeoShoeOverlay;

        if (showRW && SG.shoesRWLeft && SG.shoesRWRight) {
            var pulse = 0.45 + Math.sin(SG.state.gameTime * 8) * 0.25;
            SG.shoesRWLeft.material.emissiveIntensity = pulse;
            SG.shoesRWRight.material.emissiveIntensity = pulse;
        }

        if (SG.jetpackPack) {
            SG.jetpackPack.visible = showJetpack;
            SG.jetpackPack.position.set(0, 0.72, -0.24);
        }

        var flameOn = showJetpack && SG.state.jetpackFuel > 0 && SG.state.jetpackCooldown <= 0;
        if (SG.jetpackFlameGroups && SG.jetpackFlameGroups.length) {
            for (var jf = 0; jf < SG.jetpackFlameGroups.length; jf++) {
                var flameGroup = SG.jetpackFlameGroups[jf];
                flameGroup.visible = flameOn;
                if (flameOn) {
                    var pulse = 0.85 + Math.sin(SG.state.gameTime * (18 + jf * 3)) * 0.15;
                    flameGroup.scale.set(pulse, 0.95 + Math.sin(SG.state.gameTime * 22 + jf) * 0.12, pulse);
                } else {
                    flameGroup.scale.set(1, 1, 1);
                }
            }
            return;
        }
        if (SG.jetpackFlame) {
            SG.jetpackFlame.visible = flameOn;
            SG.jetpackFlame.scale.setScalar(flameOn ? 0.85 + Math.sin(SG.state.gameTime * 18) * 0.15 : 1);
        }
        if (SG.jetpackFlameInner) {
            SG.jetpackFlameInner.visible = flameOn;
            SG.jetpackFlameInner.scale.setScalar(flameOn ? 0.9 + Math.sin(SG.state.gameTime * 22) * 0.12 : 1);
        }
    };

    // ===== RENDER LOOP =====
    SG.animate = function() {
        requestAnimationFrame(SG.animate);
        try {
            SG.update();
            if (SG.updateSpeedHUD) SG.updateSpeedHUD();
            if (SG.updateGunCrosshair) SG.updateGunCrosshair();
            if (SG.camera && !isNaN(SG.camera.position.x)) {
                SG.renderer.render(SG.scene, SG.camera);
            }
        } catch(e) {
            console.error('Game error:', e);
        }
    };

    // ===== INIT =====
    SG.init = function() {
        // Check Three.js loaded
        if (typeof THREE === 'undefined') {
            var errDiv = document.getElementById('three-error');
            if (errDiv) errDiv.style.display = 'block';
            return;
        }

        SG.initScene();
        if (SG.loadVehicleModels) SG.loadVehicleModels();
        if (SG.loadSceneryModels) SG.loadSceneryModels();
        if (SG.loadGunModels) SG.loadGunModels();
        SG.loadShopData();
        if (typeof SG.setupUI !== 'function') { SG.setupUI = function() { console.warn('setupUI missing - ui.js may not have loaded'); }; }
        SG.setupUI();
        SG.createPlayer();
        SG.spawnInitialTrack();
        SG.spawnBuildings();
        SG.spawnObstacles();
        SG.setupControls();

        if (SG.camera) {
            SG.camera.position.set(0, 6, 8);
            SG.camera.lookAt(0, 0, -10);
        }

        if (SG.scoreEl) SG.scoreEl.textContent = '0';
        if (SG.coinsEl) SG.coinsEl.textContent = '0';

        SG.updateMenuCredits();

        if (SG.menuOverlay) SG.menuOverlay.style.display = 'flex';
        SG.state.started = false;

        window.__neoGame = { state: SG.state, scene: SG.scene, camera: SG.camera, player: SG.player, renderer: SG.renderer, animate: SG.animate, restartGame: SG.restartGame, quitToMenu: SG.quitToMenu, togglePause: SG.togglePause, homelanderGroup: SG.homelanderGroup };

        SG.animate();
    };

    // Init triggered by account.js after override
})();


// ===== ENDLESS RUNNER - Account System v2 =====
(function() {
    'use strict';
    var SG = window.__SG = window.__SG || {};
    var API = 'http://' + (window.location.hostname || '35.212.200.85') + ':3000';

    SG.account = {
        token: localStorage.getItem('subwayToken') || null,
        email: localStorage.getItem('subwayEmail') || null,
        loggedIn: !!localStorage.getItem('subwayToken')
    };

    // Show login overlay (blocks game start until logged in)
    SG.showLogin = function(firstTime) {
        var overlay = document.getElementById('login-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'login-overlay';
            overlay.className = 'overlay';
            overlay.style.display = 'flex';
            overlay.style.zIndex = '100';

            var html = '<div class="menu-content" style="max-width:360px;">';
            html += '<h1 class="menu-title" style="font-size:28px;">ENDLESS RUNNER</h1>';
            html += '<div style="color:#888;font-size:13px;margin:-15px 0 15px;">Sign in to play</div>';
            html += '<input id="login-name" placeholder="Username" style="width:90%;padding:10px;margin:5px 0;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;display:none;">';
            html += '<input id="login-email" placeholder="Email (qq/163/gmail)" style="width:90%;padding:10px;margin:5px 0;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;">';
            html += '<br><input id="login-pass" type="password" placeholder="Password" style="width:90%;padding:10px;margin:5px 0;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.4);color:#fff;font-size:14px;">';
            html += '<br>';
            html += '<button class="diff-btn" onclick="SG.doLogin()" style="margin:5px;padding:10px 30px;font-size:16px;">LOGIN</button>';
            html += '<button class="diff-btn" onclick="__neoShowReg()" style="margin:5px;padding:10px 20px;">REGISTER</button>';
            html += '<div id="login-msg" style="color:#ffaa00;font-size:12px;margin:8px 0;"></div>';
            html += '<div style="color:#555;font-size:11px;margin-top:10px;">Play anywhere • Cloud saves • Leaderboard</div>';
            html += '</div>';

            overlay.innerHTML = html;
            document.body.appendChild(overlay);

            // Enter key triggers login
            document.getElementById('login-pass').addEventListener('keydown', function(e) {
                if (e.key === 'Enter') SG.doLogin();
            });

            // Show username field only when registering
            window.__neoShowReg = function() {
                var nameEl = document.getElementById('login-name');
                if (nameEl) nameEl.style.display = 'block';
                var btn = document.querySelector('[onclick="__neoShowReg()"]');
                if (btn) {
                    btn.textContent = '✓ REGISTER';
                    btn.onclick = function() { SG.doRegister(); };
                }
            };
        }
        overlay.style.display = 'flex';
        if (firstTime) {
            document.getElementById('login-email').focus();
        }
    };

    SG.hideLogin = function() {
        var overlay = document.getElementById('login-overlay');
        if (overlay) overlay.style.display = 'none';
    };

    // ── Unified game data applier ────────────────────────
    SG.applyGameData = function(g) {
        if (!g) return;
        var best = Math.max(g.maxDistance || 0, g.highScore || 0, g.maxEasy || 0, g.maxMedium || 0, g.maxHard || 0);
        SG.state.bestScore = Math.max(SG.state.bestScore || 0, best);
        SG.state.maxLegitDistance = Math.max(SG.state.maxLegitDistance || 0, best);
        SG.state.credits = g.credits || 0;
        SG.state.totalCoins = Math.max(g.totalCoins || 0, g.coins || 0);
        SG.state.equippedAbility = g.equippedAbility || 0;
        SG.state.maxEasy = g.maxEasy || 0;
        SG.state.maxMedium = g.maxMedium || 0;
        SG.state.maxHard = g.maxHard || 0;
        SG.state.maxEasyAbility = g.maxEasyAbility || 0;
        SG.state.maxMediumAbility = g.maxMediumAbility || 0;
        SG.state.maxHardAbility = g.maxHardAbility || 0;
        SG.state.runCount = g.runCount || 0;
        var owned = Array.isArray(g.ownedAbilities) ? g.ownedAbilities : [0];
        SG.state.canDoubleJump = owned.indexOf(1) >= 0;
        SG.state.canJetpack = owned.indexOf(2) >= 0;
        SG.state.canRoofWalk = owned.indexOf(3) >= 0;
        if (Array.isArray(g.ownedCharacters) && g.ownedCharacters.length) {
            SG.state.ownedCharacters = g.ownedCharacters;
            localStorage.setItem('subwayOwnedCharacters', JSON.stringify(g.ownedCharacters));
        }
        if (g.selectedCharacter) {
            SG.state.selectedCharacter = g.selectedCharacter;
            localStorage.setItem('subwaySelectedCharacter', g.selectedCharacter);
            if (SG.selectCharacter && SG.characterIsOwned(g.selectedCharacter)) SG.selectCharacter(g.selectedCharacter);
        }
        localStorage.setItem('subwayCredits', String(SG.state.credits));
        localStorage.setItem('subwayTotalCoins', String(SG.state.totalCoins));
        localStorage.setItem('subwayBest', String(SG.state.bestScore || 0));
        if (SG.updateMenuCredits) SG.updateMenuCredits();
    };

    SG.doLogin = function() {
        var email = document.getElementById('login-email').value.trim();
        var pass = document.getElementById('login-pass').value;
        var msg = document.getElementById('login-msg');

        fetch(API + '/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pass })
        }).then(function(r) { return r.json(); }).then(function(data) {
            if (data.error) { msg.textContent = 'X ' + data.error; return; }
            SG.account.token = data.token;
            SG.account.email = data.email;
            SG.account.loggedIn = true;
            localStorage.setItem('subwayToken', data.token);
            localStorage.setItem('subwayEmail', data.email);
            msg.textContent = 'Logged in!';
            msg.style.color = '#4CAF50';
            SG.hideLogin();

            // Sync game data from server
            if (data.gameData) {
                SG.applyGameData(data.gameData);
            }

            // Store username
            SG.account.username = data.username || data.email.split('@')[0];
            localStorage.setItem('subwayUsername', SG.account.username);

            // Update button text
            var btn = document.getElementById('account-btn-menu');
            if (btn) btn.textContent = '👤 ' + SG.account.username;

            // Show main menu
            if (SG.menuOverlay) SG.menuOverlay.style.display = 'flex';
        }).catch(function() { msg.textContent = 'X Server error'; });
    };

    SG.doRegister = function() {
        var name = document.getElementById('login-name').value.trim();
        var email = document.getElementById('login-email').value.trim();
        var pass = document.getElementById('login-pass').value;
        var msg = document.getElementById('login-msg');

        if (!name) { msg.textContent = 'X Username required (2-16 chars)'; return; }
        fetch(API + '/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pass, username: name })
        }).then(function(r) { return r.json(); }).then(function(data) {
            if (data.error) { msg.textContent = 'X ' + data.error; return; }
            msg.textContent = 'Registered! Check email for code. Now log in.';
            msg.style.color = '#4CAF50';
            // Reset button back to login mode
            var btn = document.querySelector('button[onclick*="SG.doRegister"]');
            if (btn) {
                btn.textContent = 'REGISTER';
                btn.onclick = function() { __neoShowReg(); };
            }
            var nameEl = document.getElementById('login-name');
            if (nameEl) nameEl.style.display = 'none';
        }).catch(function() { msg.textContent = 'X Server error'; });
    };

    SG.accountLogout = function() {
        SG.account.token = null;
        SG.account.email = null;
        SG.account.loggedIn = false;
        localStorage.removeItem('subwayToken');
        localStorage.removeItem('subwayEmail');
        localStorage.removeItem('subwayRemember');
        window.location.href = 'http://' + window.location.hostname + ':3000/';
    };

    SG.accountSave = function() {
        if (!SG.account.loggedIn || !SG.account.token) return;
        var owned = [0];
        if (SG.state.canDoubleJump) owned.push(1);
        if (SG.state.canJetpack) owned.push(2);
        if (SG.state.canRoofWalk) owned.push(3);

        fetch(API + '/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + SG.account.token
            },
            body: JSON.stringify({
                gameData: {
                    coins: SG.state.coins || 0,
                    credits: SG.state.credits || 0,
                    equippedAbility: SG.state.equippedAbility || 0,
                    ownedAbilities: owned,
                    maxDistance: Math.max(SG.state.bestScore || 0, SG.state.maxLegitDistance || 0, SG.state.maxEasy || 0, SG.state.maxMedium || 0, SG.state.maxHard || 0),
                    maxEasy: SG.state.maxEasy || 0,
                    maxMedium: SG.state.maxMedium || 0,
                    maxHard: SG.state.maxHard || 0,
                    maxEasyAbility: SG.state.maxEasyAbility || 0,
                    maxMediumAbility: SG.state.maxMediumAbility || 0,
                    maxHardAbility: SG.state.maxHardAbility || 0,
                    runCount: (SG.state.runCount || 0),
                    highScore: SG.state.bestScore || 0,
                    totalCoins: SG.state.totalCoins || SG.state.coins || 0,
                    ownedCharacters: SG.getOwnedCharacters ? SG.getOwnedCharacters() : (SG.state.ownedCharacters || ['runner']),
                    selectedCharacter: SG.state.selectedCharacter || 'runner'
                }
            })
        }).catch(function() {});
    };

    SG.accountSaveVol = function() {
        // Volume is already saved in localStorage by oninput handler
    };

    // Sanitize user input for safe HTML rendering
    SG.escapeHtml = function(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    };

    SG.loadAccountData = function(callback) {
        if (!SG.account.loggedIn || !SG.account.token) { if (callback) callback(); return; }
        var url = API + '/api/load';
        fetch(url, {
            headers: { 'Authorization': 'Bearer ' + SG.account.token }
        }).then(function(r) {
            if (r.status === 401) {
                // Token expired/invalid - force re-login
                SG.account.token = null;
                SG.account.loggedIn = false;
                localStorage.removeItem('subwayToken');
                localStorage.removeItem('subwayEmail');
                if (SG.menuOverlay) SG.menuOverlay.style.display = 'none';
                SG.showLogin(true);
                if (callback) callback();
                return null;
            }
            return r.json();
        }).then(function(data) {
            if (!data || !data.gameData) { if (callback) callback(); return; }
            SG.applyGameData(data.gameData);
            if (callback) callback();
        }).catch(function(){ if (callback) callback(); });
    };

    SG.showProfile = function() {
        var overlay = document.getElementById('profile-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'profile-overlay';
            overlay.className = 'overlay';
            overlay.onclick = function(e) { if (e.target === overlay || e.target.closest('.modal-close-btn')) overlay.style.display = 'none'; };
            overlay.addEventListener('touchend', function(e) { if (e.target === overlay || e.target.closest('.modal-close-btn')) { e.preventDefault(); overlay.style.display = 'none'; } });
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
        overlay.innerHTML = '<div class="menu-content"><div style="color:#888;padding:20px;">Loading...</div></div>';

        // Load fresh data from server first, then render
        SG.loadAccountData(function() {
            try {
                SG._renderProfile(overlay);
            } catch(e) {
                // Fallback: render anyway even if _renderProfile fails
                overlay.innerHTML = '<div class="menu-content"><h1 class="menu-title">👤 PROFILE</h1>' +
                    '<div style="color:#888;padding:20px;">' + SG.escapeHtml(SG.account.email || '') + '</div>' +
                    '<div class="menu-btn modal-close-btn" onclick="this.closest(\'.overlay\').style.display=\'none\'">CLOSE</div></div>';
            }
        });
    };

    SG._renderProfile = function(overlay) {
        var s = SG.state;
        SG.account.email = localStorage.getItem('subwayEmail');
        SG.account.username = localStorage.getItem('subwayUsername') || (SG.account.email || '').split('@')[0] || 'Player';
        var names = {0:'None',1:'Double Jump',2:'Jetpack',3:'Roof Walk'};
        var ability = names[s.equippedAbility] || 'None';
        var owned = [];
        if (s.canDoubleJump) owned.push('Double Jump');
        if (s.canJetpack) owned.push('Jetpack');
        if (s.canRoofWalk) owned.push('Roof Walk');

        var html = '<div class="menu-content" style="max-width:380px;text-align:left;">';
        html += '<h1 class="menu-title" style="font-size:24px;text-align:center;margin-bottom:10px;">👤 PROFILE</h1>';
        html += '<div class="bento-grid">';
        html += '<div class="bento-card"><div class="bento-label">Player</div><div class="bento-value">' + SG.escapeHtml(SG.account.username || '-') + '</div></div>';
        html += '<div class="bento-card"><div class="bento-label">Credits</div><div class="bento-value gold">' + (s.credits || 0) + '</div></div>';
        html += '<div class="bento-card"><div class="bento-label">Total Coins</div><div class="bento-value gold">' + (s.totalCoins || 0) + '</div></div>';
        html += '<div class="bento-card"><div class="bento-label">Equipped</div><div class="bento-value cyan" style="font-size:16px;">' + ability + '</div></div>';
        html += '<div class="bento-card"><div class="bento-label">Owned</div><div class="bento-value" style="font-size:14px;">' + (owned.length ? owned.join(', ') : 'None') + '</div></div>';
        html += '<div class="bento-card"><div class="bento-label">Runs</div><div class="bento-value">' + (s.runCount || 0) + '</div></div>';
        html += '</div>';

        html += '<div class="bento-card span-2" style="margin-top:12px;">';
        var abNames = {0:'None',1:'Double Jump',2:'Jetpack',3:'Roof Walk'};
        html += '<div class="bento-head">🏆 Best Distances</div>';
        html += '<div class="row"><span><span class="dot-easy">■</span> Easy <span style="color:#888;font-size:11px;">[' + (abNames[s.maxEasyAbility] || 'None') + ']</span></span><span class="v">' + (s.maxEasy || 0) + 'm</span></div>';
        html += '<div class="row"><span><span class="dot-med">■</span> Medium <span style="color:#888;font-size:11px;">[' + (abNames[s.maxMediumAbility] || 'None') + ']</span></span><span class="v">' + (s.maxMedium || 0) + 'm</span></div>';
        html += '<div class="row"><span><span class="dot-hard">■</span> Hard <span style="color:#888;font-size:11px;">[' + (abNames[s.maxHardAbility] || 'None') + ']</span></span><span class="v">' + (s.maxHard || 0) + 'm</span></div>';
        html += '</div>';

        html += '<div class="menu-btn modal-close-btn" onclick="document.getElementById(\'profile-overlay\').style.display=\'none\'" style="margin-top:12px;text-align:center;">CLOSE</div>';
        html += '</div>';

        overlay.innerHTML = html;
    };

    // ===== LEADERBOARD =====
    SG.showLeaderboard = function() {
        var overlay = document.getElementById('lb-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'lb-overlay';
            overlay.className = 'overlay';
            overlay.onclick = function(e) { if (e.target === overlay || e.target.closest('.modal-close-btn')) overlay.style.display = 'none'; };
            overlay.addEventListener('touchend', function(e) { if (e.target === overlay || e.target.closest('.modal-close-btn')) { e.preventDefault(); overlay.style.display = 'none'; } });
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
        overlay.innerHTML = '<div class="menu-content" style="max-width:420px;max-height:80vh;overflow-y:auto;">' +
            '<h1 class="menu-title" style="font-size:24px;margin-bottom:10px;">🏆 LEADERBOARD</h1>' +
            '<div style="color:#aaa;font-size:13px;margin-bottom:10px;">Loading...</div>' +
            '</div>';

        var url = API + '/api/leaderboard';
        fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var entries = data.leaderboard || [];
            var abNames = {0:'None',1:'Double',2:'Jetpack',3:'Roof'};
            var html = '<div class="menu-content" style="max-width:420px;max-height:80vh;overflow-y:auto;">';
            html += '<h1 class="menu-title" style="font-size:24px;margin-bottom:5px;">🏆 LEADERBOARD</h1>';
            html += '<div style="font-size:11px;color:#666;margin-bottom:10px;">Per-difficulty best distances</div>';
            if (entries.length === 0) {
                html += '<div style="color:#888;padding:20px;">No entries yet. Play a game first!</div>';
            } else {
                html += '<table class="lb-table">';
                html += '<tr>' +
                    '<th>#</th>' +
                    '<th>Player</th>' +
                    '<th class="dot-easy">Easy</th>' +
                    '<th class="dot-med">Med</th>' +
                    '<th class="dot-hard">Hard</th>' +
                    '</tr>';
                for (var i = 0; i < entries.length; i++) {
                    var e = entries[i];
                    var row = (i % 2 === 0) ? 'rgba(255,255,255,0.03)' : 'transparent';
                    html += '<tr>' +
                        '<td class="rank rank-' + (i+1) + '">' + (i+1) + '</td>' +
                        '<td class="player">' + SG.escapeHtml(e.name || 'Player') + '</td>' +
                        '<td class="dot-easy">' + (e.maxEasy||0) + 'm <span style="color:#666;font-size:10px;">[' + (abNames[e.maxEasyAbility]||'-') + ']</span></td>' +
                        '<td class="dot-med">' + (e.maxMedium||0) + 'm <span style="color:#666;font-size:10px;">[' + (abNames[e.maxMediumAbility]||'-') + ']</span></td>' +
                        '<td class="dot-hard">' + (e.maxHard||0) + 'm <span style="color:#666;font-size:10px;">[' + (abNames[e.maxHardAbility]||'-') + ']</span></td>' +
                        '</tr>';
                }
                html += '</table>';
            }
            html += '<div class="menu-btn modal-close-btn" onclick="document.getElementById(\'lb-overlay\').style.display=\'none\'" style="margin-top:12px;">CLOSE</div>';
            html += '</div>';
            overlay.innerHTML = html;
        })
        .catch(function() {
            overlay.innerHTML = '<div class="menu-content"><h1 class="menu-title">🏆 LEADERBOARD</h1><div style="color:#ff4444;padding:20px;">Failed to load. Server offline?</div><div class="menu-btn modal-close-btn" onclick="document.getElementById(\'lb-overlay\').style.display=\'none\'">CLOSE</div></div>';
        });
    };

    // Auto-save every 30s
    setInterval(function() {
        if (SG.account.loggedIn && SG.state && SG.state.started && !SG.state.gameOver) SG.accountSave();
    }, 30000);

    // Override init to show login first
    var origInit = SG.init;
    SG.init = function() {
        // Wrap setupUI BEFORE calling original init, so the menu
        // doesn't flash before login check runs
        var origSetup = SG.setupUI;
        SG.setupUI = function() {
            if (origSetup) origSetup();
            if (!SG.account.loggedIn) {
                if (SG.menuOverlay) SG.menuOverlay.style.display = 'none';
                SG.showLogin(true);
            }
        };

        try {
            if (origInit) origInit();
        } catch(e) {
            document.body.innerHTML += '<div style="position:fixed;top:0;left:0;width:100%;background:#ff0000;color:#fff;padding:20px;z-index:9999;font-size:16px;">ERROR: ' + e.message + '<br>' + e.stack.split('\n').slice(0,3).join('<br>') + '</div>';
            return;
        }

        // Load account data from server (will clear token if 401)
        SG.loadAccountData();

        // Wrap startGameFromMenu to track runs
        var origStart = SG.startGameFromMenu;
        if (origStart) {
            SG.startGameFromMenu = function() {
                SG.state.runCount = (SG.state.runCount || 0) + 1;
                SG.state.legitRun = !SG.state.homelander;
                return origStart();
            };
        }

        // Wrap gameOver to track max legit distance + auto-save
        var origEnd = SG.gameOver;
        if (origEnd) {
            SG.gameOver = function() {
                if (origEnd) origEnd();
                if (SG.state.legitRun !== false) {
                    var score = Math.floor(SG.state.score || 0);
                    SG.state.maxLegitDistance = Math.max(SG.state.maxLegitDistance || 0, score);
                    SG.state.bestScore = Math.max(SG.state.bestScore || 0, SG.state.maxLegitDistance);
                }
                SG.accountSave();
            };
        }
    };
    SG.init();
})();
