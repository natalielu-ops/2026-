
/* ============================================================
   ScrollFloat 文字動畫引擎（快速版，參考 reactbits.dev/text-animations/scroll-float）
   改為 IntersectionObserver 觸發「一次」＋ CSS transition 完成進場，
   不再每個 scroll frame 讀寫 DOM，徹底避免 layout thrashing／卡頓。
   只用 opacity + translateY，無 blur/filter，0.3~0.5s 內完成。
   ============================================================ */
function wrapCharsFast(el){
  if(!el || el.dataset.ffWrapped) return null;
  el.dataset.ffWrapped = '1';
  const spans = [];
  function walk(node){
    [...node.childNodes].forEach(child=>{
      if(child.nodeType === 3){
        const text = child.textContent;
        if(!text) return;
        const frag = document.createDocumentFragment();
        [...text].forEach((ch,i)=>{
          const span = document.createElement('span');
          span.className = 'ff-char';
          span.textContent = ch === ' ' ? '\u00A0' : ch;
          span.style.transitionDelay = Math.min(spans.length*14, 220)+'ms';
          frag.appendChild(span);
          spans.push(span);
        });
        child.parentNode.replaceChild(frag, child);
      } else if(child.nodeType === 1 && child.tagName !== 'BR'){
        walk(child);
      }
    });
  }
  walk(el);
  return spans;
}

/* 標題／短文字：逐字快速浮現，進入視窗觸發一次 */
function revealCharsOnScroll(el){
  const spans = wrapCharsFast(el);
  if(!spans || !spans.length) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        spans.forEach(s=> s.classList.add('in'));
        io.unobserve(el);
      }
    });
  }, { threshold:.2, rootMargin:'0px 0px -10% 0px' });
  io.observe(el);
}

/* 段落／多行文字：整組一起觸發，行與行之間短延遲堆疊（0/80/160/240ms），
   整段控制在 0.6~0.8 秒內完成，不會卡住下一頁 */
function revealLinesOnScroll(triggerEl, lineEls, opts){
  const step = (opts && opts.step) || 60;
  const maxDelay = (opts && opts.maxDelay) || 320;
  lineEls.forEach((el,i)=>{
    if(!el) return;
    el.classList.add('ff-line');
    el.style.transitionDelay = Math.min(i*step, maxDelay)+'ms';
  });
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        lineEls.forEach(el=> el && el.classList.add('in'));
        io.unobserve(triggerEl);
      }
    });
  }, { threshold:.15, rootMargin:'0px 0px -8% 0px' });
  io.observe(triggerEl);
}

/* 單一元素版本（沿用同一套 CSS class，delay 固定 0） */
function revealSingleOnScroll(el){
  if(!el) return;
  revealLinesOnScroll(el, [el], { step:0 });
}

/* 使用者互動後才出現的文字（測驗回饋、約會回應）：不用等 scroll，立刻進場 */
function revealNow(el){
  if(!el) return;
  el.classList.add('ff-line');
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=> el.classList.add('in'));
  });
}

/* ============================================================
   INIT TEXT
   ============================================================ */
document.getElementById('mTarget').textContent = CONTENT.boyfriendFull;
document.getElementById('mFrom').textContent = CONTENT.girlfriendName;

/* ---------- 編輯模式判斷：只有網址加上 ?edit=1 才會啟用，一般訪客完全看不到、用不到 ---------- */
const EDIT_MODE = new URLSearchParams(window.location.search).get('edit') === '1';
if(EDIT_MODE) document.body.classList.add('edit-mode');

/* ---------- timeline ---------- */
const tlEl = document.getElementById('timeline');
CONTENT.timeline.forEach(item=>{
  const div = document.createElement('div');
  div.className = 'tl-item reveal';
  div.innerHTML = `<div class="tl-dot"></div><span class="tl-tag">${item.tag}</span>${item.lines.map(l=>`<p>${l}</p>`).join('')}`;
  tlEl.appendChild(div);
});

/* ---------- photo wall ---------- */
const photoWall = document.getElementById('photoWall');

