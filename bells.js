/* Yield Sigma(TM) alert bells, shared by the tools pages (Stardust Capital Labs, Nov 2026)
   One condition per name, saved in this browser only (localStorage "ysBells", the same store the directory uses).
   A bell rings (gold, wiggling) when its condition is true at a check; "Keep armed" quiets it until the condition
   has been false and comes true again. Pages call:
     YS_BELLS.btn(t)               bell button html for ticker t (data-ysbell)
     YS_BELLS.check(t,vals)        check one name: vals = {sigma, yld (dividend yield %), price}
     YS_BELLS.refresh()            redraw every bell button on the page from the store
     YS_BELLS.on(fn)               called when an alert changes (this tab or another)
   Setting a bell on a name that isn't on the watchlist adds it there (the directory shows bells in that view). */
(function(){
  var KEY='ysBells',fns=[],MEM={},VALS={};
  var K={sigUp:['Yield Sigma at or above','σ'],sigDn:['Yield Sigma at or below','σ'],yldUp:['Dividend yield at or above','%'],pxDn:['Stock price at or below','$'],pxUp:['Stock price at or above','$']};
  var norm=function(t){return String(t||'').trim().toUpperCase();};
  var esc=function(s){return String(s===null||s===undefined?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  function all(){try{var v=JSON.parse(localStorage.getItem(KEY)||'{}');return v&&typeof v==='object'?v:{};}catch(e){return MEM;}}
  function put(a){MEM=a;try{localStorage.setItem(KEY,JSON.stringify(a));}catch(e){}fns.forEach(function(f){try{f();}catch(x){}});}
  function now(v,k){if(!v)return null;var x=k.indexOf('sig')===0?v.sigma:k==='yldUp'?v.yld:v.price;return (x===null||x===undefined||!isFinite(x))?null:x;}
  function met(v,b){var x=now(v,b.k);if(x===null)return null;return (b.k==='sigUp'||b.k==='yldUp'||b.k==='pxUp')?x>=b.v:x<=b.v;}
  function fmt(k,v){if(v===null||v===undefined)return '–';var u=K[k][1];var t=function(n,d){return n.toFixed(d).replace(/\.?0+$/,'');};
    return u==='σ'?(v>=0?'+':'−')+Math.abs(v).toFixed(2)+'σ':u==='%'?t(v,2)+'%':'$'+v.toFixed(2);}
  var SVG='<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 1.8a3.9 3.9 0 0 0-3.9 3.9v2.6L2.8 10.6v.9h10.4v-.9l-1.3-2.3V5.7A3.9 3.9 0 0 0 8 1.8z" style="fill:currentColor;fill-opacity:var(--bf,0)" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.4 12.8a1.6 1.6 0 0 0 3.2 0" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  function state(t){var b=all()[norm(t)];return !b?'':b.hit&&!b.ack?'ring':b.hit?'met':'arm';}
  function title(t){var b=all()[norm(t)];if(!b)return 'Set an alert for '+norm(t);return (b.hit&&!b.ack?'Alert rang: ':'Alert: ')+K[b.k][0]+' '+fmt(b.k,b.v);}
  var css='.ysBell{border:0;background:none;padding:2px;cursor:pointer;line-height:0;border-radius:6px;align-self:center;color:var(--muted,var(--c-muted,#5E6F63));opacity:.55}'+
    '.ysBell:hover{opacity:1;color:var(--jade,var(--c-jade,#1F7A52))}.ysBell svg{display:block}'+
    '.ysBell.arm{opacity:1;color:var(--jade,var(--c-jade,#1F7A52))}.ysBell.met{opacity:1;color:var(--gold,var(--c-gold,#9A6B12));--bf:.35}'+
    '.ysBell.ring{opacity:1;color:var(--gold,var(--c-gold,#9A6B12));--bf:1}.ysBell.ring svg{transform-origin:50% 12%;animation:ysBellRing 1.1s ease-in-out infinite}'+
    '@keyframes ysBellRing{0%,100%{transform:rotate(0)}15%{transform:rotate(14deg)}30%{transform:rotate(-12deg)}45%{transform:rotate(8deg)}60%{transform:rotate(-5deg)}75%{transform:rotate(0)}}'+
    '.ysBellPop{position:absolute;z-index:80;width:290px;background:var(--paper,var(--c-paper,#fff));color:var(--ink,var(--c-ink,#132419));border:1px solid var(--rule,var(--c-rule,#D2DBD1));border-radius:10px;box-shadow:0 14px 34px -14px rgba(10,25,20,.38);padding:12px 14px;font:500 12px/1.4 "JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;text-align:left}'+
    '.ysBellPop h5{margin:0 0 8px;font:700 12.5px/1.3 inherit}.ysBellPop .bpRang{margin:0 0 10px;padding:7px 9px;border-radius:7px;background:rgba(209,176,108,.22)}'+
    '.ysBellPop select,.ysBellPop input{font:inherit;padding:5px 7px;border:1px solid var(--rule,var(--c-rule,#D2DBD1));border-radius:6px;background:transparent;color:inherit}'+
    '.ysBellPop .bpRow{display:flex;gap:6px;align-items:center;margin-bottom:8px}.ysBellPop input{width:90px}.ysBellPop .bpNow{opacity:.7;font-size:11.5px;margin:0 0 10px}'+
    '.ysBellPop .bpBtns{display:flex;gap:8px;flex-wrap:wrap}.ysBellPop button{font:inherit;font-weight:600;border-radius:999px;padding:5px 11px;cursor:pointer;border:1px solid var(--jade,var(--c-jade,#1F7A52));background:transparent;color:var(--jade,var(--c-jade,#1F7A52))}'+
    '.ysBellPop button.pri{background:var(--jade,var(--c-jade,#1F7A52));color:var(--paper,var(--c-paper,#fff))}.ysBellPop button.x{position:absolute;top:6px;right:8px;border:0;padding:2px 6px;opacity:.6}';
  var st=document.createElement('style');st.textContent=css;(document.head||document.documentElement).appendChild(st);
  var B={
    K:K,SVG:SVG,all:all,get:function(t){return all()[norm(t)]||null;},fmt:fmt,
    btn:function(t,extra){return '<button type="button" class="ysBell '+state(t)+'" data-ysbell="'+esc(norm(t))+'" title="'+esc(title(t))+'"'+(extra||'')+'>'+SVG+'</button>';},
    check:function(t,v){t=norm(t);VALS[t]=v;var a=all(),b=a[t];if(!b)return;var m=met(v,b);if(m===null)return;
      var today=new Date().toISOString().slice(0,10),ch=false;
      if(m&&!b.hit){b.hit=today;b.ack=false;ch=true;}else if(!m&&b.hit){b.hit=null;b.ack=false;ch=true;}
      if(ch)put(a);else B.refresh();},
    refresh:function(){Array.prototype.forEach.call(document.querySelectorAll('[data-ysbell]'),function(el){var t=el.getAttribute('data-ysbell');
      el.className='ysBell '+state(t);el.title=title(t);});},
    ringing:function(){var a=all();return Object.keys(a).filter(function(t){return a[t].hit&&!a[t].ack;}).length;},
    on:function(f){fns.push(f);}
  };
  window.YS_BELLS=B;
  fns.push(function(){B.refresh();});
  window.addEventListener('storage',function(e){if(e.key===KEY)fns.forEach(function(f){try{f();}catch(x){}});});
  /* popover */
  function close(){var p=document.getElementById('ysBellPop');if(p)p.remove();}
  function open(btn){
    close();var t=btn.getAttribute('data-ysbell'),b=B.get(t),v=VALS[t]||null,k=b?b.k:'sigUp';
    var p=document.createElement('div');p.className='ysBellPop';p.id='ysBellPop';p.setAttribute('data-t',t);
    var rang=b&&b.hit?'<p class="bpRang">'+(b.ack?'Condition met':'Rang')+': '+esc(K[b.k][0])+' <b>'+esc(fmt(b.k,b.v))+'</b> · now <b>'+esc(fmt(b.k,now(v,b.k)))+'</b> · since '+esc(new Date(b.hit+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'}))+'</p>':'';
    p.innerHTML='<button type="button" class="x" data-bp="close" aria-label="Close">✕</button><h5>Alert for '+esc(t)+'</h5>'+rang+
      '<div class="bpRow"><select data-bp-k>'+Object.keys(K).map(function(x){return '<option value="'+x+'"'+(x===k?' selected':'')+'>'+K[x][0]+'</option>';}).join('')+'</select>'+
      '<input data-bp-v type="text" inputmode="decimal" value="'+(b?esc(String(b.v)):'')+'" placeholder="level"></div><p class="bpNow"></p>'+
      '<div class="bpBtns"><button type="button" class="pri" data-bp="save">'+(b?'Update':'Set alert')+'</button>'+(b&&b.hit&&!b.ack?'<button type="button" data-bp="ack">Keep armed</button>':'')+(b?'<button type="button" data-bp="del">Remove</button>':'')+'</div>';
    document.body.appendChild(p);
    var rc=btn.getBoundingClientRect(),W=document.documentElement.clientWidth;
    p.style.left=(window.scrollX+Math.max(8,Math.min(rc.left-140,W-300)))+'px';p.style.top=(window.scrollY+rc.bottom+6)+'px';
    var sel=p.querySelector('[data-bp-k]'),inp=p.querySelector('[data-bp-v]'),nw=p.querySelector('.bpNow');
    var line=function(){nw.textContent=v?'Now: '+fmt(sel.value,now(v,sel.value)):'';};line();sel.addEventListener('change',line);inp.focus();
    inp.addEventListener('keydown',function(e){if(e.key==='Enter')p.querySelector('[data-bp="save"]').click();if(e.key==='Escape')close();});
    p.addEventListener('click',function(e){var x=e.target.closest('[data-bp]');if(!x)return;var act=x.getAttribute('data-bp'),a=all();
      if(act==='close'){close();return;}
      if(act==='del'){delete a[t];put(a);close();return;}
      if(act==='ack'){if(a[t]){a[t].ack=true;put(a);}close();return;}
      if(act==='save'){var val=parseFloat(String(inp.value).replace(/[$%σ,\s+]/g,'').replace('−','-'));
        if(!isFinite(val)){inp.focus();inp.style.borderColor='#DA8A6E';return;}
        var m=v?met(v,{k:sel.value,v:val}):false;
        a[t]={k:sel.value,v:val,hit:m?new Date().toISOString().slice(0,10):null,ack:false};put(a);
        if(window.YS_WATCH&&!YS_WATCH.has(t))YS_WATCH.toggle(t);
        close();}
    });
  }
  document.addEventListener('click',function(e){
    var bb=e.target.closest&&e.target.closest('[data-ysbell]');
    if(bb){e.preventDefault();e.stopPropagation();var o=document.getElementById('ysBellPop');if(o&&o.getAttribute('data-t')===bb.getAttribute('data-ysbell')){close();return;}open(bb);return;}
    if(!(e.target.closest&&e.target.closest('#ysBellPop')))close();
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
})();
