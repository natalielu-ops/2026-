
/* ============================================================
   0. 全域偏好與捲動工具
   ============================================================ */

/* 使用者若在系統設定開啟「減少動態效果」，就不放星星、流星與背景推近，
   捲動也改為瞬間到位（CSS 端另有一份對應規則） */
const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 統一的捲動入口：尊重減少動態偏好 */
function scrollToEl(el, block){
  if(!el) return;
  el.scrollIntoView({ behavior: REDUCE_MOTION ? 'auto' : 'smooth', block: block || 'start' });
}

/* 只在目標「還沒真的看到」時才捲動，避免搶走使用者的控制權。
   已經在畫面上的東西就讓它待著，不會莫名其妙跳動。 */
function bringIntoView(el, block){
  if(!el) return;
  const r = el.getBoundingClientRect();
  const mostlyVisible = r.top >= 0 && r.bottom <= window.innerHeight * 0.95;
  if(mostlyVisible) return;
  scrollToEl(el, block || 'center');
}

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
          span.textContent = ch === ' ' ? ' ' : ch;
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
  /* 前四張直接載入（多半在第一屏內），其餘延後載入，開場不用等 2MB 圖片 */
  const loading = i < 4 ? 'eager' : 'lazy';
  card.innerHTML = `
    <button type="button" class="ph" aria-label="放大照片：${img.title}">
      <img src="${img.src}" alt="${img.title}" loading="${loading}" decoding="async" style="object-position:${objPos};">
      <span class="zoom-badge" aria-hidden="true">🔍</span>
    </button>
    <div class="cap-wrap">
      <div class="p-title">${img.title}</div>
      <div class="cap ${img.funny?'rejected':''}">${img.caption}</div>
      ${img.funny ? `<div class="cap overruled">申請駁回。😂</div>` : ``}
    </div>
  `;
  /* 圖片載入失敗時只換掉圖片本身，保留卡片與說明文字 */
  const imgEl = card.querySelector('img');
  imgEl.addEventListener('error', ()=>{
    imgEl.remove();
    card.querySelector('.ph').classList.add('is-broken');
  });

  const phEl = card.querySelector('.ph');
  phEl.addEventListener('click', (e)=>{ e.stopPropagation(); openLightbox(i); });
  if(img.funny){
    /* 進入畫面後延遲 1 秒自動翻牌，之後仍可點擊切換 */
    const capWrap = card.querySelector('.cap-wrap');
    capWrap.classList.add('flippable');
    capWrap.addEventListener('click', ()=> card.classList.toggle('flipped'));
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
          <code>const PHOTO_LAYOUT = {};</code>，存檔後重新部署即可正式套用。</div>
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

/* ============================================================
   LIGHTBOX —— 可左右翻頁、鍵盤操作、滑動切換、背景鎖捲動
   ============================================================ */
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lbTitle = document.getElementById('lbTitle');
const lbCount = document.getElementById('lbCount');
const lbPrev = document.getElementById('lbPrev');
const lbNext = document.getElementById('lbNext');
const lbClose = document.getElementById('lightboxClose');
let lbIndex = -1;
let lbLastFocused = null;

function renderLightbox(){
  const img = IMAGES[lbIndex];
  if(!img) return;
  lightboxImg.src = img.src;
  lightboxImg.alt = img.title;
  lbTitle.textContent = img.title;
  lbCount.textContent = `${lbIndex + 1} / ${IMAGES.length}`;
}

function openLightbox(index){
  lbIndex = index;
  lbLastFocused = document.activeElement;
  renderLightbox();
  lightbox.classList.add('show');
  lightbox.setAttribute('aria-hidden', 'false');
  /* 鎖住背景捲動，避免燈箱開著時整頁還在後面滑動 */
  document.body.classList.add('lb-open');
  lbClose.focus();
}

function closeLightbox(){
  lightbox.classList.remove('show');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('lb-open');
  /* 回到剛才點開的那張照片，鍵盤使用者不會掉回頁首 */
  if(lbLastFocused && lbLastFocused.focus) lbLastFocused.focus();
  lbLastFocused = null;
}

/* 頭尾相接，翻到最後一張再往下就回到第一張 */
function stepLightbox(delta){
  if(lbIndex < 0) return;
  lbIndex = (lbIndex + delta + IMAGES.length) % IMAGES.length;
  renderLightbox();
}

lbClose.addEventListener('click', closeLightbox);
lbPrev.addEventListener('click', ()=> stepLightbox(-1));
lbNext.addEventListener('click', ()=> stepLightbox(1));
/* 點照片以外的暗色區域關閉 */
lightbox.addEventListener('click', (e)=>{ if(e.target === lightbox) closeLightbox(); });

document.addEventListener('keydown', (e)=>{
  if(!lightbox.classList.contains('show')) return;
  if(e.key === 'Escape'){ closeLightbox(); }
  else if(e.key === 'ArrowLeft'){ stepLightbox(-1); }
  else if(e.key === 'ArrowRight'){ stepLightbox(1); }
  else if(e.key === 'Tab'){
    /* 簡易 focus 迴圈：Tab 不會跑到燈箱後面的頁面內容 */
    const focusables = [lbClose, lbPrev, lbNext];
    const idx = focusables.indexOf(document.activeElement);
    e.preventDefault();
    const nextIdx = (idx + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
    focusables[nextIdx].focus();
  }
});

/* 手機左右滑動切換照片 */
(function initLightboxSwipe(){
  let startX = 0, startY = 0, tracking = false;
  lightbox.addEventListener('pointerdown', (e)=>{
    if(e.target.closest('.lb-nav, .lightbox-close')) return;
    tracking = true; startX = e.clientX; startY = e.clientY;
  });
  lightbox.addEventListener('pointerup', (e)=>{
    if(!tracking) return;
    tracking = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    /* 橫向位移夠明顯、且不是在垂直滑動，才視為翻頁 */
    if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5){
      stepLightbox(dx < 0 ? 1 : -1);
    }
  });
  lightbox.addEventListener('pointercancel', ()=>{ tracking = false; });
})();

/* ============================================================
   QUIZ —— 答錯可以直接改選，不用整題重來
   ============================================================ */
const quizArea = document.getElementById('quizArea');
const quizProgress = document.getElementById('quizProgress');
const quizCount = document.getElementById('quizCount');
const badgesEl = document.getElementById('badges');
let quizIndex = 0;

CONTENT.quiz.forEach(()=>{
  const dot = document.createElement('div');
  dot.className = 'dot';
  quizProgress.appendChild(dot);
});

function renderQuiz(i){
  quizArea.innerHTML = '';

  /* 全部答完：不留白，改成一張完成卡並給出明確的下一步 */
  if(i >= CONTENT.quiz.length){
    quizCount.textContent = `全部完成 ${CONTENT.quiz.length} / ${CONTENT.quiz.length}`;
    const done = document.createElement('div');
    done.className = 'quiz-card quiz-done';
    done.innerHTML = `<div class="quiz-done-msg">恭喜你通過情侶生存測驗。</div>`;
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'quiz-next';
    go.textContent = '接著看下去 ↓';
    go.addEventListener('click', ()=> scrollToEl(document.getElementById('ourway')));
    done.appendChild(go);
    quizArea.appendChild(done);
    revealNow(done.querySelector('.quiz-done-msg'));
    return;
  }

  quizCount.textContent = `第 ${i+1} 題 / 共 ${CONTENT.quiz.length} 題`;

  const q = CONTENT.quiz[i];
  const card = document.createElement('div');
  card.className = 'quiz-card';
  card.innerHTML = `<div class="quiz-q">${q.q}</div>` +
    q.options.map((o,idx)=>`<button type="button" class="quiz-opt" data-idx="${idx}">${String.fromCharCode(65+idx)}. ${o.t}</button>`).join('') +
    `<div class="quiz-feedback" role="status" aria-live="polite"></div>`;
  quizArea.appendChild(card);
  revealNow(card.querySelector('.quiz-q'));

  const fb = card.querySelector('.quiz-feedback');
  const opts = [...card.querySelectorAll('.quiz-opt')];
  let solved = false;

  opts.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(solved) return;
      const idx = +btn.dataset.idx;
      const o = q.options[idx];
      fb.textContent = o.fb;
      revealNow(fb);

      if(!o.correct){
        /* 答錯：只把這個選項標掉並停用，其他選項仍可直接點，
           不再整題重繪，也不用多按一次「再試一次」 */
        btn.classList.add('wrong');
        btn.disabled = true;
        return;
      }

      solved = true;
      btn.classList.add('correct');
      opts.forEach(b=>{ b.disabled = true; if(b !== btn) b.classList.add('faded'); });
      quizProgress.children[i].classList.add('done');

      const b = document.createElement('div');
      b.className = 'badge';
      b.textContent = q.badge;
      badgesEl.appendChild(b);
      requestAnimationFrame(()=> b.classList.add('show'));

      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'quiz-next';
      next.textContent = i === CONTENT.quiz.length-1 ? '完成測驗' : '下一題';
      next.addEventListener('click', ()=>{
        quizIndex = i + 1;
        renderQuiz(quizIndex);
        /* 換題後把卡片帶回視線內，但只在它跑出畫面時才動 */
        bringIntoView(quizArea, 'center');
      });
      card.appendChild(next);
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
   三個步驟：晚餐 → 飯後 → 確認。
   選項可以隨時改，改了就會回到「未確認」狀態，卡片與按鈕同步更新。
   ============================================================ */
const state = { dinner:null, dinnerCustom:'', activity:null, confirmed:false };

const stepper = document.getElementById('stepper');
const activitySection = document.getElementById('activity');
const dateCard = document.getElementById('dateCard');
const confirmBtn = document.getElementById('confirmBtn');
const confirmHint = document.getElementById('confirmHint');
const finalBtn = document.getElementById('finalBtn');

function setHint(text){ confirmHint.textContent = text || ''; }

/* 解除已確認狀態，並回報「原本確不確認過」，
   讓呼叫端決定要不要提醒使用者重新確認 */
function unconfirm(){
  if(!state.confirmed) return false;
  state.confirmed = false;
  dateCard.classList.remove('burst', 'is-confirmed');
  confirmBtn.textContent = '【確認約會 ❤️】';
  confirmBtn.classList.remove('is-done');
  finalBtn.textContent = '【還沒確認約會 ↑】';
  finalBtn.classList.remove('confirmed');
  return true;
}

/* 任何一個選項有變動就呼叫：確認過的話提醒重新確認，
   沒確認過的話把先前的「還差一步」提示清掉 */
function resetConfirmation(){
  if(unconfirm()) setHint('選擇有變動，記得重新確認一次。');
  else if(!state.confirmed) setHint('');
}

function buildOptGrid(gridEl, options, onPick){
  gridEl.innerHTML = '';
  options.forEach(o=>{
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'opt-card reveal in';
    card.dataset.id = o.id;
    card.setAttribute('aria-pressed', 'false');
    card.innerHTML = `<span class="check-mark" aria-hidden="true">✓</span><span class="emoji" aria-hidden="true">${o.emoji}</span><span class="t">${o.t}</span><span class="s">${o.s}</span>`;
    card.addEventListener('click', ()=> onPick(o, card));
    gridEl.appendChild(card);
  });
}

function markSelected(gridEl, card){
  [...gridEl.children].forEach(c=>{
    const isPicked = c === card;
    c.classList.toggle('selected', isPicked);
    c.classList.toggle('dim', !isPicked);
    c.setAttribute('aria-pressed', String(isPicked));
  });
}

/* 步驟指示器：已完成、進行中、還沒輪到，一眼看得出來 */
function updateStepper(){
  const done = {
    dinner: !!state.dinner && (state.dinner.id !== 'other' || !!state.dinnerCustom.trim()),
    activity: !!state.activity,
    confirm: state.confirmed,
  };
  const order = ['dinner','activity','confirm'];
  const current = order.find(k=> !done[k]);
  order.forEach(k=>{
    const li = stepper.querySelector(`[data-step="${k}"]`);
    li.classList.toggle('done', done[k]);
    li.classList.toggle('active', k === current);
  });
}

const dinnerGrid = document.getElementById('dinnerGrid');
const dinnerResponse = document.getElementById('dinnerResponse');

buildOptGrid(dinnerGrid, CONTENT.dinnerOptions, (o, card)=>{
  const changed = !state.dinner || state.dinner.id !== o.id;
  state.dinner = o;
  if(o.id !== 'other') state.dinnerCustom = '';
  if(changed) resetConfirmation(); /* 換了選擇，之前的確認就不算數 */
  markSelected(dinnerGrid, card);

  dinnerResponse.innerHTML = `<div class="tag">${o.tag}</div><p>${o.body}</p>`;
  revealNow(dinnerResponse.querySelector('.tag'));
  revealNow(dinnerResponse.querySelector('p'));

  if(o.id === 'other'){
    /* 用 DOM 建立而非字串拼接，使用者輸入的引號不會破壞 HTML */
    const wrap = document.createElement('div');
    wrap.className = 'custom-input-wrap';
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'customDinnerInput';
    input.maxLength = 24;
    input.placeholder = '填空：我想吃＿＿＿';
    input.value = state.dinnerCustom;
    input.setAttribute('aria-label', '自己填想吃的東西');
    const hint = document.createElement('div');
    hint.className = 'custom-hint';
    hint.textContent = '你填的內容會同步出現在下面的約會方案卡片上';
    wrap.appendChild(input);
    wrap.appendChild(hint);
    dinnerResponse.appendChild(wrap);
    revealNow(hint);

    input.addEventListener('input', (e)=>{
      state.dinnerCustom = e.target.value;
      resetConfirmation();
      updateDateCard();
      updateStepper();
    });
    input.focus({ preventScroll: true });
  }

  spawnHearts(4);
  updateDateCard();
  activitySection.classList.add('is-open');
  updateStepper();

  /* 選「其他」時要先打字，這時候捲動會把輸入框連同鍵盤一起推出畫面，
     所以只在不需要打字的選項才輕輕把下一步帶進視線，而且不打斷閱讀回應文字 */
  if(o.id !== 'other'){
    setTimeout(()=> bringIntoView(document.getElementById('activityHeading'), 'center'), 650);
  }
});

const activityGrid = document.getElementById('activityGrid');
const activityResponse = document.getElementById('activityResponse');

buildOptGrid(activityGrid, CONTENT.activityOptions, (o, card)=>{
  const changed = !state.activity || state.activity.id !== o.id;
  state.activity = o;
  if(changed) resetConfirmation();
  markSelected(activityGrid, card);
  activityResponse.innerHTML = `<div class="tag">${o.tag}</div><p>${o.body}</p>`;
  revealNow(activityResponse.querySelector('.tag'));
  revealNow(activityResponse.querySelector('p'));
  spawnHearts(4);
  updateDateCard();
  updateStepper();
  setTimeout(()=> bringIntoView(document.getElementById('dateCard'), 'center'), 750);
});

function dinnerLabel(){
  if(!state.dinner) return null;
  if(state.dinner.id !== 'other') return state.dinner.t;
  return state.dinnerCustom.trim() || null;
}

function isPlanReady(){ return !!dinnerLabel() && !!state.activity; }

function setPlanCell(el, text){
  el.textContent = text || '尚未選擇';
  el.classList.toggle('dc-empty', !text);
}

function updateDateCard(){
  document.getElementById('dcDate').textContent = `${CONTENT.qixiDate}｜七夕`;
  setPlanCell(document.getElementById('dcDinner'), dinnerLabel());
  setPlanCell(document.getElementById('dcActivity'), state.activity ? state.activity.t : null);
  document.getElementById('dcWho').textContent = CONTENT.dateWith;

  /* 沒選完時把確認鍵調成「還不能按」的樣子，但按下去仍會說明還缺什麼，
     所以不標成 disabled／aria-disabled —— 它確實是可以操作的。
     缺什麼由下方的 #confirmHint（live region）負責說出來 */
  confirmBtn.classList.toggle('is-locked', !isPlanReady());
}
updateDateCard();
updateStepper();

confirmBtn.addEventListener('click', ()=>{
  /* 取代原本的 alert()：直接說明缺哪一步，並把那一步帶到眼前 */
  if(!isPlanReady()){
    if(!state.dinner){
      setHint('還差一步：先選今晚吃什麼 🍽️');
      scrollToEl(document.getElementById('dinnerHeading'), 'center');
    } else if(!dinnerLabel()){
      setHint('「其他」還沒填內容，寫下你想吃的東西 ✍️');
      scrollToEl(document.getElementById('dinnerHeading'), 'center');
      const input = document.getElementById('customDinnerInput');
      if(input) setTimeout(()=> input.focus({ preventScroll:true }), 500);
    } else {
      setHint('還差一步：選吃完要做什麼 🌙');
      scrollToEl(document.getElementById('activityHeading'), 'center');
    }
    confirmBtn.classList.remove('nudge');
    void confirmBtn.offsetWidth; /* 重播搖晃動畫 */
    confirmBtn.classList.add('nudge');
    return;
  }

  state.confirmed = true;
  updateDateCard();
  updateStepper();
  dateCard.classList.add('burst', 'is-confirmed');
  spawnHearts(16);
  confirmBtn.textContent = '【已確認 ✓】';
  confirmBtn.classList.add('is-done');
  setHint('約好了。還有最後幾句話想跟你說 ↓');
  finalBtn.textContent = '【約會任務：CONFIRMED ✓】';
  finalBtn.classList.add('confirmed');
  setTimeout(()=> scrollToEl(document.getElementById('final')), 1100);
});

finalBtn.addEventListener('click', ()=>{
  if(!state.confirmed){
    scrollToEl(document.getElementById('generate'));
    return;
  }
  spawnHearts(10);
});

/* ============================================================
   FX: hearts + shooting stars
   ============================================================ */
function spawnHearts(n){
  if(REDUCE_MOTION) return;
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
  if(REDUCE_MOTION) return;
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
/* 流星偶爾出現，不要一直出現：用隨機間隔而非固定頻率（約 4~10 秒）。
   分頁切到背景時就不再排下一顆，回來才繼續，不浪費電池。 */
function scheduleShoot(containerId, minMs, maxMs){
  if(REDUCE_MOTION) return;
  setTimeout(()=>{
    if(!document.hidden) shoot(containerId);
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
document.querySelectorAll('.soft-line, .mission-list, .tl-final, .final-signoff')
  .forEach(revealSingleOnScroll);
document.querySelectorAll('.tl-item').forEach(item=>{
  revealLinesOnScroll(item, [...item.querySelectorAll('p')], { step:50, maxDelay:200 });
});


/* ============================================================
   粉紫雲海背景：明顯但浪漫的星星閃爍＋隨機流星
   ============================================================ */
function makeCosmicStars(count){
  if(REDUCE_MOTION) return;
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
/* 出現間隔隨機（約 4~10 秒），不要固定節奏；分頁在背景時暫停 */
function scheduleCosmicShoot(){
  if(REDUCE_MOTION) return;
  setTimeout(()=>{
    if(!document.hidden) shootCosmic();
    scheduleCosmicShoot();
  }, 4000 + Math.random()*6000);
}
scheduleCosmicShoot();

const cosmicImg = document.getElementById('cosmicImg');
const scrollProgressBar = document.getElementById('scrollProgressBar');
/* 單一連續長鏡頭：只用 scale 做非常緩慢的靠近雲朵，不做左右位移，
   全站從第一頁到最後一頁是同一組漸進數值，不會有「每頁跳一次」的感覺 */
function updateParallax(){
  const scrollY = window.scrollY;
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docH > 0 ? Math.min(1, scrollY / docH) : 0;
  if(!REDUCE_MOTION){
    const scale = 1 + progress * 0.16; /* 1 → 約 1.16，非常柔和 */
    cosmicImg.style.transform = `scale(${scale.toFixed(4)})`;
  }
  /* 同一組進度值順便畫閱讀進度條，不用另外監聽一次 scroll */
  scrollProgressBar.style.transform = `scaleX(${progress.toFixed(4)})`;
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
onScrollFrame();

/* ============================================================
   背景音樂 — 自己的 MP3 播放器（整首歌，不是 30 秒試聽）
   歌曲設定在 CONTENT.music。預設收合成右下角小藥丸，不遮住照片與按鈕；
   點藥丸或點「開始任務」才展開並播放。行動裝置與瀏覽器的 autoplay 政策
   要求「使用者動作」才能出聲，這兩個動作剛好都是點擊，所以能正常播放。
   ============================================================ */
const musicWidget = document.getElementById('musicWidget');
const musicToggle = document.getElementById('musicToggle');
const musicAudio  = document.getElementById('musicAudio');
const musicPlay   = document.getElementById('musicPlay');
const musicSeek   = document.getElementById('musicSeek');
const musicError  = document.getElementById('musicError');
const musicCurrentEl  = document.getElementById('musicCurrent');
const musicDurationEl = document.getElementById('musicDuration');

const MUSIC = (typeof CONTENT === 'object' && CONTENT.music) ? CONTENT.music : {};

/* 播放器整段都要能「不存在也不出事」：手機瀏覽器可能還快取著舊版的 HTML，
   少了任何一個元素就丟例外的話，會連同後面的「開始任務」一起壞掉。 */
const musicReady = !!(musicWidget && musicToggle && musicAudio && musicPlay && musicSeek);

if(musicReady){
  /* 顯示歌名／歌手：沒填歌手就把那一行收起來（藥丸上固定寫「我們的歌」） */
  document.getElementById('musicTitle').textContent = MUSIC.title || '我們的歌';
  const musicArtistEl = document.getElementById('musicArtist');
  musicArtistEl.textContent = MUSIC.artist || '';
  musicArtistEl.hidden = !MUSIC.artist;

  if(MUSIC.src){
    musicAudio.src = MUSIC.src;
    musicAudio.loop = MUSIC.loop !== false;
    musicAudio.volume = typeof MUSIC.volume === 'number' ? MUSIC.volume : 0.65;
  }else{
    showMusicError('還沒設定歌曲檔案。');
  }
}

function fmtTime(sec){
  if(!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

/* 檔案不存在或格式不支援時，直接把狀況寫出來，不要靜靜地沒有聲音 */
function showMusicError(msg){
  if(!musicReady) return;
  musicError.textContent = msg;
  musicError.hidden = false;
  musicPlay.disabled = true;
  musicSeek.disabled = true;
}

function setMusicOpen(open){
  if(!musicReady) return;
  musicWidget.classList.toggle('is-collapsed', !open);
  musicToggle.setAttribute('aria-expanded', String(open));
}

/* 播放／暫停：play() 回傳 Promise，被瀏覽器擋下時保持展開讓使用者自己按 */
function playMusic(){
  if(!musicReady || !MUSIC.src) return;
  const p = musicAudio.play();
  if(p && p.catch) p.catch(()=>{ setMusicOpen(true); });
}

function toggleMusic(){
  if(musicAudio.paused) playMusic();
  else musicAudio.pause();
}

if(musicReady){
musicToggle.addEventListener('click', ()=>{
  setMusicOpen(musicWidget.classList.contains('is-collapsed'));
});

musicPlay.addEventListener('click', toggleMusic);

/* 按鈕圖示與藥丸上的音符動畫，都跟著實際播放狀態走 */
musicAudio.addEventListener('play', ()=>{
  musicWidget.classList.add('is-playing');
  musicPlay.textContent = '❚❚';
  musicPlay.setAttribute('aria-label', '暫停');
});
musicAudio.addEventListener('pause', ()=>{
  musicWidget.classList.remove('is-playing');
  musicPlay.textContent = '▶';
  musicPlay.setAttribute('aria-label', '播放');
});

musicAudio.addEventListener('loadedmetadata', ()=>{
  musicDurationEl.textContent = fmtTime(musicAudio.duration);
  musicSeek.disabled = false;
});

/* 拖曳進度條時先停止跟著音訊更新，放開後才跳到新位置 */
let seeking = false;
musicSeek.addEventListener('input', ()=>{
  seeking = true;
  if(isFinite(musicAudio.duration)){
    musicCurrentEl.textContent = fmtTime(musicAudio.duration * (musicSeek.value / 1000));
  }
});
musicSeek.addEventListener('change', ()=>{
  if(isFinite(musicAudio.duration)){
    musicAudio.currentTime = musicAudio.duration * (musicSeek.value / 1000);
  }
  seeking = false;
});

musicAudio.addEventListener('timeupdate', ()=>{
  if(seeking || !isFinite(musicAudio.duration) || musicAudio.duration <= 0) return;
  musicSeek.value = String(Math.round((musicAudio.currentTime / musicAudio.duration) * 1000));
  musicCurrentEl.textContent = fmtTime(musicAudio.currentTime);
});

musicAudio.addEventListener('error', ()=>{
  showMusicError('找不到音樂檔：' + MUSIC.src);
});
}   /* end if(musicReady) */

document.getElementById('startBtn').addEventListener('click', ()=>{
  scrollToEl(document.getElementById('about'));
  /* 展開播放器，讓 autoplay 被擋下時也看得到可以按的播放鍵 */
  setMusicOpen(true);
  playMusic();
});