function applyCardTransform(card){
  const tx = parseFloat(card.dataset.tx) || 0;
  const ty = parseFloat(card.dataset.ty) || 0;
  const rot = parseFloat(card.dataset.rot) || 0;
  const scale = parseFloat(card.dataset.scale) || 1;
  card.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg) scale(${scale})`;
}

IMAGES.forEach((img,i)=>{
  const defaultRot = (i%2===0? -1:1) * (2 + (i%3));
  /* 若 PHOTO_LAYOUT 有這張照片的已儲存版面設定，套用它；否則用預設散落角度 */
  const saved = (typeof PHOTO_LAYOUT !== 'undefined' && PHOTO_LAYOUT[i]) ? PHOTO_LAYOUT[i] : null;
  const card = document.createElement('div');
  card.className = 'polaroid reveal';
  if(i === IMAGES.length - 1) card.classList.add('featured'); /* 最後一張：現在的我們，放大呈現 */
  card.dataset.index = i;
  card.dataset.rot = saved && typeof saved.rot === 'number' ? saved.rot : defaultRot;
  card.dataset.tx = saved && typeof saved.tx === 'number' ? saved.tx : 0;
  card.dataset.ty = saved && typeof saved.ty === 'number' ? saved.ty : 0;
  card.dataset.scale = saved && typeof saved.scale === 'number' ? saved.scale : 1;
  applyCardTransform(card);
  /* 直式照片人臉多半在上半部，橫式照片人臉較居中，避免裁切到臉 */
  const objPos = img.orient === 'landscape' ? 'center 42%' : 'center 24%';
  card.innerHTML = `
    <div class="ph">
      <img src="${img.src}" alt="${img.title}" style="object-position:${objPos};" onerror="this.style.display='none'; this.parentElement.textContent='照片載入失敗';">
      <div class="zoom-badge">🔍</div>
    </div>
    <div class="cap-wrap">
      <div class="p-title">${img.title}</div>
      <div class="cap ${img.funny?'rejected':''}">${img.caption}</div>
      ${img.funny ? `<div class="cap overruled">申請駁回。😂</div>` : ``}
    </div>
  `;
  const phEl = card.querySelector('.ph');
  phEl.addEventListener('click', (e)=>{ e.stopPropagation(); openLightbox(img.src); });
  if(img.funny){
    /* 進入畫面後延遲 1 秒自動翻牌，之後仍可點擊切換 */
    card.querySelector('.cap-wrap').addEventListener('click', ()=> card.classList.toggle('flipped'));
    const autoFlipIO = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          setTimeout(()=> card.classList.add('flipped'), 1000);
          autoFlipIO.unobserve(card);
        }
      });
    }, { threshold:.4 });
    autoFlipIO.observe(card);
  }

  /* 編輯模式專用：旋轉／縮放小工具，一般訪客完全不會看到這些按鈕 */
  if(EDIT_MODE){
    const tools = document.createElement('div');
    tools.className = 'edit-tools';
    tools.innerHTML = `
      <button type="button" data-act="rot-l" title="逆時針旋轉">↺</button>
      <button type="button" data-act="rot-r" title="順時針旋轉">↻</button>
      <button type="button" data-act="scale-d" title="縮小">－</button>
      <button type="button" data-act="scale-u" title="放大">＋</button>
    `;
    tools.addEventListener('pointerdown', e=> e.stopPropagation());
    tools.addEventListener('click', (e)=>{
      const btn = e.target.closest('button');
      if(!btn) return;
      let rot = parseFloat(card.dataset.rot) || 0;
      let scale = parseFloat(card.dataset.scale) || 1;
      if(btn.dataset.act === 'rot-l') rot -= 5;
      if(btn.dataset.act === 'rot-r') rot += 5;
      if(btn.dataset.act === 'scale-d') scale = Math.max(0.6, +(scale - 0.05).toFixed(2));
      if(btn.dataset.act === 'scale-u') scale = Math.min(1.6, +(scale + 0.05).toFixed(2));
      card.dataset.rot = rot;
      card.dataset.scale = scale;
      applyCardTransform(card);
    });
    card.appendChild(tools);
  }

  photoWall.appendChild(card);
});

/* ---------- 可拖拉拍立得（僅編輯模式啟用，Pointer Events，桌機／手機共用同一套邏輯） ---------- */
if(EDIT_MODE){
(function initDraggablePolaroids(){
  const memoriesSection = document.getElementById('memories');
  const dragHint = document.getElementById('dragHint');
  let topZ = 10;
  let hintDismissed = false;
  let drag = null; // 同一時間只會有一張照片在拖曳

  function dismissHint(){
    if(hintDismissed) return;
    hintDismissed = true;
    if(dragHint) dragHint.classList.add('hide');
  }

  function clamp(v, min, max){ return Math.min(max, Math.max(min, v)); }

  function onPointerDown(e, card){
    if(e.pointerType === 'mouse' && e.button !== 0) return; /* 只用滑鼠左鍵 */
    const rect = memoriesSection.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const curTx = parseFloat(card.dataset.tx) || 0;
    const curTy = parseFloat(card.dataset.ty) || 0;
    drag = {
      pointerId: e.pointerId,
      card,
      startX: e.clientX,
      startY: e.clientY,
      baseTx: curTx,
      baseTy: curTy,
      naturalLeft: (cardRect.left - rect.left) - curTx,
      naturalTop: (cardRect.top - rect.top) - curTy,
      cardW: cardRect.width,
      cardH: cardRect.height,
      sectionW: rect.width,
      sectionH: rect.height,
      rot: parseFloat(card.dataset.rot) || 0,
      scale: parseFloat(card.dataset.scale) || 1,
      started: false,
      rafScheduled: false,
      pendingTx: curTx,
      pendingTy: curTy,
    };
  }

  function applyDragFrame(){
    if(!drag) return;
    drag.rafScheduled = false;
    drag.card.style.transform = `translate3d(${drag.pendingTx}px, ${drag.pendingTy}px, 0) rotate(0deg) scale(${(drag.scale*1.05).toFixed(3)})`;
  }

  function onPointerMove(e){
    if(!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if(!drag.started){
      if(Math.hypot(dx, dy) < 5) return; /* 移動距離太小，視為單純點擊，交給原本的點擊事件處理 */
      drag.started = true;
      drag.card.setPointerCapture(drag.pointerId);
      drag.card.classList.remove('settling');
      drag.card.classList.add('dragging');
      drag.card.style.zIndex = ++topZ;
      dismissHint();
    }

    const margin = drag.cardW * 0.45;
    let tx = drag.baseTx + dx;
    let ty = drag.baseTy + dy;
    tx = clamp(tx, -margin - drag.naturalLeft, drag.sectionW - drag.cardW + margin - drag.naturalLeft);
    ty = clamp(ty, -margin - drag.naturalTop, drag.sectionH - drag.cardH + margin - drag.naturalTop);
    drag.pendingTx = tx;
    drag.pendingTy = ty;
    if(!drag.rafScheduled){
      drag.rafScheduled = true;
      requestAnimationFrame(applyDragFrame);
    }
  }

  function endDrag(e){
    if(!drag || e.pointerId !== drag.pointerId) return;
    const { card, started, pendingTx, pendingTy, rot, scale } = drag;
    if(started){
      card.dataset.tx = pendingTx;
      card.dataset.ty = pendingTy;
      card.classList.remove('dragging');
      card.classList.add('settling');
      card.style.transform = `translate3d(${pendingTx}px, ${pendingTy}px, 0) rotate(${rot}deg) scale(${scale})`;
      setTimeout(()=> card.classList.remove('settling'), 320);
      try{ card.releasePointerCapture(drag.pointerId); }catch(err){}
    }
    drag = null;
  }

  document.querySelectorAll('.polaroid').forEach(card=>{
    card.addEventListener('pointerdown', (e)=>{
      if(e.target.closest('.edit-tools')) return; /* 點到旋轉/縮放按鈕不觸發拖曳 */
      onPointerDown(e, card);
    });
  });
  document.addEventListener('pointermove', onPointerMove, { passive:true });
  document.addEventListener('pointerup', endDrag, { passive:true });
  document.addEventListener('pointercancel', endDrag, { passive:true });
})();
}

/* ---------- 編輯模式提示列＋儲存版面（只有 ?edit=1 才會建立這些 DOM，一般訪客完全看不到） ---------- */
if(EDIT_MODE){
  const banner = document.createElement('div');
  banner.id = 'editBanner';
  banner.innerHTML = `
    <span>✏️ 編輯模式 — 只有你自己看得到，可拖曳／旋轉／縮放照片</span>
    <button type="button" id="saveLayoutBtn">儲存版面</button>
  `;
  document.body.appendChild(banner);

  function exportLayout(){
    const layout = {};
    document.querySelectorAll('.polaroid').forEach(card=>{
      const idx = card.dataset.index;
      layout[idx] = {
        tx: Math.round(parseFloat(card.dataset.tx) || 0),
        ty: Math.round(parseFloat(card.dataset.ty) || 0),
        rot: Math.round((parseFloat(card.dataset.rot) || 0) * 10) / 10,
        scale: Math.round((parseFloat(card.dataset.scale) || 1) * 100) / 100,
      };
    });
    const code = 'const PHOTO_LAYOUT = ' + JSON.stringify(layout, null, 2) + ';\n';

    const overlay = document.createElement('div');
    overlay.id = 'layoutExportOverlay';
    overlay.innerHTML = `
      <div class="leo-card">
        <div class="leo-title">版面設定已產生 ✨</div>
        <div class="leo-hint">複製下方內容，貼到 <code>js/content.js</code> 裡取代原本的
          <code>const PHOTO_LAYOUT = {};</code>，存檔後重新部署到 Netlify 即可正式套用。</div>
        <textarea id="leoText" readonly></textarea>
        <div class="leo-btns">
          <button type="button" id="leoCopy">複製內容</button>
          <button type="button" id="leoDownload">下載檔案</button>
          <button type="button" id="leoClose">關閉</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const ta = overlay.querySelector('#leoText');
    ta.value = code;
    overlay.querySelector('#leoCopy').addEventListener('click', ()=>{
      ta.select();
      navigator.clipboard && navigator.clipboard.writeText(code).catch(()=>{});
      document.execCommand && document.execCommand('copy');
    });
    overlay.querySelector('#leoDownload').addEventListener('click', ()=>{
      const blob = new Blob([code], { type:'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'photo-layout.js';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });
    overlay.querySelector('#leoClose').addEventListener('click', ()=> overlay.remove());
  }

  document.getElementById('saveLayoutBtn').addEventListener('click', exportLayout);
}

/* ---------- lightbox ---------- */
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
function openLightbox(src){
  lightboxImg.src = src;
  lightbox.classList.add('show');
}
function closeLightbox(){ lightbox.classList.remove('show'); }
document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e)=>{ if(e.target === lightbox) closeLightbox(); });

