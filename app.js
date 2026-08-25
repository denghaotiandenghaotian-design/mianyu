/* =====================================================================
 * 缅甸语学习辅助系统 v2.0 · 6 大模块（深化版）
 * 模块：① 语音拼读 ② 单词词库 ③ 句子学习 ④ 口语练习 ⑤ 听力训练 ⑥ 每日一练
 * 发音：SpeechSynthesis('my') 实时合成 + 语音包检测 + 优雅降级
 * 持久化：localStorage（不上传、无需登录）
 * ===================================================================== */
(function(){
'use strict';
const M = window.MM;
const LS = 'mmlearn_v2';
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------------- 状态 ---------------- */
let state = load();
function load(){
  try{ const r=JSON.parse(localStorage.getItem(LS)); if(r&&r.words) return r; }catch(e){}
  return {
    profile:null,
    wordMastered:[],      // 已掌握单词的 my 串
    sentenceMastered:[],  // 已掌握句子的 my 串
    daily:{},             // { 'YYYY-MM-DD': {words:[idx], sentence:idx, score, done} }
    listenDone:[],        // 已完成听力标题
    oralDone:[],          // 已完成场景名
  };
}
function save(){ try{ localStorage.setItem(LS, JSON.stringify(state)); }catch(e){} }
const wm = ()=>new Set(state.wordMastered);
const sm = ()=>new Set(state.sentenceMastered);

/* ---------------- 发音引擎 ---------------- */
let VOICES=[];
function refreshVoices(){ try{ VOICES = window.speechSynthesis?speechSynthesis.getVoices():[]; }catch(e){ VOICES=[]; } }
if('speechSynthesis' in window){ refreshVoices(); speechSynthesis.onvoiceschanged=refreshVoices; }
function myVoice(){ return VOICES.find(v=>/^my/i.test(v.lang)||/burmese/i.test(v.name))||null; }
function speak(text, rate){
  rate = rate||0.85;
  if(!('speechSynthesis' in window) || !text) return;
  try{
    const u=new SpeechSynthesisUtterance(text);
    u.lang='my-MM'; u.rate=rate; u.pitch=1;
    const v=myVoice(); if(v) u.voice=v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }catch(e){}
}
function audioBanner(){
  const el=$('#audioBanner'); if(!el) return;
  if(!('speechSynthesis' in window)){ el.className='abanner warn'; el.innerHTML='⚠ 当前浏览器不支持语音合成，读音功能不可用；可用罗马音与中文对照学习。'; return; }
  const v=myVoice();
  if(v){ el.className='abanner ok'; el.innerHTML='✅ 本设备支持缅甸语发音，点击 🔊 即可实时听读。'; }
  else { el.className='abanner warn'; el.innerHTML='⚠ 未检测到缅甸语音包。点击 🔊 会尝试在线合成；若仍无声音，请在系统/浏览器安装缅甸语语音（Windows 添加缅甸语语言包并下载语音、安卓安装缅甸语 TTS）。罗马音与中文对照始终可用。'; }
}

/* ---------------- 通用工具 ---------------- */
function toast(msg){ const t=$('#toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),1800); }
function stars(n){ let s=''; for(let i=0;i<5;i++) s+= i<n?'★':'<span class="off">★</span>'; return `<span class="stars">${s}</span>`; }
function speakBtn(text, extra){ return `<button class="spk" data-spk="${encodeURIComponent(text)}" title="朗读">🔊</button>`; }

/* ---------------- 路由 ---------------- */
const MODULES = [
  {id:'home',   ix:'⌂', label:'总控 · 学习主页'},
  {grp:'核心模块'},
  {id:'phonics',ix:'က', label:'① 语音与拼读入门'},
  {id:'words',  ix:'ဝ', label:'② 日常单词词库'},
  {id:'sent',   ix:'၊', label:'③ 句子学习'},
  {id:'oral',   ix:'💬', label:'④ 口语练习'},
  {id:'listen', ix:'🎧', label:'⑤ 听力训练'},
  {id:'daily',  ix:'📅', label:'⑥ 每日一练'},
  {id:'dialogue', ix:'🗣️', label:'⑦ 情景对话练习'},
];
function buildNav(){
  const nav=$('#nav'); nav.innerHTML='';
  MODULES.forEach(m=>{
    if(m.grp){ const d=document.createElement('div'); d.className='grp'; d.textContent=m.grp; nav.appendChild(d); return; }
    const b=document.createElement('button'); b.dataset.id=m.id; b.innerHTML=`<span class="ix">${m.ix}</span><span>${m.label}</span>`;
    b.onclick=()=>go(m.id); nav.appendChild(b);
  });
  document.addEventListener('click', e=>{
    const t=e.target.closest('[data-spk]'); if(t){ speak(decodeURIComponent(t.dataset.spk)); }
  });
}
function go(id){
  $$('#nav button').forEach(b=>b.classList.toggle('active', b.dataset.id===id));
  state._last=id; save();
  const v=$('#view'); v.innerHTML='';
  ({home,phonics,words:wordsMod,sent:sentencesMod,oral:oralMod,listen:listenMod,daily:dailyMod,dialogue:dialogueMod}[id]||home)(v);
  v.scrollTop=0; window.scrollTo(0,0);
}

/* ================= 总控 · 学习主页 ================= */
function home(v){
  const p=state.profile;
  const wmSet=wm(), smSet=sm();
  const wrap=document.createElement('div');
  wrap.innerHTML=`
    <div class="topbar"><div><h2>缅甸语学习辅助系统</h2>
      <div class="sub">${esc(M.meta.romanScheme)} ｜ ${esc(M.meta.toneScheme)} ｜ 数据存本机浏览器，无需登录</div></div></div>
    <div id="audioBanner"></div>
    <div class="dash">
      <div class="dcard"><div class="dv">${M.words.length}</div><div class="dk">单词库</div></div>
      <div class="dcard"><div class="dv">${M.sentences.length}</div><div class="dk">实用句子</div></div>
      <div class="dcard"><div class="dv">${M.scenes.length}</div><div class="dk">口语场景</div></div>
      <div class="dcard"><div class="dv">${M.listening.length}</div><div class="dk">听力素材</div></div>
      <div class="dcard"><div class="dv">${wmSet.size}</div><div class="dk">已掌握单词</div></div>
      <div class="dcard"><div class="dv">${smSet.size}</div><div class="dk">已掌握句子</div></div>
    </div>
    <div class="card" id="profileCard"></div>
    <div class="card" id="todayCard"></div>`;
  v.appendChild(wrap);
  audioBanner();
  renderProfile($('#profileCard'));
  renderToday($('#todayCard'));
}
function renderProfile(box){
  const p=state.profile;
  if(!p){
    box.innerHTML=`<h3>建立学习画像 <span class="tag">可选</span></h3>
      <div class="grid2">
        <div><label>当前水平</label><select id="f_level">
          <option>完全零基础</option><option>学过字母</option><option>简单会话</option><option>备考/进阶</option></select></div>
        <div><label>学习目标</label><select id="f_goal">
          <option>日常交流</option><option>留学缅甸</option><option>学术阅读</option><option>应试</option></select></div>
        <div><label>每天可用时长（分钟）</label><input id="f_time" type="number" min="5" max="240" value="30"></div>
        <div><label>所用教材</label><input id="f_book" value="《缅甸语教程》"></div>
      </div>
      <div class="row" style="margin-top:var(--s4)"><button class="btn btn-primary" id="saveP">保存画像</button></div>`;
    $('#saveP').onclick=()=>{ state.profile={level:$('#f_level').value,goal:$('#f_goal').value,time:+$('#f_time').value||30,book:$('#f_book').value}; save(); toast('已保存'); renderProfile(box); renderToday($('#todayCard')); };
    return;
  }
  box.innerHTML=`<h3>学习画像</h3><div class="profile-chip" style="margin-bottom:var(--s3)">
      <span class="pill">水平 <b>${esc(p.level)}</b></span><span class="pill">目标 <b>${esc(p.goal)}</b></span>
      <span class="pill">${p.time} 分/天</span><span class="pill">教材 <b>${esc(p.book)}</b></span></div>
    <div class="row"><button class="btn btn-line btn-sm" id="editP">修改</button>
      <button class="btn btn-line btn-sm" id="resetAll">重置全部数据</button></div>`;
  $('#editP').onclick=()=>{ state.profile=null; save(); renderProfile(box); };
  $('#resetAll').onclick=()=>{ if(confirm('清空全部本地学习数据？不可撤销。')){ localStorage.removeItem(LS); state=load(); buildNav(); renderProfile(box); renderToday($('#todayCard')); toast('已重置'); } };
}
function todayKey(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function renderToday(box){
  const key=todayKey(); const rec=state.daily[key];
  box.innerHTML=`<h3>今日学习 <span class="tag">${key}</span></h3>
    <div class="note">${rec&&rec.done?'✅ 今日一练已完成（得分 '+rec.score+'/6）。可点击下方任意模块继续学习。':'今天还没完成「每日一练」，建议先完成它热身：'}</div>
    <div class="row" style="margin-top:var(--s3)">
      <button class="btn btn-primary btn-sm" id="goDaily">📅 开始每日一练</button>
      <button class="btn btn-line btn-sm" id="goPhonics">က 语音拼读</button>
      <button class="btn btn-line btn-sm" id="goWords">ဝ 单词词库</button>
    </div>`;
  $('#goDaily').onclick=()=>go('daily');
  $('#goPhonics').onclick=()=>go('phonics');
  $('#goWords').onclick=()=>go('words');
}

/* ================= ① 语音与拼读入门 ================= */
function phonics(v){
  const wrap=document.createElement('div');
  wrap.innerHTML=`<div class="topbar"><div><h2>① 基础语音与拼读入门</h2>
    <div class="sub">${esc(M.meta.romanScheme)} ｜ 点击任意 🔊 实时听读</div></div></div>
    <div id="audioBanner2" class="abanner" style="margin-bottom:var(--s4)"></div>
    <div class="tabs" id="tabs">
      <button data-t="alpha" class="active">辅音字母(33)</button>
      <button data-t="combo">字母组合</button>
      <button data-t="vowel">元音符号</button>
      <button data-t="tone">四声调</button>
      <button data-t="rule">拼写规则</button>
      <button data-t="quiz">拼读测验</button>
    </div><div id="phContent"></div>`;
  v.appendChild(wrap);
  const box=$('#phContent'); audioBanner2();
  function sw(t){ $$('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.t===t));
    ({alpha:phAlpha,combo:phCombo,vowel:phVowel,tone:phTone,rule:phRule,quiz:phQuiz}[t])(box); }
  $$('#tabs button').forEach(b=>b.onclick=()=>sw(b.dataset.t)); sw('alpha');
}
function audioBanner2(){ const el=$('#audioBanner2'); if(!el) return; const v=myVoice();
  el.className='abanner '+(v?'ok':'warn'); el.innerHTML=v?'✅ 支持缅甸语发音，可点读。':'⚠ 未检测到缅甸语音包，点击会尝试在线合成；罗马音对照始终可用。'; }
function phAlpha(box){
  box.innerHTML=`<div class="card"><h3>33 个辅音字母 <span class="tag">点击 🔊 听读 · 点卡片标「已掌握」</span></h3>
    <div class="alpha-grid" id="ag"></div></div>`;
  const ag=$('#ag');
  M.consonants.forEach((c,i)=>{
    const d=document.createElement('div'); d.className='alpha';
    d.innerHTML=`<div class="big my">${c.c}</div><div class="rom">${esc(c.rom)}</div>
      <div class="cn">${esc(c.cn)}</div><span class="cls">${esc(c.cls)}</span>
      <div class="row" style="justify-content:space-between;margin-top:6px">
        <button class="spk" data-spk="${encodeURIComponent(c.c)}">🔊</button>
        <span class="mk" data-i="${i}">${state._cons&&state._cons[c.c]?'✅':'○'}</span></div>
      <div class="faint" style="margin-top:4px">${esc(c.tip)}</div>`;
    d.querySelector('.mk').onclick=()=>{ state._cons=state._cons||{}; state._cons[c.c]=!state._cons[c.c]; save(); phAlpha(box); };
    ag.appendChild(d);
  });
}
function phCombo(box){
  box.innerHTML=`<div class="card"><h3>字母组合（辅音 + 元音符号） <span class="tag">点击 🔊 听读</span></h3>
    <div class="combo-grid" id="cg"></div></div>`;
  const cg=$('#cg');
  M.combos.forEach(x=>{
    const d=document.createElement('div'); d.className='combo';
    d.innerHTML=`<span class="big my">${esc(x.my)}</span><span class="lbl">${esc(x.label)}</span>
      <button class="spk" data-spk="${encodeURIComponent(x.my)}">🔊</button>`;
    cg.appendChild(d);
  });
}
function phVowel(box){
  box.innerHTML=`<div class="card"><h3>元音符号</h3><div class="scrollx"><table><thead><tr><th>符号</th><th>罗马音</th><th>中文</th><th>说明</th></tr></thead><tbody>
    ${M.vowels.map(x=>`<tr><td class="my" style="font-size:22px">${esc(x.sym)}</td><td class="mono">${esc(x.rom)}</td><td>${esc(x.cn)}</td><td class="muted">${esc(x.note)}</td></tr>`).join('')}
    </tbody></table></div></div>`;
}
function phTone(box){
  box.innerHTML=`<div class="card"><h3>四声调（数字标调法）</h3>
    ${M.tones.map(t=>`<div style="padding:var(--s3) 0;border-bottom:1px solid var(--c-line)">
      <div class="row spread"><b style="font-size:16px">${t.n} 声 · ${esc(t.name)}</b><span class="badge b-type">${esc(t.rule.slice(0,18))}…</span></div>
      <div class="muted" style="margin:6px 0">${esc(t.desc)}</div>
      <div class="faint">${esc(t.rule)}</div>
      <div class="my" style="font-size:18px;margin-top:4px">${esc(t.ex)}</div></div>`).join('')}
    <div class="warn note" style="margin-top:var(--s4)">缅甸语无声调字母，声调由「辅音清浊 + 元音长短 + 韵尾」整体决定。中文近似音仅作参考，须以真实听辨为准。</div></div>`;
}
function phRule(box){
  box.innerHTML=`<div class="card"><h3>拼写规则</h3>
    ${M.spellingRules.map(r=>`<div style="padding:var(--s3) 0;border-bottom:1px solid var(--c-line)"><b>${esc(r.title)}</b><div class="muted" style="margin-top:4px">${esc(r.body)}</div></div>`).join('')}</div>`;
}
function phQuiz(box){
  box.innerHTML=`<div class="card"><h3>拼读测验 <span class="tag">辅音罗马音辨识</span></h3><div id="qbox"></div></div>`;
  runQuiz($('#qbox'));
}
function runQuiz(qbox){
  const pool=M.consonants; const pick=pool[Math.floor(Math.random()*pool.length)];
  const opts=new Set([pick.rom]); while(opts.size<4) opts.add(pool[Math.floor(Math.random()*pool.length)].rom);
  const arr=[...opts].sort(()=>Math.random()-0.5);
  qbox.innerHTML=`<div class="center" style="padding:var(--s5) 0">
      <div class="my" style="font-size:72px;color:var(--c-primary-d)">${pick.c}</div>
      <div class="faint">请选出该字母的 MLC 罗马音（${esc(pick.cn)}）</div>
      <div class="row" style="justify-content:center;margin-top:var(--s4)" id="opts"></div>
      <div class="feedback" id="fb"></div>
      <button class="btn btn-ghost btn-sm" id="nextQ" style="margin-top:var(--s3)">下一题 →</button></div>`;
  const ob=$('#opts');
  arr.forEach(o=>{ const b=document.createElement('button'); b.className='btn btn-line'; b.textContent=o;
    b.onclick=()=>{ const fb=$('#fb'); const right=(o===pick.rom);
      fb.className='feedback show '+(right?'right':'wrong');
      fb.innerHTML=right?'✅ 正确！':'❌ 正确应为 <b class="mono">'+esc(pick.rom)+'</b>';
      $$('#opts button').forEach(x=>{ x.disabled=true; if(x.textContent===pick.rom) x.classList.add('btn-primary'); });
      if(right){ state._cons=state._cons||{}; state._cons[pick.c]=true; save(); }
    }; ob.appendChild(b); });
  $('#nextQ').onclick=()=>runQuiz(qbox);
}

/* ================= ② 日常单词词库 ================= */
function wordsMod(v){
  const wmSet=wm();
  const cats=[...new Set(M.words.map(w=>w.cat))];
  const wrap=document.createElement('div');
  wrap.innerHTML=`<div class="topbar"><div><h2>② 日常单词词库</h2>
    <div class="sub">${M.words.length} 词 ｜ 点击 🔊 听读 ｜ 已掌握 ${wmSet.size}</div></div>
    <div class="row"><button class="btn btn-accent btn-sm" id="quizBtn">🎯 单词测验</button></div></div>
    <div id="audioBanner3" class="abanner" style="margin-bottom:var(--s4)"></div>
    <div class="card"><div class="row spread" style="margin-bottom:var(--s3)">
      <div class="row" id="catPick" style="gap:6px"></div>
      <input id="wsearch" placeholder="搜索缅文/罗马音/中文…" style="width:240px"></div>
      <div class="word-grid" id="wg"></div></div>`;
  v.appendChild(wrap);
  const wg=$('#wg'); const banner=$('#audioBanner3'); if(banner){ const vb=myVoice(); banner.className='abanner '+(vb?'ok':'warn'); banner.innerHTML=vb?'✅ 支持缅甸语发音。':'⚠ 未检测到缅甸语音包，点击会尝试在线合成；罗马音对照可用。'; }
  // 分类按钮
  let curCat=null;
  const allBtn=mkCat('全部',null); $('#catPick').appendChild(allBtn);
  cats.forEach(c=>$('#catPick').appendChild(mkCat(c,c)));
  function mkCat(label,val){ const b=document.createElement('button'); b.className='btn btn-line btn-sm'+(val===curCat?' btn-primary':''); b.textContent=label;
    b.onclick=()=>{ curCat=val; $$('#catPick button').forEach(x=>x.classList.remove('btn-primary')); b.classList.add('btn-primary'); draw(); }; return b; }
  function draw(){
    const q=$('#wsearch').value.trim().toLowerCase();
    const wmSet=wm();
    let list=M.words.filter(w=> (!curCat||w.cat===curCat) && (!q||(w.my+w.rom+w.cn).toLowerCase().includes(q)));
    wg.innerHTML=list.map(w=>{ const m=wmSet.has(w.my);
      return `<div class="word"><div class="wtop"><span class="my big">${esc(w.my)}</span>${speakBtn(w.my)}</div>
        <div class="rom">${esc(w.rom)}</div><div class="cn">${esc(w.cn)}</div>
        <div class="row spread" style="margin-top:6px"><span class="badge b-type">${esc(w.cat)}</span>
        <button class="btn btn-line btn-sm mk" data-my="${encodeURIComponent(w.my)}">${m?'✅ 已掌握':'标记掌握'}</button></div></div>`;
    }).join('')||`<div class="faint center" style="padding:var(--s5)">无匹配单词。</div>`;
    $$('.mk',wg).forEach(b=>b.onclick=()=>{ const my=decodeURIComponent(b.dataset.my); const s=wm(); if(s.has(my)){ state.wordMastered=state.wordMastered.filter(x=>x!==my); } else state.wordMastered.push(my); save(); draw(); toast(s.has(my)?'已取消':'已标记掌握'); });
  }
  $('#wsearch').oninput=draw; draw();
  $('#quizBtn').onclick=()=>wordQuiz(v);
}
function wordQuiz(v){
  const pool=[...M.words]; const pick=pool.sort(()=>Math.random()-0.5).slice(0,10);
  const box=document.createElement('div'); box.className='card'; box.style.marginTop='var(--s4)';
  v.appendChild(box);
  let i=0,score=0;
  function step(){
    if(i>=pick.length){ box.innerHTML=`<div class="note ok">🎉 测验完成！得分 <b>${score}/${pick.length}</b>。继续练习可巩固记忆。</div>`; return; }
    const w=pick[i]; const opts=new Set([w.cn]); while(opts.size<4){ const o=pool[Math.floor(Math.random()*pool.length)].cn; opts.add(o); }
    const arr=[...opts].sort(()=>Math.random()-0.5);
    box.innerHTML=`<div class="faint">进度 ${i+1}/${pick.length}</div>
      <div class="center" style="padding:var(--s4) 0">
        <div class="my big" style="font-size:54px">${esc(w.my)}</div>
        <button class="spk" data-spk="${encodeURIComponent(w.my)}">🔊 ${esc(w.rom)}</button>
        <div class="faint" style="margin-top:4px">请选出正确中文释义：</div>
        <div class="row" style="justify-content:center;margin-top:var(--s3)" id="opts"></div>
        <div class="feedback" id="fb"></div>
      </div>`;
    const ob=$('#opts');
    arr.forEach(o=>{ const b=document.createElement('button'); b.className='btn btn-line'; b.textContent=o;
      b.onclick=()=>{ const fb=$('#fb'); const right=(o===w.cn); fb.className='feedback show '+(right?'right':'wrong');
        fb.innerHTML=right?'✅ 正确！':('❌ 正确释义：<b>'+esc(w.cn)+'</b>');
        $$('#opts button').forEach(x=>{x.disabled=true; if(x.textContent===w.cn) x.classList.add('btn-primary');});
        if(right) score++; i++; setTimeout(step,900); };
      ob.appendChild(b); });
  }
  step();
}

/* ================= ③ 句子学习 ================= */
function sentencesMod(v){
  const smSet=sm();
  const cats=[...new Set(M.sentences.map(s=>s.cat))];
  const wrap=document.createElement('div');
  wrap.innerHTML=`<div class="topbar"><div><h2>③ 句子学习</h2>
    <div class="sub">${M.sentences.length} 句 ｜ 点击 🔊 跟读 ｜ 已掌握 ${smSet.size}</div></div>
    <div class="row"><button class="btn btn-accent btn-sm" id="shadowBtn">🎤 跟读模式</button></div></div>
    <div id="audioBanner4" class="abanner" style="margin-bottom:var(--s4)"></div>
    <div class="card"><div class="row" id="catPick" style="gap:6px;margin-bottom:var(--s3)"></div>
      <div class="scrollx"><table id="stab"><thead><tr><th>缅文</th><th>罗马音</th><th>中文</th><th>类别</th><th>掌握</th></tr></thead><tbody></tbody></table></div></div>`;
  v.appendChild(wrap);
  const tb=$('#stab tbody');
  const banner=$('#audioBanner4'); if(banner){ const vb=myVoice(); banner.className='abanner '+(vb?'ok':'warn'); banner.innerHTML=vb?'✅ 支持缅甸语发音。':'⚠ 未检测到缅甸语音包；罗马音对照可用。'; }
  let curCat=null;
  const allBtn=mkCat('全部',null); $('#catPick').appendChild(allBtn);
  cats.forEach(c=>$('#catPick').appendChild(mkCat(c,c)));
  function mkCat(label,val){ const b=document.createElement('button'); b.className='btn btn-line btn-sm'+(val===curCat?' btn-primary':''); b.textContent=label;
    b.onclick=()=>{ curCat=val; $$('#catPick button').forEach(x=>x.classList.remove('btn-primary')); b.classList.add('btn-primary'); draw(); }; return b; }
  function draw(){
    const smSet=sm();
    const list=M.sentences.filter(s=>!curCat||s.cat===curCat);
    tb.innerHTML=list.map(s=>{ const m=smSet.has(s.my);
      return `<tr><td class="my" style="font-size:17px">${esc(s.my)} ${speakBtn(s.my)}</td>
        <td class="mono">${esc(s.rom)}</td><td>${esc(s.cn)}</td><td><span class="badge b-type">${esc(s.cat)}</span></td>
        <td><button class="btn btn-line btn-sm mk" data-my="${encodeURIComponent(s.my)}">${m?'✅':'○'}</button></td></tr>`;
    }).join('')||`<tr><td colspan="5" class="center faint">无匹配。</td></tr>`;
    $$('.mk',tb).forEach(b=>b.onclick=()=>{ const my=decodeURIComponent(b.dataset.my); const s=smSet;
      if(s.has(my)) state.sentenceMastered=state.sentenceMastered.filter(x=>x!==my); else state.sentenceMastered.push(my); save(); draw(); toast(s.has(my)?'已取消':'已标记掌握'); });
  }
  draw();
  $('#shadowBtn').onclick=()=>shadowMode(v);
}
function shadowMode(v){
  const list=[...M.sentences].sort(()=>Math.random()-0.5).slice(0,8);
  const box=document.createElement('div'); box.className='card'; box.style.marginTop='var(--s4)';
  v.appendChild(box);
  let i=0;
  function step(){
    if(i>=list.length){ box.innerHTML=`<div class="note ok">🎉 跟读完成！建议用自己的声音复述每句，再点击 🔊 对比。</div>`; return; }
    const s=list[i];
    box.innerHTML=`<div class="faint">跟读 ${i+1}/${list.length}</div>
      <div class="chat"><div class="bubble ai"><span class="my">${esc(s.my)}</span><span class="rom">${esc(s.rom)}</span></div></div>
      <div class="row" style="margin-top:var(--s3)">
        <button class="btn btn-primary btn-sm" id="play">🔊 播放原句</button>
        <button class="btn btn-line btn-sm" id="next">我读完了 →</button></div>
      <div class="note" style="margin-top:var(--s3)">中文：${esc(s.cn)}</div>`;
    $('#play').onclick=()=>speak(s.my);
    $('#next').onclick=()=>{ i++; step(); };
    speak(s.my);
  }
  step();
}

/* ================= ④ 口语练习 ================= */
function oralMod(v){
  const wrap=document.createElement('div');
  wrap.innerHTML=`<div class="topbar"><div><h2>④ 口语练习</h2>
    <div class="sub">${M.scenes.length} 个生活场景 ｜ 逐轮对话 + 参考回答 + 评估要点</div></div></div>
    <div class="card"><label>选择场景</label><div class="row" id="scenePick"></div><div id="oralBox"></div></div>`;
  v.appendChild(wrap);
  const sp=$('#scenePick');
  M.scenes.forEach((d,i)=>{ const b=document.createElement('button'); b.className='btn btn-line btn-sm'; b.textContent=`${d.scene}（${d.level}）`;
    b.onclick=()=>{ $$('#scenePick button').forEach(x=>x.classList.remove('btn-primary')); b.classList.add('btn-primary'); startOral(d,$('#oralBox')); }; sp.appendChild(b); });
}
function startOral(d,box){
  let step=0;
  function draw(){
    if(step>=d.rounds.length){
      if(!state.oralDone.includes(d.scene)){ state.oralDone.push(d.scene); save(); }
      box.innerHTML=`<div class="note ok">🎉 「${esc(d.scene)}」练习完成！共 ${d.rounds.length} 轮。可换场景继续。</div>
        <div class="row"><button class="btn btn-ghost btn-sm" id="again">重练本场景</button></div>`;
      $('#again').onclick=()=>{ step=0; draw(); }; return;
    }
    const r=d.rounds[step];
    box.innerHTML=`<div class="faint">进度：第 ${step+1}/${d.rounds.length} 轮 · ${esc(d.scene)}</div>
      <div class="chat" style="margin:var(--s3) 0">
        <div class="bubble ai"><span class="my">${esc(r.ai)}</span><span class="rom">${esc(r.ai_rom)}</span><span class="cn">${esc(r.ai_cn)}</span>
          <button class="spk" data-spk="${encodeURIComponent(r.ai)}">🔊</button></div>
      </div>
      <label>你的回答（缅文或中文均可）</label>
      <textarea id="uAns" placeholder="在此输入回答…"></textarea>
      <div class="row" style="margin-top:var(--s3)">
        <button class="btn btn-primary btn-sm" id="reveal">查看参考回答与评估</button></div>
      <div id="evalBox"></div>`;
    $('#reveal').onclick=()=>{
      const ub=$('#uAns').value.trim(); const eb=$('#evalBox');
      eb.innerHTML=`<div class="card" style="margin-top:var(--s3);box-shadow:none;background:var(--c-bg)">
        <div class="faint">你的回答：${ub?esc(ub):'（未填写，可对照自学）'}</div><hr class="sep">
        <div><b>更地道的说法</b><div class="my" style="font-size:18px">${esc(r.ref)}</div><span class="rom">${esc(r.ref_rom)}</span><span class="cn">${esc(r.ref_cn)}</span>
          <button class="spk" data-spk="${encodeURIComponent(r.ref)}">🔊</button></div>
        <div class="note" style="margin-top:var(--s3)"><b>评估要点：</b>${esc(r.note)}</div>
        <div class="row" style="margin-top:var(--s3)"><button class="btn btn-accent btn-sm" id="next">下一轮 →</button></div></div>`;
      $('#next').onclick=()=>{ step++; draw(); };
    };
  }
  draw();
}

/* ================= ⑤ 听力训练 ================= */
function listenMod(v){
  const types=[...new Set(M.listening.map(x=>x.type))];
  const wrap=document.createElement('div');
  wrap.innerHTML=`<div class="topbar"><div><h2>⑤ 听力训练</h2>
    <div class="sub">短对话 / 独白 / 听选 ｜ 听后任务（辨音·填空·问答·选择）</div></div></div>
    <div id="audioBanner5" class="abanner" style="margin-bottom:var(--s4)"></div>
    <div class="card"><label>选择素材（可按题型筛选）</label>
      <div class="row" id="typePick" style="margin:var(--s3) 0;gap:6px"></div>
      <div class="row" id="matPick"></div><div id="lisBox"></div></div>`;
  v.appendChild(wrap);
  const banner=$('#audioBanner5'); if(banner){ const vb=myVoice(); banner.className='abanner '+(vb?'ok':'warn'); banner.innerHTML=vb?'✅ 支持缅甸语发音，可逐句/全文听读。':'⚠ 未检测到缅甸语音包；罗马音对照可用。'; }
  const tp=$('#typePick'); const allT=mkType('全部',null); tp.appendChild(allT);
  types.forEach(t=>tp.appendChild(mkType(t,t)));
  let curType=null;
  function mkType(label,val){ const b=document.createElement('button'); b.className='btn btn-line btn-sm'+(val===curType?' btn-primary':''); b.textContent=label;
    b.onclick=()=>{ curType=val; $$('#typePick button').forEach(x=>x.classList.remove('btn-primary')); b.classList.add('btn-primary'); drawPick(); }; return b; }
  function drawPick(){
    const mp=$('#matPick'); mp.innerHTML='';
    M.listening.filter(m=>!curType||m.type===curType).forEach(m=>{ const b=document.createElement('button'); b.className='btn btn-line btn-sm';
      b.innerHTML=`${esc(m.title)} <span class="badge b-freq-m">${esc(m.speed)}</span> <span class="badge b-type">${esc(m.type)}</span>`;
      b.onclick=()=>{ $$('#matPick button').forEach(x=>x.classList.remove('btn-primary')); b.classList.add('btn-primary'); startListen(m,$('#lisBox')); }; mp.appendChild(b); });
  }
  drawPick();
}
function startListen(m,box){
  box.innerHTML=`<div class="faint">${esc(m.title)} ｜ 题型 ${esc(m.type)} ｜ 语速 ${esc(m.speed)} ｜ 水平 ${esc(m.level)} ｜ ${esc(m.duration)}</div>
    <div class="card" style="margin-top:var(--s3)"><div class="row spread"><b>听力文本</b>
      <button class="btn btn-ghost btn-sm" id="playAll">🔊 朗读全文</button></div>
      <div style="margin-top:var(--s3)">
      ${m.text.map(t=>`<div style="padding:var(--s2) 0;border-bottom:1px dashed var(--c-line)">
        <span class="my" style="font-size:20px">${esc(t.my)}</span>
        <button class="spk" data-spk="${encodeURIComponent(t.my)}">🔊</button>
        <div class="rom">${esc(t.rom)}</div><div class="muted">${esc(t.cn)}</div></div>`).join('')}
      </div></div>
    <div class="card"><h3>听后任务</h3><div id="tasks"></div></div>
    <div class="warn note">难点：${esc(m.note||'')}</div>`;
  $('#playAll').onclick=()=>{ m.text.forEach((t,i)=>setTimeout(()=>speak(t.my), i*1500)); };
  const tb=$('#tasks');
  tb.innerHTML=m.tasks.map((t,i)=>{
    const hasOpt = Array.isArray(t.options);
    const optHtml = hasOpt ? `<div class="row" style="margin-top:6px;gap:6px">${t.options.map(o=>`<button class="btn btn-line btn-sm" data-opt="${encodeURIComponent(o)}">${esc(o)}</button>`).join('')}</div>` : '';
    return `<div data-task="${i}" style="padding:var(--s3) 0;border-bottom:1px solid var(--c-line)">
      <div><b>任务 ${i+1}.</b> ${esc(t.q)}</div>
      ${hasOpt?'':`<div class="row" style="margin-top:6px"><input id="a${i}" placeholder="输入你的答案"><button class="btn btn-line btn-sm" data-i="${i}">核对</button></div>`}
      ${optHtml}
      <div class="feedback" id="fb${i}"></div></div>`;
  }).join('');
  // 选项点击（听选题）
  $$('#tasks [data-opt]',tb).forEach(b=>b.onclick=()=>{
    const taskDiv=b.closest('[data-task]'); const i=+taskDiv.dataset.task;
    const ans=decodeURIComponent(b.dataset.opt); const t=m.tasks[i]; const ok=ans===t.a;
    const fEl=taskDiv.querySelector('.feedback'); fEl.className='feedback show '+(ok?'right':'wrong');
    fEl.innerHTML=ok?'✅ 正确！':('❌ 正确答案：<b>'+esc(t.a)+'</b>');
    $$('[data-opt]',taskDiv).forEach(x=>x.disabled=true);
    markListenDone(m);
  });
  // 填空/问答核对
  $$('#tasks [data-i]',tb).forEach(b=>b.onclick=()=>{ const i=+b.dataset.i; const ans=$('#a'+i).value.trim(); const fb=$('#fb'+i);
    const ok=ans && (m.tasks[i].a.includes(ans)||ans.includes(m.tasks[i].a.replace(/[（(].*$/,'').trim()));
    fb.className='feedback show '+(ok?'right':'wrong');
    fb.innerHTML=ok?'✅ 正确！':(`❌ 参考答案：<b>${esc(m.tasks[i].a)}</b><br><span class="faint">提示：${esc(m.tasks[i].hint)}</span>`);
    markListenDone(m);
  });
}
function markListenDone(m){ if(!state.listenDone.includes(m.title)){ state.listenDone.push(m.title); save(); } }

/* ================= ⑥ 每日一练 ================= */
function dailyMod(v){
  const key=todayKey();
  const wrap=document.createElement('div');
  wrap.innerHTML=`<div class="topbar"><div><h2>⑥ 每日一练</h2>
    <div class="sub">按日期推送：5 个由易到难单词 + 1 递进难度句子 ｜ 发音·测验·复习</div></div></div>
    <div id="audioBanner6" class="abanner" style="margin-bottom:var(--s4)"></div>
    <div id="dBox"></div>`;
  v.appendChild(wrap);
  const banner=$('#audioBanner6'); if(banner){ const vb=myVoice(); banner.className='abanner '+(vb?'':'warn'); banner.innerHTML=vb?'✅ 支持缅甸语发音。':'⚠ 未检测到缅甸语音包；罗马音对照可用。'; }
  const rec=state.daily[key];
  if(rec&&rec.done){ showDailyResult($('#dBox'),rec); return; }
  // 确定性选词：按日期 seed
  const todayWords=pickDailyWords(key,5);
  const todaySent=pickDailySentence(key);
  renderDailyQuiz($('#dBox'),key,todayWords,todaySent);
}
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))>>>0; } return h; }
function seededShuffle(arr,seed){ const a=[...arr]; let s=seed>>>0; for(let i=a.length-1;i>0;i--){ s=(s*1103515245+12345)>>>0; const j=s%(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function pickDailyWords(key,n){
  const byLv=[...M.words].sort((a,b)=>a.lv-b.lv); // 由易到难
  const seed=hashStr(key);
  const maxStart=Math.max(1, byLv.length-n+1);
  const start=seed % maxStart; // 每天窗口起点不同，但保持易→难
  return byLv.slice(start, start+n);
}
function pickDailySentence(key){
  const seed=hashStr(key+'S');
  const sh=seededShuffle(M.sentences,seed);
  return sh[0];
}
function renderDailyQuiz(box,key,words,sent){
  box.innerHTML=`<div class="card"><h3>今日一练 <span class="tag">${key}</span></h3>
    <div class="note">听读下列单词并选出正确中文；完成后复习今日句子。</div>
    <div id="wq"></div>
    <div style="margin-top:var(--s4)"><h3>今日句子（跟读 + 自测）</h3>
      <div class="chat"><div class="bubble ai"><span class="my">${esc(sent.my)}</span><span class="rom">${esc(sent.rom)}</span><span class="cn">${esc(sent.cn)}</span>
        <button class="spk" data-spk="${encodeURIComponent(sent.my)}">🔊</button></div></div>
      <div class="row" style="margin-top:var(--s3)"><button class="btn btn-primary btn-sm" id="playSent">🔊 播放句子</button></div>
    </div>
    <div class="row" style="margin-top:var(--s5)"><button class="btn btn-accent" id="finish">完成今日一练 ✓</button></div>
    </div>`;
  $('#playSent').onclick=()=>speak(sent.my);
  const wq=$('#wq'); let wi=0,score=0; const total=words.length+1;
  function wstep(){
    if(wi>=words.length){
      wq.innerHTML=`<div class="note ok">单词测验完成（${score}/${words.length}）。请听读上方今日句子后点击「完成今日一练」。</div>`;
      return;
    }
    const w=words[wi]; const opts=new Set([w.cn]); while(opts.size<4){ const o=M.words[Math.floor(Math.random()*M.words.length)].cn; opts.add(o); }
    const arr=[...opts].sort(()=>Math.random()-0.5);
    wq.innerHTML=`<div class="faint">单词 ${wi+1}/${words.length}</div>
      <div class="center" style="padding:var(--s3) 0">
        <div class="my big" style="font-size:48px">${esc(w.my)}</div>
        <button class="spk" data-spk="${encodeURIComponent(w.my)}">🔊 ${esc(w.rom)}</button>
        <div class="faint" style="margin-top:4px">选出正确中文：</div>
        <div class="row" style="justify-content:center;margin-top:var(--s3)" id="opts"></div>
        <div class="feedback" id="wfb"></div></div>`;
    const ob=$('#opts');
    arr.forEach(o=>{ const b=document.createElement('button'); b.className='btn btn-line'; b.textContent=o;
      b.onclick=()=>{ const fb=$('#wfb'); const right=(o===w.cn); fb.className='feedback show '+(right?'right':'wrong');
        fb.innerHTML=right?'✅ 正确！':('❌ 正确释义：<b>'+esc(w.cn)+'</b>');
        $$('#opts button').forEach(x=>{x.disabled=true; if(x.textContent===w.cn) x.classList.add('btn-primary');});
        if(right) score++; wi++; setTimeout(wstep,900); };
      ob.appendChild(b); });
  }
  wstep();
  $('#finish').onclick=()=>{
    const finalScore=score; // 句子自测不扣分，计参与
    state.daily[key]={ words:words.map(w=>w.my), sentence:sent.my, score:finalScore, done:true, at:Date.now() };
    save(); showDailyResult(box,{words:words.map(w=>w.my),sentence:sent.my,score:finalScore,done:true});
    toast('今日一练完成！');
  };
}
function showDailyResult(box,rec){
  box.innerHTML=`<div class="card"><h3>今日一练已完成 <span class="tag">${todayKey()}</span></h3>
    <div class="note ok">🎉 得分 <b>${rec.score}/6</b>。复习可巩固记忆，明天将推送新内容。</div>
    <div style="margin-top:var(--s3)">
      <div class="faint">今日单词：</div>
      <div class="row" style="gap:8px;margin-top:6px">${rec.words.map(my=>`<span class="pill"><span class="my">${esc(my)}</span> ${speakBtn(my)}</span>`).join('')}</div>
      <div class="faint" style="margin-top:var(--s3)">今日句子：</div>
      <div class="chat" style="margin-top:6px"><div class="bubble ai"><span class="my">${esc(rec.sentence)}</span>${speakBtn(rec.sentence)}</div></div>
    </div>
    <div class="row" style="margin-top:var(--s4)"><button class="btn btn-line btn-sm" id="replay">重听今日内容</button></div>
    </div>`;
  $('#replay').onclick=()=>{ rec.words.forEach((my,i)=>setTimeout(()=>speak(my),i*900)); setTimeout(()=>speak(rec.sentence),rec.words.length*900); };
}

/* ================= ⑦ 情景对话练习（内置脚本式多轮对话，纯离线、由易到难） ================= */
function dialogueMod(v){
  const wrap=document.createElement('div');
  wrap.innerHTML=`
    <div class="topbar"><div><h2>⑦ 情景对话练习 <span class="tag">内置多轮 · 由易到难</span></h2>
      <div class="sub">每个场景分 初级 / 中级 / 高级，每难度 3–5 个来回；点 ▶ 播放整段，每句可 🔊 跟读，你的回合看参考答案并自评</div></div></div>
    <div id="audioBanner7" class="abanner" style="margin-bottom:var(--s4)"></div>
    <div class="card" id="dlgPick">
      <div class="faint" style="margin-bottom:8px">① 选择生活场景：</div>
      <div class="row scrollx" id="sceneRow" style="gap:8px;flex-wrap:wrap"></div>
    </div>
    <div class="card hidden" id="dlgPlay" style="margin-top:var(--s4)">
      <div class="row spread" style="margin-bottom:var(--s3)">
        <div><b id="dlgScene"></b> <span class="badge b-type" id="diffBadge">难度：—</span></div>
        <div class="row" style="gap:6px">
          <button class="btn btn-line btn-sm" id="playAll">▶ 播放整段</button>
          <button class="btn btn-ghost btn-sm" id="nextLv">🔄 下一轮（提高难度）</button>
          <button class="btn btn-ghost btn-sm" id="backPick">← 换场景</button>
        </div>
      </div>
      <div class="faint" id="dlgIntro" style="margin-bottom:var(--s3)"></div>
      <div id="dlgLog" class="chat" style="max-height:520px;overflow:auto;padding:4px"></div>
    </div>`;
  v.appendChild(wrap);

  const banner=$('#audioBanner7'); if(banner){ const vb=myVoice(); banner.className='abanner '+(vb?'ok':'warn'); banner.innerHTML=vb?'✅ 本设备支持缅甸语发音，可点 🔊 逐句跟读。':'⚠ 未检测到缅甸语音包；罗马音与中文对照始终可用，可安装缅甸语语音后听读。'; }

  // 顶部场景选择
  const row=$('#sceneRow');
  M.dialogues.forEach((d,i)=>{
    const b=document.createElement('button'); b.className='btn btn-line'; b.style.textAlign='left';
    const done=(state.dialogueDone||[]).filter(k=>k.startsWith(d.scene+'|')).length;
    b.innerHTML=`<b>${esc(d.icon||'💬')} ${esc(d.scene)}</b><br><span class="faint" style="font-size:11px">${d.levels.length} 难度 · 已练 ${done}</span>`;
    b.onclick=()=>openScene(i);
    row.appendChild(b);
  });

  let cur=null, curLvIdx=0, aspeakSeq=[];
  function openScene(i){
    cur=M.dialogues[i]; curLvIdx=0;
    $('#dlgPick').classList.add('hidden'); $('#dlgPlay').classList.remove('hidden');
    drawLevel();
  }
  function drawLevel(){
    const lv=cur.levels[curLvIdx];
    $('#dlgScene').textContent=cur.icon+' '+cur.scene;
    $('#diffBadge').textContent='难度：'+lv.level;
    $('#dlgIntro').textContent=lv.intro;
    const log=$('#dlgLog'); log.innerHTML=''; aspeakSeq=[];
    lv.turns.forEach(t=>{
      const d=document.createElement('div');
      if(t.sp==='A'){
        d.className='bubble ai';
        d.innerHTML=`<span class="spk-role">对方：</span><span class="my">${esc(t.my)}</span>${speakBtn(t.my)}<span class="rom">${esc(t.rom)}</span><span class="cn">${esc(t.cn)}</span>`;
      } else {
        d.className='me-wrap';
        d.innerHTML=`<div class="spk-role">轮到你（参考回答）：</div>
          <div class="bubble me"><span class="my">${esc(t.my)}</span>${speakBtn(t.my)}<span class="rom">${esc(t.rom)}</span><span class="cn">${esc(t.cn)}</span></div>
          <div class="row" style="margin-top:6px;gap:6px">
            <button class="btn btn-line btn-sm act-ok" data-my="${encodeURIComponent(t.my)}">✅ 我会了</button>
            <button class="btn btn-ghost btn-sm act-again" data-my="${encodeURIComponent(t.my)}">🔁 再练一次</button>
          </div>`;
      }
      log.appendChild(d);
      aspeakSeq.push(t.my);
    });
    $$('.act-ok',log).forEach(b=>b.onclick=()=>{ b.textContent='✅ 已掌握'; b.disabled=true; b.classList.add('done'); markDone(cur.scene+'|'+lv.level); toast('已记录掌握'); });
    $$('.act-again',log).forEach(b=>b.onclick=()=>{ speak(decodeURIComponent(b.dataset.my)); toast('再听一遍'); });
    log.scrollTop=0;
  }
  function markDone(key){ state.dialogueDone=state.dialogueDone||[]; if(!state.dialogueDone.includes(key)){ state.dialogueDone.push(key); save(); } }

  $('#playAll').onclick=()=>{
    if(!('speechSynthesis' in window)){ toast('当前浏览器不支持语音'); return; }
    let i=0;
    (function next(){ if(i>=aspeakSeq.length) return; speak(aspeakSeq[i],0.85); i++; setTimeout(next, 1400); })();
  };
  $('#nextLv').onclick=()=>{
    if(curLvIdx < cur.levels.length-1){ curLvIdx++; drawLevel(); toast('已切换到 '+cur.levels[curLvIdx].level); }
    else toast('已是最高难度（'+cur.levels[curLvIdx].level+'）');
  };
  $('#backPick').onclick=()=>{ $('#dlgPlay').classList.add('hidden'); $('#dlgPick').classList.remove('hidden'); };
}

/* ================= 启动 ================= */
function boot(){
  buildNav();
  go(state._last && MODULES.some(m=>m.id===state._last)?state._last:'home');
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
