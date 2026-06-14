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