/* ---------- quiz ---------- */
const quizArea = document.getElementById('quizArea');
const quizProgress = document.getElementById('quizProgress');
const badgesEl = document.getElementById('badges');
let quizIndex = 0;

CONTENT.quiz.forEach(()=>{
  const dot = document.createElement('div');
  dot.className = 'dot';
  quizProgress.appendChild(dot);
});

function renderQuiz(i){
  quizArea.innerHTML = '';
  if(i >= CONTENT.quiz.length){
    document.getElementById('quizDoneMsg').style.display = 'block';
    return;
  }
  const q = CONTENT.quiz[i];
  const card = document.createElement('div');
  card.className = 'quiz-card';
  card.innerHTML = `<div class="quiz-q">${q.q}</div>` +
    q.options.map((o,idx)=>`<button class="quiz-opt" data-idx="${idx}">${String.fromCharCode(65+idx)}. ${o.t}</button>`).join('') +
    `<div class="quiz-feedback"></div>`;
  quizArea.appendChild(card);
  revealNow(card.querySelector('.quiz-q'));

  const fb = card.querySelector('.quiz-feedback');
  const opts = card.querySelectorAll('.quiz-opt');
  opts.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = +btn.dataset.idx;
      const o = q.options[idx];
      opts.forEach(b=>b.disabled = true);
      if(o.correct){
        btn.classList.add('correct');
        opts.forEach(b=>{ if(b!==btn) b.classList.add('wrong'); });
      } else {
        btn.classList.add('wrong');
      }
      fb.textContent = o.fb;
      revealNow(fb);
      if(o.correct){
        quizProgress.children[i].classList.add('done');
        const b = document.createElement('div');
        b.className = 'badge';
        b.textContent = q.badge;
        badgesEl.appendChild(b);
        requestAnimationFrame(()=> b.classList.add('show'));
        const next = document.createElement('button');
        next.className = 'quiz-next';
        next.textContent = i === CONTENT.quiz.length-1 ? '完成測驗' : '下一題';
        next.addEventListener('click', ()=>{ quizIndex++; renderQuiz(quizIndex); });
        card.appendChild(next);
      } else {
        const retry = document.createElement('button');
        retry.className = 'quiz-next';
        retry.textContent = '再試一次';
        retry.addEventListener('click', ()=> renderQuiz(i));
        card.appendChild(retry);
      }
    });
  });
}
renderQuiz(0);

