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
