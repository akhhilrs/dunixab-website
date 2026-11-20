/* =========================================================
   Dunixab — shared site script (multi-page)
   ========================================================= */

/* ---------------- Old .html addresses show as clean ones (/about.html -> /about) ---------------- */
if(/\.html$/.test(location.pathname)) history.replaceState(null, '', location.pathname.replace(/(index)?\.html$/, '') + location.search + location.hash);

/* ---------------- Active nav link based on current page ---------------- */
(function setActiveNav(){
  const path = window.location.pathname.toLowerCase();
  let current = path.split('/').pop() || 'home';
  document.querySelectorAll('a[data-p]').forEach(a=>{
    const on = a.dataset.p.split(' ').includes(current);   // a menu item can stand for several pages
    a.classList.toggle('active', on);
    if(on) a.setAttribute('aria-current','page');
  });
})();

/* ---------------- Mobile menu ---------------- */
(function(){
  const menu = document.getElementById('menu');
  if(!menu) return;
  const openers = document.querySelectorAll('[data-menu-open]');
  const closer  = menu.querySelector('[data-menu-close]');
  function set(open){
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
    openers.forEach(b=>b.setAttribute('aria-expanded', String(open)));
    if(open && closer) closer.focus();
  }
  openers.forEach(b=>b.addEventListener('click',()=>set(true)));
  if(closer) closer.addEventListener('click',()=>set(false));
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>set(false)));
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && menu.classList.contains('open')) set(false); });
})();

/* ---------------- Sticky bar appears once the hero has scrolled away ---------------- */
(function(){
  const bar = document.getElementById('bar');
  const hero = document.querySelector('.hero');
  if(!bar || !hero) return;
  if(!('IntersectionObserver' in window)){ bar.classList.add('show'); return; }
  new IntersectionObserver(([en])=>{
    bar.classList.toggle('show', !en.isIntersecting);
  },{ rootMargin:'-80px 0px 0px 0px' }).observe(hero);
})();

/* ---------------- Reveal on scroll ---------------- */
(function(){
  const els=document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('in'));return;}
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      if(en.isIntersecting){en.target.classList.add('in');observer.unobserve(en.target);}
    });
  },{threshold:.12});
  els.forEach((el,i)=>{el.style.transitionDelay=(i%3*0.08)+'s';observer.observe(el);});
})();

/* ---------------- Fit giant wordmarks to their container width ---------------- */
(function(){
  const els = document.querySelectorAll('[data-fit]');
  if(!els.length) return;
  function fit(){
    els.forEach(el=>{
      const box = el.parentElement;
      const cs = getComputedStyle(box);
      const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if(avail <= 0) return; // not laid out yet (hidden tab/frame) — the resize handler retries
      el.style.fontSize = '100px';
      const r100 = el.getBoundingClientRect();
      if(!r100.width) return;
      let size = 100 * avail / r100.width;
      // in a hero, very short words (e.g. "404") would get taller than the screen — cap them
      const hero = el.closest('.hero');
      if(hero){
        // page heroes are 82svh with 440px of chrome around the word (see .hero.page-hero), so short words must fit the remainder
        const cap = hero.classList.contains('page-hero') ? Math.max(window.innerHeight * .82 - 440, window.innerHeight * .3) : window.innerHeight * .58;
        size = Math.min(size, cap / (r100.height / 100));
      }
      el.style.fontSize = size.toFixed(2) + 'px';
      // the hero lays out its tagline row above the wordmark using this height;
      // words with descenders (Policy, Story) are lifted so the tail clears the bottom strip
      if(hero){
        el.classList.toggle('desc', /[gjpqy]/.test(el.firstChild.textContent));   // visible word only, not the sr-only suffix
        const lift = parseFloat(getComputedStyle(el).marginBottom) || 0;
        hero.style.setProperty('--word-h', (el.getBoundingClientRect().height + lift).toFixed(1) + 'px');
      }
    });
  }
  fit();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  let t; window.addEventListener('resize',()=>{ clearTimeout(t); t=setTimeout(fit,120); });
})();

/* ---------------- Local time in Trivandrum ---------------- */
(function(){
  const els = document.querySelectorAll('[data-clock]');
  if(!els.length) return;
  // the visitor's own local time (no timeZone option), always as 02:15 AM / 04:45 PM, no zone name
  const fmt = new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
  function tick(){ const s = fmt.format(new Date()); els.forEach(e=>e.textContent=s); }
  tick(); setInterval(tick, 20000);
})();