/* ---------- our way sequential lines ---------- */
const lineSeq = document.getElementById('lineSeq');
const lineFinalEl = document.getElementById('lineFinal');
CONTENT.ourWayLines.forEach(l=>{
  const p = document.createElement('p');
  p.textContent = l;
  lineSeq.appendChild(p);
});

/* ---------- final lines ---------- */
const finalLines = document.getElementById('finalLines');
CONTENT.finalLines.forEach(l=>{
  const p = document.createElement('p');
  if(l.startsWith('__EMPH__')){
    p.textContent = l.replace('__EMPH__','');
    p.classList.add('final-emph');
  } else {
    p.textContent = l;
  }
  finalLines.appendChild(p);
});

/* ============================================================
   DATE PLANNER LOGIC
   ============================================================ */
const state = { dinner:null, dinnerCustom:'', activity:null, confirmed:false };

function buildOptGrid(gridEl, options, onPick){
  gridEl.innerHTML = '';
  options.forEach(o=>{
    const card = document.createElement('div');
    card.className = 'opt-card reveal in';
    card.dataset.id = o.id;
    card.innerHTML = `<div class="check-mark">✓</div><div class="emoji">${o.emoji}</div><div class="t">${o.t}</div><div class="s">${o.s}</div>`;
    card.addEventListener('click', ()=> onPick(o, card));
    gridEl.appendChild(card);
  });
}

