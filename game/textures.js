// ===== SUBWAY SURFER - Textures =====
(function() {
    'use strict';
    const SG = window.__SG = window.__SG || {};
    const THREE = window.THREE;

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