/* ---------------- Ambient videos: play only while on screen, never with reduced motion; the corner button pauses ---------------- */
(function(){
  const vids = document.querySelectorAll('video[data-ambient]');
  if(!vids.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  vids.forEach(v=>{
    const b = v.parentElement.querySelector('.vid-toggle');
    let held = reduce;   // paused by the visitor (or by their reduced-motion setting)
    const show = ()=>{ if(!b) return; b.dataset.state = v.paused ? 'paused' : 'playing'; b.setAttribute('aria-label', v.paused ? 'Play video' : 'Pause video'); };
    v.addEventListener('play', show); v.addEventListener('pause', show);
    if(b) b.addEventListener('click', ()=>{ held = !v.paused; if(held) v.pause(); else v.play().catch(()=>{}); });
    if('IntersectionObserver' in window) new IntersectionObserver(([en])=>{ if(en.isIntersecting && !held) v.play().catch(()=>{}); else if(!en.isIntersecting) v.pause(); }).observe(v);
    else if(!held) v.play().catch(()=>{});
  });
})();

/* ---------------- Live glossy ribbons in the hero ---------------- */
(function(){
  const canvas = document.querySelector('.hero-canvas');
  if(!canvas || !window.THREE || !window.DunixabRibbons) return;
  const hero = canvas.parentElement;
  let scene;
  try{
    scene = DunixabRibbons(canvas,{ seed:+canvas.dataset.seed || 7, count:+canvas.dataset.count || 4 });
  }catch(err){ return; } // no WebGL — the still image behind it stays

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T0 = 2.0; // matches the frame used for the still fallback
  function resize(){ if(hero.clientWidth && hero.clientHeight) scene.size(hero.clientWidth, hero.clientHeight); }
  resize();
  window.addEventListener('resize', resize);

  let mx=0,my=0,tmx=0,tmy=0;
  window.addEventListener('pointermove',e=>{
    tmx = e.clientX/window.innerWidth - .5;
    tmy = e.clientY/window.innerHeight - .5;
  });

  let visible = true;
  if('IntersectionObserver' in window){
    new IntersectionObserver(([en])=>{ visible = en.isIntersecting; }).observe(hero);
  }

  scene.render(T0);
  canvas.classList.add('ready');
  if(reduce) return;

  const start = performance.now();
  (function loop(now){
    requestAnimationFrame(loop);
    if(!visible || document.hidden) return;
    mx += (tmx-mx)*.035; my += (tmy-my)*.035;
    scene.group.rotation.y = mx*.12;
    scene.group.rotation.x = (scene.group.userData.rx || 0) + my*.08;
    scene.render(T0 + (now-start)/1000*.16);
  })(start);
})();

/* ---------------- Popups: close only from their close button ---------------- */
// No closing from the dimmed backdrop or Esc (keydown is blocked too, or Chrome closes on a second Esc press).
document.querySelectorAll('dialog.modal').forEach(dlg=>{
  dlg.addEventListener('cancel', e=>e.preventDefault());
  dlg.addEventListener('keydown', e=>{ if(e.key === 'Escape') e.preventDefault(); });
});

/* ---------------- Open positions: application popup ---------------- */
// The form posts to FormSubmit (emails careers@dunixab.com, resume attached), which sends the visitor back here with ?applied=1.
(function(){
  const dlg = document.getElementById('apply');
  if(!dlg || typeof dlg.showModal !== 'function') return;   // no <dialog>: the role links fall back to email
  const form = dlg.querySelector('form'), done = dlg.querySelector('.modal-done'), f = form.elements;
  const btn = form.querySelector('[type=submit]'), MAX = 2 * 1024 * 1024;
  function show(sent){
    form.hidden = sent; done.hidden = !sent;
    dlg.showModal();
    document.documentElement.classList.add('modal-open');
  }
  document.querySelectorAll('[data-apply]').forEach(a=>a.addEventListener('click', e=>{
    e.preventDefault();
    const role = a.dataset.apply;
    f.role.value = role;
    f._subject.value = 'Job application: ' + role;
    document.getElementById('apply-title').textContent = role;
    show(false);
    f.name.focus();
  }));
  f.attachment.addEventListener('change', ()=>{
    const file = f.attachment.files[0], big = !!file && file.size > MAX;
    f.attachment.setCustomValidity(big ? 'Please choose a file of 2 MB or less.' : '');
    if(big) f.attachment.reportValidity();
  });
  form.addEventListener('submit', ()=>{
    f._next.value = location.origin + location.pathname + '?applied=1';   // come back to this page (also on localhost)
    btn.disabled = true;
  });
  addEventListener('pageshow', ()=>{ btn.disabled = false; });   // after the back button
  dlg.querySelectorAll('[data-apply-close]').forEach(b=>b.addEventListener('click', ()=>dlg.close()));
  dlg.addEventListener('close', ()=>document.documentElement.classList.remove('modal-open'));
  if(new URLSearchParams(location.search).has('applied')){
    history.replaceState(null, '', location.pathname + location.hash);
    show(true);
  }
})();

/* ---------------- Additional services: service details + quote popups ---------------- */
// The quote form posts to FormSubmit (emails connect@dunixab.com), which sends the visitor back here with ?quoted=1.
(function(){
  const quote = document.getElementById('quote');
  if(!quote || typeof quote.showModal !== 'function') return;   // no <dialog>: the quote buttons fall back to email
  const html = document.documentElement, form = quote.querySelector('form'), done = quote.querySelector('.modal-done');
  const f = form.elements, btn = form.querySelector('[type=submit]');
  function open(dlg){
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());   // a service popup hands over to the quote form
    dlg.showModal();
    html.classList.add('modal-open');
  }
  function openQuote(service, sent){
    form.hidden = sent; done.hidden = !sent;
    if(service) f.service.value = service;
    open(quote);
    if(!sent) f.name.focus();
  }
  document.querySelectorAll('[data-service]').forEach(a=>a.addEventListener('click', e=>{
    e.preventDefault();
    open(document.getElementById(a.dataset.service));
  }));
  document.querySelectorAll('[data-quote]').forEach(a=>a.addEventListener('click', e=>{
    e.preventDefault();
    openQuote(a.dataset.quote, false);
  }));
  document.querySelectorAll('dialog.modal').forEach(dlg=>{
    dlg.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', ()=>dlg.close()));
    dlg.addEventListener('close', ()=>{ if(!document.querySelector('dialog[open]')) html.classList.remove('modal-open'); });
  });
  form.addEventListener('submit', ()=>{
    f._subject.value = 'Quote request: ' + f.service.value;
    f._next.value = location.origin + location.pathname + '?quoted=1';   // come back to this page (also on localhost)
    btn.disabled = true;
  });
  addEventListener('pageshow', ()=>{ btn.disabled = false; });   // after the back button
  if(new URLSearchParams(location.search).has('quoted')){
    history.replaceState(null, '', location.pathname + location.hash);
    openQuote('', true);
  }
})();