const dinnerGrid = document.getElementById('dinnerGrid');
const dinnerResponse = document.getElementById('dinnerResponse');
buildOptGrid(dinnerGrid, CONTENT.dinnerOptions, (o, card)=>{
  state.dinner = o;
  if(o.id !== 'other'){ state.dinnerCustom = ''; }
  [...dinnerGrid.children].forEach(c=>{
    c.classList.remove('selected'); c.classList.add('dim');
  });
  card.classList.add('selected'); card.classList.remove('dim');

  let html = `<div class="tag">${o.tag}</div><p>${o.body}</p>`;
  if(o.id === 'other'){
    html += `<div class="custom-input-wrap">
      <input type="text" id="customDinnerInput" maxlength="24" placeholder="填空：我想吃＿＿＿" value="${state.dinnerCustom}">
      <div class="custom-hint">你填的內容會同步出現在下面的約會方案卡片上</div>
    </div>`;
  }
  dinnerResponse.innerHTML = html;
  revealNow(dinnerResponse.querySelector('.tag'));
  revealNow(dinnerResponse.querySelector('p'));

  if(o.id === 'other'){
    const input = document.getElementById('customDinnerInput');
    input.addEventListener('input', (e)=>{
      state.dinnerCustom = e.target.value;
      updateDateCard();
    });
    input.focus();
    revealNow(dinnerResponse.querySelector('.custom-hint'));
  }

  spawnHearts(4);
  updateDateCard();
  document.getElementById('activity').style.display = 'block';
  setTimeout(()=> document.getElementById('activity').scrollIntoView({behavior:'smooth', block:'start'}), 500);
});

