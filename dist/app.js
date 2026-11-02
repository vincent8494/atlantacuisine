/* Small, deterministic interactions. Content stays visible without animation. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dishes = [
  {
    "name": "Beef biryani",
    "price": 500,
    "img": 3,
    "title": "Beef biryani, <em>fragrant rice,</em> rich spices",
    "desc": "Fragrant rice and tender beef. A generous plate for a satisfying lunch or dinner."
  },
  {
    "name": "Whole tilapia wet fry",
    "price": 500,
    "img": 10,
    "title": "Whole tilapia, <em>rich sauce,</em> full of flavour",
    "desc": "Whole fish in a rich tomato sauce. Find your favourite fish dish on our menu."
  },
  {
    "name": "Beef curry",
    "price": 400,
    "img": 13,
    "title": "Beef curry, <em>rich flavour,</em> a little warmth",
    "desc": "Rich, flavour-packed beef curry. A familiar favourite for an unhurried meal."
  },
  {
    "name": "¼ fried chicken & chips",
    "price": 450,
    "img": 15,
    "title": "Chicken & chips, <em>made for</em> good company",
    "desc": "Chicken and golden chips. Bring your appetite and pull up a chair."
  },
  {
    "name": "Chips masala",
    "price": 250,
    "img": 4,
    "title": "Chips masala, <em>a little spice,</em> a lot to love",
    "desc": "Golden chips tossed in masala. A favourite to share or enjoy all to yourself."
  },
  {
    "name": "5 chicken wings & fries",
    "price": 450,
    "img": 11,
    "title": "Chicken wings, <em>golden fries,</em> happy moments",
    "desc": "Five chicken wings with fries. Something delicious to gather around."
  },
  {
    "name": "Stir-fried beef",
    "price": 450,
    "img": 1,
    "title": "Stir-fried beef, <em>colourful,</em> full of flavour",
    "desc": "Stir-fried beef with vegetables. Explore a familiar favourite from our kitchen."
  },
  {
    "name": "Milkshake",
    "price": 350,
    "img": 14,
    "title": "Something sweet, <em>one more sip,</em> stay a while",
    "desc": "Make a little room for something sweet. A creamy milkshake to finish your meal."
  }
];
  const disc = $('#table-disc');
  const plates = $$('.plate');
  const spacing = 360 / dishes.length;
  let step = 0;
  let angle = 0;
  let drag = null;
  let rotationFrame = 0;
  let pendingAngle = null;
  let autoTimer = 0;
  let tableVisible = false;
  function scheduleSpin() {
    clearTimeout(autoTimer);
    if (!tableVisible || document.hidden || reduced.matches || drag) return;
    autoTimer = setTimeout(() => {
      if (document.documentElement.classList.contains('nav-is-open') || document.querySelector('dialog[open]')) {
        scheduleSpin();
        return;
      }
      showDish(step + 1);
    }, 5000);
  }
  new IntersectionObserver(entries => {
    tableVisible = entries[0].isIntersecting;
    scheduleSpin();
  }, {threshold: 0}).observe(disc);
  document.addEventListener('visibilitychange', scheduleSpin);
  reduced.addEventListener('change', scheduleSpin);
  function queueRotation(value) {
    pendingAngle = value;
    if(rotationFrame)return;
    rotationFrame=requestAnimationFrame(()=>{
      rotationFrame=0;
      rotation(pendingAngle);
      pendingAngle=null;
    });
  }
  function flushRotation() {
    if(!rotationFrame)return;
    cancelAnimationFrame(rotationFrame);
    rotationFrame=0;
    rotation(pendingAngle);
    pendingAngle=null;
  }
  const wrap = n => ((n % dishes.length) + dishes.length) % dishes.length;
  function animate(el, frames, options = {}) {
    if (reduced.matches || !el.animate) return;
    el.getAnimations().forEach(a => a.cancel());
    el.animate(frames, {duration:450,easing:'cubic-bezier(.2,.75,.25,1)',...options});
  }
  function rotation(value) {
    angle = value;
    disc.style.setProperty('--rotation',value+'deg');
    disc.style.setProperty('--counter-rotation',-value+'deg');
  }
  function renderedAngle() {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(disc).transform);
    const principal = Math.atan2(matrix.b,matrix.a)*180/Math.PI;
    return principal + 360*Math.round((angle-principal)/360);
  }
  function showDish(next, motion=true) {
    step=next;
    const index=wrap(step),dish=dishes[index];
    rotation(-step*spacing);
    $('#hero-title').innerHTML=dish.title;
    $('#hero-desc').textContent=dish.desc;
    $('#hero-price').textContent='KSh '+dish.price;
    disc.setAttribute('aria-valuenow',index);
    disc.setAttribute('aria-valuetext',dish.name+', dish '+(index+1)+' of '+dishes.length);
    plates.forEach((p,i)=>p.classList.toggle('active',i===index));
    scheduleSpin();
    if(motion)['#hero-title','#hero-desc','#hero-price'].forEach(s=>animate($(s),[{opacity:.3,transform:'translateY(8px)'},{opacity:1,transform:'none'}]));
  }
  function selectIndex(index) {
    let delta=index-wrap(step);
    if(delta>dishes.length/2)delta-=dishes.length;
    if(delta<-dishes.length/2)delta+=dishes.length;
    showDish(step+delta);
  }
  disc.addEventListener('keydown',e=>{
    if(['ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();showDish(step+1);}
    if(['ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();showDish(step-1);}
    if(e.key==='Home'){e.preventDefault();selectIndex(0);}
    if(e.key==='End'){e.preventDefault();selectIndex(dishes.length-1);}
  });
  // Wheel input is local to the circular table; scrolling elsewhere stays native.
  let wheelTotal=0;
  let wheelLast=0;
  let wheelNext=0;
  disc.addEventListener('wheel',e=>{
    if(e.ctrlKey || e.metaKey || drag)return;
    const rect=$('#table-wrap').getBoundingClientRect();
    const radius=rect.width/2;
    if(Math.hypot(e.clientX-rect.left-radius,e.clientY-rect.top-radius)>radius)return;
    const raw=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX;
    if(!raw)return;
    e.preventDefault();
    const now=performance.now();
    const delta=raw*(e.deltaMode===1?16:e.deltaMode===2?rect.height:1);
    if(now-wheelLast>180 || Math.sign(delta)!==Math.sign(wheelTotal))wheelTotal=0;
    wheelLast=now;
    if(now<wheelNext)return;
    wheelTotal+=delta;
    if(Math.abs(wheelTotal)>=45){
      showDish(step+Math.sign(wheelTotal));
      wheelTotal=0;
      wheelNext=now+400;
    }
  },{passive:false});
  const pointerAngle=(e,cx,cy)=>Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI;
  disc.addEventListener('pointerdown',e=>{
    if(e.button!==0 || !e.isPrimary)return;
    clearTimeout(autoTimer);
    wheelTotal=0;
    wheelNext=0;
    // Capture the on-screen angle, not the unfinished animation's destination.
    const current=renderedAngle();
    const rect=$('#table-wrap').getBoundingClientRect();
    const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,cx,cy,start:current,last:pointerAngle(e,cx,cy),touch:e.pointerType==='touch',axis:null,moved:false};
    disc.classList.add('dragging');
    rotation(current);
    disc.setPointerCapture(e.pointerId);
    if(e.pointerType!=='touch')e.preventDefault();
  });
  disc.addEventListener('pointermove',e=>{
    if(!drag || drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(drag.touch){
      // Wait for a deliberate horizontal gesture; vertical scrolling stays native.
      if(!drag.axis){
        if(Math.max(Math.abs(dx),Math.abs(dy))<8)return;
        drag.axis=Math.abs(dx)>Math.abs(dy)*1.2?'x':'y';
      }
      if(drag.axis!=='x')return;
      drag.moved=true;
      queueRotation(drag.start+dx*.35);
    }else{
      if(Math.hypot(dx,dy)>5)drag.moved=true;
      const next=pointerAngle(e,drag.cx,drag.cy);
      let delta=next-drag.last;
      if(delta>180)delta-=360;
      if(delta<-180)delta+=360;
      queueRotation((pendingAngle ?? angle)+delta);
      drag.last=next;
    }
  });
  function finishDrag(e,cancelled=false) {
    if(!drag || drag.id!==e.pointerId)return;
    flushRotation();
    const state=drag;
    drag=null;
    let next=Math.round(-angle/spacing);
    if(cancelled)next=Math.round(-state.start/spacing);
    else if(state.touch && state.axis==='x' && Math.abs(e.clientX-state.x)>35 && next===Math.round(-state.start/spacing))
      next+=e.clientX<state.x?1:-1;
    // Commit the final dragged frame before enabling the settling transition.
    void disc.offsetWidth;
    disc.classList.remove('dragging');
    if(disc.hasPointerCapture(e.pointerId))disc.releasePointerCapture(e.pointerId);
    showDish(next,state.moved&&!cancelled);
  }
  disc.addEventListener('pointerup',e=>finishDrag(e));
  disc.addEventListener('pointercancel',e=>finishDrag(e,true));
  disc.addEventListener('lostpointercapture',e=>finishDrag(e,true));
  showDish(0,false);

  const nav=$('#nav'), toggle=$('#menu-btn'), drawer=$('#nav-drawer');
  function setNav(open,restore=false) {
    nav.classList.toggle('open',open);
    document.documentElement.classList.toggle('nav-is-open',open);
    toggle.setAttribute('aria-expanded',open);
    toggle.setAttribute('aria-label',open?'Close menu':'Open menu');
    drawer.inert=!open;
    if(restore) toggle.focus();
  }
  setNav(false);
  toggle.addEventListener('click',()=>setNav(toggle.getAttribute('aria-expanded')!=='true'));
  $$('.nav-drawer a').forEach(a=>a.addEventListener('click',()=>setNav(false)));
  document.addEventListener('keydown',e=>{
    if(toggle.getAttribute('aria-expanded')!=='true') return;
    if(e.key==='Escape'){setNav(false,true);return;}
    if(e.key==='Tab'){
      const focusables=[toggle,...drawer.querySelectorAll('a')];
      if(e.shiftKey && document.activeElement===toggle){e.preventDefault();focusables.at(-1).focus();}
      else if(!e.shiftKey && document.activeElement===focusables.at(-1)){e.preventDefault();toggle.focus();}
    }
  });
  matchMedia('(min-width:901px)').addEventListener('change',e=>{if(e.matches)setNav(false);});
  const updateNav=()=>nav.classList.toggle('scrolled',scrollY>30);
  addEventListener('scroll',updateNav,{passive:true});updateNav();
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      animate(entry.target,[{opacity:.15,transform:'translateY(20px)'},{opacity:1,transform:'translateY(0)'}],{duration:750});
      observer.unobserve(entry.target);
    }),{threshold:.12});
    $$('.reveal,.stmt-text').forEach(el=>observer.observe(el));
  }
  $$('.anim-in').forEach((el,i)=>animate(el,[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{delay:i*70,duration:650,fill:'backwards'}));
  reduced.addEventListener('change',()=>{if(reduced.matches)document.getAnimations().forEach(a=>a.cancel());});
  // Supplied kitchen films: hover previews, with tap/keyboard playback too.
  const videoTiles=$$('.kitchen-video-tile');
  const hoverDevice=matchMedia('(hover:hover) and (pointer:fine)');
  const scrollPlayback = matchMedia('(max-width: 768px), (hover: none) and (pointer: coarse)');
  const previewActions = new Map();
  const photoViewer = $('.photo-viewer');
  let selectedPreview = null;
  function selectVisiblePreview() {
    let next = null;
    let bestDistance = Infinity;
    if (scrollPlayback.matches && !reduced.matches && !document.hidden && !photoViewer.open) {
      for (const tile of videoTiles) {
        const rect = tile.getBoundingClientRect();
        const visibleHeight = Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top);
        if (!rect.height || visibleHeight < Math.min(rect.height, innerHeight) * 0.5) continue;
        const distance = Math.abs(rect.top + rect.height / 2 - innerHeight / 2);
        if (distance < bestDistance) {
          next = tile;
          bestDistance = distance;
        }
      }
    }
    if (next === selectedPreview) return;
    if (selectedPreview) previewActions.get(selectedPreview).stop();
    selectedPreview = next;
    if (next) previewActions.get(next).play();
  }
  videoTiles.forEach(tile=>{
    const video=tile.querySelector('video');
    let wantsPlayback=false;
    let requestId=0;
    const update=()=>{
      const playing=!video.paused;
      tile.classList.toggle('is-playing',playing);
      tile.setAttribute('aria-pressed',playing);
      tile.setAttribute('aria-label',(playing?'Pause ':'Play ')+tile.dataset.title+' video');
    };
    const stop=()=>{requestId++;wantsPlayback=false;video.pause();update();};
    tile.addEventListener('stop-preview',stop);
    const play=async()=>{
      const id=++requestId;
      wantsPlayback=true;
      video.muted=true;
      videoTiles.forEach(other=>{if(other!==tile)other.dispatchEvent(new Event('stop-preview'));});
      try{await video.play();if(!wantsPlayback)video.pause();}catch{if(id===requestId)wantsPlayback=false;}
      update();
    };
    previewActions.set(tile,{play,stop});
    tile.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&hoverDevice.matches&&!scrollPlayback.matches&&!reduced.matches)play();});
    tile.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!scrollPlayback.matches)stop();});
    tile.addEventListener('click',()=>video.paused?play():stop());
    tile.addEventListener('focusout',()=>{if(!scrollPlayback.matches)stop();});
    video.addEventListener('play',update);
    video.addEventListener('pause',update);
    video.addEventListener('error',()=>{stop();tile.setAttribute('aria-label',tile.dataset.title+' video unavailable');});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    reduced.addEventListener('change',()=>{if(reduced.matches)stop();});
    if('IntersectionObserver' in window)new IntersectionObserver(entries=>{
      if(!entries[0].isIntersecting)stop();
    },{threshold:0}).observe(tile);
    update();
  });
  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(selectVisiblePreview, {
      threshold: Array.from({length: 21}, (_, i) => i / 20)
    });
    videoTiles.forEach(tile => visibility.observe(tile));
    document.addEventListener('visibilitychange', selectVisiblePreview);
    scrollPlayback.addEventListener('change', selectVisiblePreview);
    reduced.addEventListener('change', selectVisiblePreview);
    window.addEventListener('pageshow', selectVisiblePreview);
    photoViewer.addEventListener('close', selectVisiblePreview);
  }
  let photoOpener=null;
  $$('.moment-photo').forEach(card=>card.addEventListener('click',()=>{
    photoOpener=card;
    photoViewer.querySelector('img').src=card.dataset.photo;
    photoViewer.querySelector('img').alt=card.querySelector('img').alt;
    photoViewer.querySelector('figcaption').textContent=card.dataset.caption;
    videoTiles.forEach(tile=>tile.dispatchEvent(new Event('stop-preview')));
    photoViewer.showModal();
    selectedPreview=null;
    document.documentElement.classList.add('photo-is-open');
  }));
  $('.photo-close').addEventListener('click',()=>photoViewer.close());
  photoViewer.addEventListener('click',e=>{if(e.target===photoViewer)photoViewer.close();});
  photoViewer.addEventListener('close',()=>{
    document.documentElement.classList.remove('photo-is-open');
    photoOpener?.focus({preventScroll:true});
  });
  $('#year').textContent=new Date().getFullYear();
})();

// Wipe the frosted surface without moving content or intercepting page scrolling.
(() => {
  const panel = document.querySelector('.footer-glass');
  const photo = panel.querySelector('.glass-photo');
  const canvas = panel.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const mist = document.createElement('canvas');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let width=0,height=0,last=null,frame=0,points=[];
  let visible=false, drops=[], dripFrame=0, restoreTimer=0;
  function resetFog() {
    cancelAnimationFrame(frame);
    cancelAnimationFrame(dripFrame);
    clearTimeout(restoreTimer);
    frame=dripFrame=restoreTimer=0;
    points=[]; drops=[]; last=null; distanceToDrop=0;
    if (!width || !mist.width) return;
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(mist,0,0,width,height);
  }
  // Reapply a thin film periodically, including over older strokes while wiping.
  let lastWipe = 0;
  let distanceToDrop = 0;
  function condense() {
    if (performance.now() - lastWipe >= 32000) {
      resetFog();
      return;
    }
    ctx.globalAlpha = 0.031;
    ctx.drawImage(mist, 0, 0, width, height);
    ctx.globalAlpha = 1;
    restoreTimer = setTimeout(condense, 320);
  }

  function drip(now) {
    dripFrame = 0;
    ctx.save();
    for (const drop of drops) {
      const progress = Math.min(1, Math.max(0, (now - drop.start) / drop.duration));
      const nextY = drop.top + drop.length * progress ** 1.45;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineWidth = drop.size;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x, nextY);
      ctx.stroke();
      // A small bead collects at the tip of each narrow drainage channel.
      ctx.beginPath();
      ctx.ellipse(drop.x, nextY, drop.size * .75, drop.size * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(223,234,231,.35)';
      ctx.fillRect(drop.x - drop.size * .4, nextY, 0.8, 1.5);
      ctx.fillStyle = '#000';
      drop.y = nextY;
    }
    ctx.restore();
    drops = drops.filter(drop => now - drop.start < drop.duration);
    if (drops.length) dripFrame = requestAnimationFrame(drip);
  }

  function releaseDrop(point, radius, now) {
    const x = point.x + (Math.random() - .5) * radius;
    const top = point.y + Math.sqrt(radius ** 2 - (x - point.x) ** 2) * .92;
    drops.push({x, top, y: top, start: now, size: 1 + Math.random() * 1.6,
      length: radius * (.65 + Math.random() * 1.8), duration: 1300 + Math.random() * 2200});
    if (!dripFrame) dripFrame = requestAnimationFrame(drip);
  }
  function frost() {
    if (!photo.complete || !photo.naturalWidth) return;
    const rect=panel.getBoundingClientRect();
    if (width===rect.width && height===rect.height) return;
    width=rect.width;height=rect.height;
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);

    const scale=Math.max(width/photo.naturalWidth,height/photo.naturalHeight);
    const w=photo.naturalWidth*scale,h=photo.naturalHeight*scale;
    ctx.filter='blur(8px)';
    ctx.drawImage(photo,(width-w)/2,(height-h)*.55,w,h);
    ctx.filter='none';ctx.fillStyle='rgba(147,172,183,.27)';ctx.fillRect(0,0,width,height);
    mist.width=canvas.width;
    mist.height=canvas.height;
    mist.getContext('2d').drawImage(canvas,0,0);
    resetFog();
  }
  function wipe() {
    frame=0;
    ctx.globalCompositeOperation='destination-out';
    const radius=Math.max(34,Math.min(width * .052,96));
    for(const point of points){
      const from=last||point,dx=point.x-from.x,dy=point.y-from.y;
      const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/(radius*.3)));
      for(let i=0;i<=steps;i++){
        const x=from.x+dx*i/steps,y=from.y+dy*i/steps;
        const brush=ctx.createRadialGradient(x,y,radius*.92,x,y,radius);
        brush.addColorStop(0,'rgba(0,0,0,1)');brush.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=brush;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
      }
      distanceToDrop -= Math.hypot(dx,dy);
      if (!motion.matches && distanceToDrop <= 0) {
        releaseDrop(point,radius,performance.now());
        distanceToDrop = radius * (.6 + Math.random() * 1.7);
      }
      last=point;
    }
    points=[];ctx.globalCompositeOperation='source-over';
  }
  function trace(e){
    if(!visible || document.hidden || !width || e.target.closest('a,button'))return;
    if(e.pointerType==='touch' && !e.buttons)return;
    const rect=panel.getBoundingClientRect();
    const point={x:e.clientX-rect.left,y:e.clientY-rect.top};
    points.push(point);
    lastWipe = performance.now();
    if (!restoreTimer) restoreTimer = setTimeout(condense, 2600);
    if(!frame)frame=requestAnimationFrame(wipe);
  }
  panel.addEventListener('pointermove',trace,{passive:true});
  panel.addEventListener('pointerdown',e=>{last=null;trace(e)},{passive:true});
  ['pointerleave','pointerup','pointercancel'].forEach(name=>panel.addEventListener(name,()=>{if(frame){cancelAnimationFrame(frame);wipe()}last=null}));
  new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;
    resetFog();
  }).observe(panel);
  document.addEventListener('visibilitychange',resetFog);
  window.addEventListener('pageshow',resetFog);
  motion.addEventListener('change',resetFog);
  new ResizeObserver(frost).observe(panel);
  photo.addEventListener('load',()=>{width=0;frost()});
  frost();
})();

// Reserve the full wordmark width while revealing its letters in reading order.
(() => {
  const wordmark = document.querySelector('.foot-wordmark');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!wordmark || !('IntersectionObserver' in window)) return;

  const name = wordmark.textContent;
  const letters = [];
  const walker = document.createTreeWalker(wordmark, NodeFilter.SHOW_TEXT);
  const runs = [];
  while (walker.nextNode()) runs.push(walker.currentNode);
  for (const run of runs) {
    const fragment = document.createDocumentFragment();
    for (const character of run.data) {
      const span = document.createElement('span');
      span.textContent = character;
      span.style.visibility = 'hidden';
      fragment.append(span);
      letters.push(span);
    }
    run.replaceWith(fragment);
  }
  wordmark.setAttribute('role', 'img');
  wordmark.setAttribute('aria-label', name);
  let timer;
  let index = 0;
  let inView = false;
  function typeLetter() {
    letters[index++].style.visibility = 'visible';
    if (index < letters.length) timer = setTimeout(typeLetter, 165);
  }
  function restart() {
    clearTimeout(timer);
    index = 0;
    for (const letter of letters) {
      letter.style.visibility = motion.matches ? 'visible' : 'hidden';
    }
    if (inView && !document.hidden && !motion.matches) typeLetter();
  }
  const observer = new IntersectionObserver(([entry]) => {
    const visible = entry.intersectionRatio >= 0.4;
    if (visible === inView) return;
    inView = visible;
    restart();
  }, { threshold: 0.4 });
  document.addEventListener('visibilitychange', restart);
  motion.addEventListener('change', restart);
  window.addEventListener('pageshow', event => {
    if (event.persisted) restart();
  });
  restart();
  observer.observe(wordmark);
})();
