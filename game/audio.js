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
        var targetBpm = 96 + speedT * 144;
        SG.bgMusicState.tempo += (targetBpm - SG.bgMusicState.tempo) * 0.035;

        var beatInterval = 60 / SG.bgMusicState.tempo;
        var now = SG.audioCtx.currentTime;

        if (now - SG.bgMusicState.lastBeat >= beatInterval) {
            SG.bgMusicState.lastBeat += beatInterval;
            SG.bgMusicState.beatCount++;
            var beat = SG.bgMusicState.beatCount;

            try {
                if (beat % 2 === 0 || beat % 4 === 1) {
                    var kick = SG.audioCtx.createOscillator();
                    var kickGain = SG.audioCtx.createGain();
                    kick.connect(kickGain);
                    kickGain.connect(SG.audioCtx.destination);
                    kick.type = 'sine';
                    kick.frequency.setValueAtTime(150, now);
                    kick.frequency.linearRampToValueAtTime(40, now + 0.1);
                    kickGain.gain.setValueAtTime(0.35, now);
                    kickGain.gain.linearRampToValueAtTime(0, now + 0.2);
                    kick.start(now);
                    kick.stop(now + 0.2);
                    SG.bgMusicState.currentOscs.push(kick);
                    setTimeout(function() {
                        var idx = SG.bgMusicState.currentOscs.indexOf(kick);
                        if (idx >= 0) SG.bgMusicState.currentOscs.splice(idx, 1);
                    }, 300);
                }

                if (speedLevel > 12 || beat % 2 === 0) {
                    var hatGain = SG.audioCtx.createGain();
                    hatGain.connect(SG.audioCtx.destination);
                    var hat = SG.audioCtx.createOscillator();
                    hat.connect(hatGain);
                    hat.type = 'square';
                    hat.frequency.setValueAtTime(5000, now);
                    hatGain.gain.setValueAtTime(0.12, now);
                    hatGain.gain.linearRampToValueAtTime(0, now + 0.04);
                    hat.start(now);
                    hat.stop(now + 0.04);
                    SG.bgMusicState.currentOscs.push(hat);
                    setTimeout(function() {
                        var idx = SG.bgMusicState.currentOscs.indexOf(hat);
                        if (idx >= 0) SG.bgMusicState.currentOscs.splice(idx, 1);
                    }, 100);
                }

                if (beat % 4 === 0 || speedLevel > 35 && beat % 2 === 0) {
                    var bass = SG.audioCtx.createOscillator();
                    var bassGain = SG.audioCtx.createGain();
                    bass.connect(bassGain);
                    bassGain.connect(SG.audioCtx.destination);
                    bass.type = 'sawtooth';
                    var notes = [110, 130.8, 110, 146.8];
                    var note = notes[Math.floor(beat / 4) % 4];
                    bass.frequency.setValueAtTime(note, now);
                    bassGain.gain.setValueAtTime(0.15, now);
                    bassGain.gain.linearRampToValueAtTime(0, now + 0.3);
                    bass.start(now);
                    bass.stop(now + 0.3);
                    SG.bgMusicState.currentOscs.push(bass);
                    setTimeout(function() {
                        var idx = SG.bgMusicState.currentOscs.indexOf(bass);
                        if (idx >= 0) SG.bgMusicState.currentOscs.splice(idx, 1);
                    }, 400);
                }
            } catch(e) {}
        }
    };
})();