const activityGrid = document.getElementById('activityGrid');
const activityResponse = document.getElementById('activityResponse');
buildOptGrid(activityGrid, CONTENT.activityOptions, (o, card)=>{
  state.activity = o;
  [...activityGrid.children].forEach(c=>{
    c.classList.remove('selected'); c.classList.add('dim');
  });
  card.classList.add('selected'); card.classList.remove('dim');
  activityResponse.innerHTML = `<div class="tag">${o.tag}</div><p>${o.body}</p>`;
  revealNow(activityResponse.querySelector('.tag'));
  revealNow(activityResponse.querySelector('p'));
  spawnHearts(4);
  updateDateCard();
  setTimeout(()=> document.getElementById('generate').scrollIntoView({behavior:'smooth', block:'start'}), 700);
});

function updateDateCard(){
  document.getElementById('dcDate').textContent = `${CONTENT.qixiDate}｜七夕`;
  let dinnerText = '－';
  if(state.dinner){
    if(state.dinner.id === 'other'){
      dinnerText = state.dinnerCustom && state.dinnerCustom.trim() ? state.dinnerCustom.trim() : '＿＿＿＿';
    } else {
      dinnerText = state.dinner.t;
    }
  }
  document.getElementById('dcDinner').textContent = dinnerText;
  document.getElementById('dcActivity').textContent = state.activity ? state.activity.t : '－';
  document.getElementById('dcWho').textContent = '我';
}
updateDateCard();

/* confirm date */
document.getElementById('confirmBtn').addEventListener('click', ()=>{
  if(!state.dinner || !state.activity){
    alert('先選好晚餐跟吃完要做什麼，才能生成專屬約會方案唷 🍶🌙');
    return;
  }
  state.confirmed = true;
  updateDateCard();
  const card = document.getElementById('dateCard');
  card.classList.add('burst');
  spawnHearts(16);
  const finalBtn = document.getElementById('finalBtn');
  finalBtn.textContent = '【約會任務：CONFIRMED ✓】';
  finalBtn.classList.add('confirmed');
  setTimeout(()=> document.getElementById('final').scrollIntoView({behavior:'smooth', block:'start'}), 900);
});

document.getElementById('finalBtn').addEventListener('click', ()=>{
  if(!state.confirmed){
    document.getElementById('generate').scrollIntoView({behavior:'smooth'});
    return;
  }
  spawnHearts(10);
});

/* ============================================================
   FX: hearts + shooting stars
   ============================================================ */
function spawnHearts(n){
  const layer = document.getElementById('heartsFx');
  const hearts = ['❤️','💕','✨','💗'];
  for(let i=0;i<n;i++){
    const el = document.createElement('div');
    el.className = 'heart-p';
    el.textContent = hearts[Math.floor(Math.random()*hearts.length)];
    el.style.left = (10 + Math.random()*80) + 'vw';
    el.style.animationDelay = (Math.random()*.5)+'s';
    el.style.fontSize = (1 + Math.random()*1.2)+'rem';
    layer.appendChild(el);
    setTimeout(()=> el.remove(), 3000);
  }
}

