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

    SG.createSkyDomeTexture = function(themeIndex, mode) {
        var key = 'sky-' + (mode || 'normal') + '-' + (themeIndex || 0);
        var canvas = makeCanvas(key, 1024, 512, function(ctx, w, h) {
            var top = '#67b9f0';
            var mid = '#bfe7ff';
            var low = '#f4d9b8';
            if (mode === 'cyber') {
                top = '#05060a'; mid = '#1c2130'; low = '#3b1d2d';
            } else if (themeIndex === 1) {
                top = '#76b7e6'; mid = '#d8efff'; low = '#d9e7c8';
            } else if (themeIndex === 2) {
                top = '#7a5a36'; mid = '#f1a551'; low = '#ffdd86';
            } else if (themeIndex === 3) {
                top = '#10172a'; mid = '#263b58'; low = '#596f82';
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

            var cloudTint = mode === 'cyber' ? '#7fd7ff' : (themeIndex === 2 ? '#ffe7c0' : '#ffffff');
            ctx.fillStyle = cloudTint;
            for (var c = 0; c < 26; c++) {
                var cx = hashNoise(c, 1, themeIndex) * w;
                var cy = h * (0.14 + hashNoise(c, 2, themeIndex) * 0.36);
                var cw = 64 + hashNoise(c, 3, themeIndex) * 150;
                var ch = 12 + hashNoise(c, 4, themeIndex) * 24;
                ctx.globalAlpha = mode === 'cyber' ? 0.16 : 0.28;
                ctx.beginPath();
                ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
                ctx.ellipse(cx - cw * 0.35, cy + ch * 0.1, cw * 0.55, ch * 0.9, 0, 0, Math.PI * 2);
                ctx.ellipse(cx + cw * 0.32, cy - ch * 0.04, cw * 0.5, ch * 0.82, 0, 0, Math.PI * 2);
                ctx.fill();
                if (mode !== 'cyber') {
                    ctx.globalAlpha = themeIndex === 3 ? 0.12 : 0.18;
                    ctx.fillStyle = themeIndex === 2 ? '#c6864b' : '#8fb5d3';
                    ctx.beginPath();
                    ctx.ellipse(cx + cw * 0.08, cy + ch * 0.48, cw * 0.72, ch * 0.35, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = cloudTint;
                }
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