/* ---------------- Partner with us popup (Home and Leadership) ---------------- */
// The form posts to FormSubmit (emails connect@dunixab.com), which sends the visitor back here with ?partnered=1.
(function(){
  const dlg = document.getElementById('partner');
  if(!dlg || typeof dlg.showModal !== 'function') return;   // no <dialog>: the buttons fall back to email
  const html = document.documentElement, form = dlg.querySelector('form'), done = dlg.querySelector('.modal-done');
  const f = form.elements, btn = form.querySelector('[type=submit]');
  function show(sent){
    form.hidden = sent; done.hidden = !sent;
    dlg.showModal();
    html.classList.add('modal-open');
    if(!sent) f.name.focus();
  }
  document.querySelectorAll('[data-partner]').forEach(a=>a.addEventListener('click', e=>{ e.preventDefault(); show(false); }));
  dlg.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', ()=>dlg.close()));
  dlg.addEventListener('close', ()=>html.classList.remove('modal-open'));
  form.addEventListener('submit', ()=>{
    f._subject.value = 'Partnership enquiry: ' + f.partnership.value;
    f._next.value = location.origin + location.pathname + '?partnered=1';   // come back to this page (also on localhost)
    btn.disabled = true;
  });
  addEventListener('pageshow', ()=>{ btn.disabled = false; });   // after the back button
  if(new URLSearchParams(location.search).has('partnered')){
    history.replaceState(null, '', location.pathname + location.hash);
    show(true);
  }
})();

/* ---------------- Offline page ---------------- */
// sw.js shows /offline.html when the visitor's connection drops (service workers run on https and localhost only)
if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