/* 附圖本身已經有星光，這裡在開場／回憶牆額外點綴會動的星星＋流星 */
function makeStars(containerId, count){
  const el = document.getElementById(containerId);
  if(!el) return;
  for(let i=0;i<count;i++){
    const s = document.createElement('div');
    const isFlicker = Math.random() < 0.28;
    s.className = 'star' + (isFlicker ? ' flicker' : '');
    const sizeRoll = Math.random();
    const size = sizeRoll > 0.88 ? (3 + Math.random()*1.5) : (1 + Math.random()*1.8);
    s.style.width = size+'px';
    s.style.height = size+'px';
    s.style.top = Math.random()*100+'%';
    s.style.left = Math.random()*100+'%';
    s.style.setProperty('--peak', (0.55 + Math.random()*0.45).toFixed(2));
    s.style.animationDelay = (Math.random()*6)+'s';
    s.style.animationDuration = isFlicker
      ? (3 + Math.random()*2.5)+'s'
      : (3.5 + Math.random()*3.5)+'s';
    el.appendChild(s);
  }
}
makeStars('starsOpening', 34);
makeStars('starsMemories', 26);

function shoot(containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  const s = document.createElement('div');
  s.className = 'shooting-star';
  s.style.top = (Math.random()*30)+'%';
  s.style.left = (60+Math.random()*30)+'%';
  const ang = (Math.random()*16 - 8).toFixed(1);
  const dist = 220 + Math.random()*120;
  s.style.setProperty('--ang', ang+'deg');
  s.style.setProperty('--tx', (-dist)+'px');
  s.style.setProperty('--ty', (dist*0.62 + Math.random()*40)+'px');
  el.appendChild(s);
  setTimeout(()=> s.remove(), 1600);
}
/* 流星偶爾出現，不要一直出現：用隨機間隔而非固定頻率（約 4~10 秒） */
function scheduleShoot(containerId, minMs, maxMs){
  setTimeout(()=>{
    shoot(containerId);
    scheduleShoot(containerId, minMs, maxMs);
  }, minMs + Math.random()*(maxMs-minMs));
}
scheduleShoot('starsOpening', 4000, 10000);
scheduleShoot('starsMemories', 4000, 10000);

/* ============================================================
   SCROLL REVEAL（一般內容容器：卡片、時間軸項目本身等）
   ============================================================ */
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: .15, rootMargin:'0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach(el=> io.observe(el));

/* Our Way：每一句進入視窗時，整段快速依序浮現（0/60/120...ms），
   整段控制在 0.6~0.8 秒完成，不卡下一頁 */
revealLinesOnScroll(
  document.getElementById('ourway'),
  [...lineSeq.children, lineFinalEl],
  { step:60, maxDelay:320 }
);

/* 結尾告白：同樣一次觸發、快速依序浮現 */
revealLinesOnScroll(
  document.getElementById('final'),
  [...finalLines.children],
  { step:60, maxDelay:320 }
);

/* ============================================================
   ScrollFloat 全站文字動畫初始化（快速版）
   標題：逐字浮現；一般段落：整行浮現，皆一次觸發、0.3~0.5s 完成
   ============================================================ */
document.querySelectorAll('.eyebrow, .title-lg, .title-md')
  .forEach(revealCharsOnScroll);
document.querySelectorAll('.soft-line, .mission-list, .tl-final, .quiz-done-msg, .final-signoff')
  .forEach(revealSingleOnScroll);
document.querySelectorAll('.tl-item').forEach(item=>{
  revealLinesOnScroll(item, [...item.querySelectorAll('p')], { step:50, maxDelay:200 });
});


/* ============================================================
   粉紫雲海背景：明顯但浪漫的星星閃爍＋隨機流星
   ============================================================ */
function makeCosmicStars(count){
  const el = document.getElementById('cosmicStars');
  for(let i=0;i<count;i++){
    const s = document.createElement('div');
    /* 約三分之一星星用「快速閃一下」的變化款，其餘用緩慢呼吸款，避免規律感 */
    const isFlicker = Math.random() < 0.28;
    s.className = 'star' + (isFlicker ? ' flicker' : '');
    /* 大小不一：多數是小星星，少數偏大更明顯 */
    const sizeRoll = Math.random();
    const size = sizeRoll > 0.88 ? (3 + Math.random()*1.6) : (1 + Math.random()*2);
    s.style.width = size+'px';
    s.style.height = size+'px';
    s.style.top = Math.random()*100+'%';
    s.style.left = Math.random()*100+'%';
    /* 亮度不一 */
    s.style.setProperty('--peak', (0.55 + Math.random()*0.45).toFixed(2));
    /* 不規則閃爍：每顆星星隨機延遲＋不同的呼吸節奏，不會一起亮 */
    s.style.animationDelay = (Math.random()*7)+'s';
    s.style.animationDuration = isFlicker
      ? (3 + Math.random()*3)+'s'
      : (4 + Math.random()*4.5)+'s';
    el.appendChild(s);
  }
}
makeCosmicStars(70);

