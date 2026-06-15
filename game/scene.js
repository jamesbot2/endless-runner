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
