/* =========================================================
   Dunixab — glossy ribbon scene (Three.js r128)
   Runs live in the page heroes, and was used to render the
   still artwork in /assets.
   ========================================================= */
(function(){
  const INK = 0x04122e;
  // weighted toward the deep navies — the blue comes mostly from reflections
  const PALETTE = [0x0a2a6b, 0x082050, 0x061a45, 0x0b3a9a, 0x0a2a6b, 0x1657d6];

  // small seeded random so every scene is repeatable
  function rng(seed){
    let a = seed >>> 0;
    return function(){
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const lin = hex => new THREE.Color(hex).convertSRGBToLinear();

  // soft "photo studio" reflections — this is what makes the ribbons look like satin
  function studioEnvironment(renderer){
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(
      new THREE.SphereGeometry(60, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0x01040c, side: THREE.BackSide })
    ));
    function softbox(w, h, hex, power, x, y, z){
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(power), side: THREE.DoubleSide })
      );
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      env.add(m);
    }
    softbox(40, 10, 0xb9d3ff, 3.6, 18, 26, 14);  // key
    softbox(8, 50, 0x3b82f6, 3.4, -34, 4, 12);   // royal side strip
    softbox(30, 6, 0x1657d6, 2.4, 4, -24, 26);   // blue bounce
    softbox(16, 16, 0x7db4ff, 1.8, 12, 6, -34);  // rim
    const pmrem = new THREE.PMREMGenerator(renderer);
    const tex = pmrem.fromScene(env, 0.035).texture;
    pmrem.dispose();
    return tex;
  }

  function makeRibbon(r, o){
    const geo = new THREE.PlaneGeometry(o.length, o.width, o.segL, o.segW);
    const base = geo.attributes.position.array.slice();
    const mat = new THREE.MeshPhysicalMaterial({
      color: lin(o.color),
      metalness: o.metalness,
      roughness: o.roughness,
      clearcoat: 0.55,
      clearcoatRoughness: 0.32,
      side: THREE.DoubleSide,
      envMapIntensity: o.envIntensity
    });
    const mesh = new THREE.Mesh(geo, mat);
    const w = o.wave;
    function update(t){
      const pos = geo.attributes.position.array;
      for(let i = 0; i < pos.length; i += 3){
        const u = base[i], v = base[i + 1];
        const y  = w.a1 * Math.sin(u * w.f1 + t * w.s1 + w.p1) + w.a2 * Math.sin(u * w.f2 - t * w.s2 + w.p2);
        const z  = w.b1 * Math.cos(u * w.f3 + t * w.s3 + w.p3);
        const th = w.tw0 + w.tw * Math.sin(u * w.g + t * w.s4 + w.p4);
        pos[i]     = u;
        pos[i + 1] = y + v * Math.cos(th);
        pos[i + 2] = z + v * Math.sin(th);
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
    }
    return { mesh, update };
  }

  function randomWave(r, calm){
    const k = calm ? 0.6 : 1;
    return {
      a1: 2.5 + r() * 3.5, f1: 0.045 + r() * 0.05, s1: 0.5 + r() * 0.5, p1: r() * 6.28,
      a2: 0.6 + r() * 1.2, f2: 0.09 + r() * 0.07, s2: 0.3 + r() * 0.4, p2: r() * 6.28,
      b1: 3.0 + r() * 4.5, f3: 0.04 + r() * 0.05, s3: 0.4 + r() * 0.4, p3: r() * 6.28,
      tw: (1.1 + r() * 1.4) * k, g: 0.035 + r() * 0.05, s4: 0.3 + r() * 0.4, p4: r() * 6.28,
      tw0: r() * 1.2 - 0.6
    };
  }

  /**
   * DunixabRibbons(canvas, options) -> { size(w,h), render(t), renderer, camera, group }
   * options: seed, count, layout ('sweep' | 'layers' | 'hero'), tilt, zoom, pixelRatio, still, exposure
   */
  window.DunixabRibbons = function(canvas, opt){
    opt = Object.assign({ seed: 7, count: 4, layout: 'sweep', zoom: 1, still: false, exposure: 1.05 }, opt || {});
    const r = rng(opt.seed);

    const renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, preserveDrawingBuffer: !!opt.still, powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(opt.pixelRatio || Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = opt.exposure;
    renderer.setClearColor(INK, 1);

    const scene = new THREE.Scene();
    scene.environment = studioEnvironment(renderer);
    scene.fog = new THREE.Fog(lin(INK), 26, 64);

    const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 200);
    camera.position.set(0, 0, 34 / opt.zoom);

    const key = new THREE.DirectionalLight(0xcfe0ff, 1.1);
    key.position.set(8, 12, 10);
    scene.add(key);
    const rim = new THREE.PointLight(0x3b82f6, 2.2, 60);
    rim.position.set(-14, -6, -8);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0x0a2a6b, 0.35));

    const group = new THREE.Group();
    scene.add(group);
    const ribbons = [];

    if(opt.layout === 'layers'){
      // stacked folds, like layered fabric
      const wave = randomWave(r, true);
      wave.a1 *= 0.45;
      wave.b1 = 4.5 + r() * 2.5;
      wave.f3 = 0.09 + r() * 0.05;
      wave.tw0 = 1.15;   // lay the strips nearly flat so their crests catch the key light
      const color = PALETTE[Math.floor(r() * 3)];
      for(let k = 0; k < opt.count; k++){
        const rb = makeRibbon(r, {
          length: 80, width: 9, segL: 260, segW: 22, color,
          metalness: 0.6, roughness: 0.32, envIntensity: 1.6,
          wave: Object.assign({}, wave, { p1: wave.p1 + k * 0.4, p3: wave.p3 + k * 0.55 })
        });
        rb.mesh.position.set(0, (k - (opt.count - 1) / 2) * 3.4, -k * 0.6);
        group.add(rb.mesh);
        ribbons.push(rb);
      }
      group.rotation.x = -0.35;
    } else {
      for(let k = 0; k < opt.count; k++){
        const hero = k === 0;
        const rb = makeRibbon(r, {
          length: 100,
          width: hero ? 15 + r() * 8 : 6 + r() * 7,
          segL: 300, segW: 30,
          color: PALETTE[Math.floor(r() * PALETTE.length)],
          metalness: 0.55 + r() * 0.15,
          roughness: 0.3 + r() * 0.12,
          envIntensity: 1.4 + r() * 0.4,
          wave: randomWave(r, false)
        });
        rb.mesh.rotation.z = (r() - 0.5) * 1.4;
        rb.mesh.rotation.x = (r() - 0.5) * 0.6;
        rb.mesh.position.set((r() - 0.5) * 10, (r() - 0.5) * 14, -r() * 14 + (hero ? 4 : 0));
        group.add(rb.mesh);
        ribbons.push(rb);
      }
    }
    group.rotation.z = opt.tilt != null ? opt.tilt : (r() - 0.5) * 1.1;
    group.userData.rx = group.rotation.x;   // base tilt, so pointer parallax can add to it

    function size(w, h){
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // keep the ribbons filling narrow (portrait) frames too
      camera.position.z = (34 / opt.zoom) * (camera.aspect < 1 ? 0.62 + camera.aspect * 0.38 : 1);
      camera.updateProjectionMatrix();
    }
    function render(t){
      for(let i = 0; i < ribbons.length; i++) ribbons[i].update(t);
      renderer.render(scene, camera);
    }
    function dispose(){
      ribbons.forEach(rb => { rb.mesh.geometry.dispose(); rb.mesh.material.dispose(); });
      if(scene.environment) scene.environment.dispose();
      renderer.dispose();
    }
    return { size, render, dispose, renderer, camera, group, scene };
  };
})();