function shootCosmic(){
  const el = document.getElementById('cosmicStars');
  const s = document.createElement('div');
  s.className = 'shooting-star';
  /* 從右上／上方滑過，避開版面中央的文字區域 */
  s.style.top = (Math.random()*20)+'%';
  s.style.left = (55+Math.random()*40)+'%';
  /* 方向有些微隨機變化，不是每次都同一個角度 */
  const ang = (Math.random()*16 - 8).toFixed(1);
  const dist = 260 + Math.random()*140;
  s.style.setProperty('--ang', ang+'deg');
  s.style.setProperty('--tx', (-dist)+'px');
  s.style.setProperty('--ty', (dist*0.62 + Math.random()*40)+'px');
  el.appendChild(s);
  setTimeout(()=> s.remove(), 1600);
}
/* 出現間隔隨機（約 4~10 秒），不要固定節奏 */
function scheduleCosmicShoot(){
  setTimeout(()=>{
    shootCosmic();
    scheduleCosmicShoot();
  }, 4000 + Math.random()*6000);
}
scheduleCosmicShoot();

const cosmicImg = document.getElementById('cosmicImg');
/* 單一連續長鏡頭：只用 scale 做非常緩慢的靠近雲朵，不做左右位移，
   全站從第一頁到最後一頁是同一組漸進數值，不會有「每頁跳一次」的感覺 */
function updateParallax(){
  const scrollY = window.scrollY;
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docH > 0 ? Math.min(1, scrollY / docH) : 0;
  const scale = 1 + progress * 0.16; /* 1 → 約 1.16，非常柔和 */
  cosmicImg.style.transform = `scale(${scale.toFixed(4)})`;
}

/* ============================================================
   背景層獨立的 rAF 迴圈（節流），與文字動畫完全分離：
   背景只寫 #cosmicImg 的 transform，文字動畫只在各自的
   IntersectionObserver 觸發時才動作，兩者互不影響、互不重render
   ============================================================ */
let ticking = false;
function onScrollFrame(){
  updateParallax();
  ticking = false;
}
function requestTick(){
  if(!ticking){
    requestAnimationFrame(onScrollFrame);
    ticking = true;
  }
}
window.addEventListener('scroll', requestTick, { passive:true });
window.addEventListener('resize', requestTick);
requestTick();
onScrollFrame();

/* ============================================================
   SPOTIFY 背景音樂 — 官方 Spotify IFrame API
   規則：預設不強制播放；「開始任務」按鈕是使用者第一次互動入口，
   點擊時會嘗試呼叫官方 controller.play()，但瀏覽器 autoplay 政策
   仍可能擋下，因此永遠保留可見、可直接按下播放的官方 Spotify 小型嵌入
   播放器（非隱藏、非自製 UI）作為備援
   ============================================================ */
let spotifyController = null;

window.onSpotifyIframeApiReady = (IFrameAPI) => {
  const element = document.getElementById('spotify-embed-container');
  const options = {
    uri: 'spotify:track:' + CONTENT.spotifyTrackId,
    width: '100%',
    height: '152',
  };
  IFrameAPI.createController(element, options, (controller) => {
    spotifyController = controller;
  });
};

document.getElementById('startBtn').addEventListener('click', ()=>{
  document.getElementById('about').scrollIntoView({behavior:'smooth'});
  if(spotifyController){
    try{ spotifyController.play(); }catch(err){ /* 瀏覽器擋下自動播放，使用者可直接按小播放器 */ }
  }
});

