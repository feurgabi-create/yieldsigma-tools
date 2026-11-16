/* Yield Sigma(TM) "All tools" menu for the standalone tool pages (Stardust Capital Labs, Nov 2026)
   History, heat maps, directory, macro and calculator get the same All tools pill as the cards,
   top left, so every page links to every other page and back to the card.
   Hidden when a page is opened over a card (?embed=1: the card's own bar has the menu) or inside
   the workspace (?ws=1). The page puts <div id="ysToolsSlot"></div> where the pill goes. */
(function(){
  var q;try{q=new URLSearchParams(location.search);}catch(e){q=null;}
  if(q&&(q.get('embed')==='1'||q.get('ws')==='1'))return;
  var B='https://tools.yieldsigma.com/',file=(location.pathname.split('/').pop()||'').toLowerCase();
  var t=q?(q.get('t')||q.get('ticker')||''):'';t=t.toUpperCase().replace(/[^A-Z0-9.\- ]/g,'');
  var items=[
    ['card-undervalued.html'+(t?'?ticker='+encodeURIComponent(t):''),'Yield Sigma card',t||''],
    ['yield-sigma-history.html'+(t?'?t='+encodeURIComponent(t):''),'Full history',t||''],
    ['compound-calculator.html','Compound calculator',''],
    ['heat-map-stocks.html','Heat map','Stocks'],
    ['heat-map-reits.html','Heat map','REITs'],
    ['card-macro.html','Macro','Universe stats'],
    ['directory.html','Directory','All names'],
    ['workspace.html'+(t?'?t='+encodeURIComponent(t):''),'Workspace','All tools, one screen']
  ];
  var css='.ysTM{position:relative;display:inline-block;font-family:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace}'+
    '.ysTMBtn{display:inline-flex;align-items:center;gap:9px;font-family:inherit;font-size:12px;font-weight:600;line-height:1;color:var(--jade);background:transparent;border:1px solid var(--jade);border-radius:20px;padding:7px 13px;cursor:pointer}'+
    '.ysTMBtn:hover,.ysTMBtn[aria-expanded="true"]{background:var(--jade);color:var(--paper,var(--panel,#fff))}'+
    '.ysTMBtn i{width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateY(-2px) rotate(45deg);transition:transform .15s}'+
    '.ysTMBtn[aria-expanded="true"] i{transform:translateY(2px) rotate(-135deg)}'+
    '.ysTMMenu{position:absolute;top:calc(100% + 6px);left:0;width:250px;display:none;background:var(--paper,var(--panel,#fff));border:1px solid var(--rule);border-radius:10px;box-shadow:0 14px 34px -14px rgba(10,25,20,.38);padding:6px;z-index:50}'+
    '.ysTMMenu.on{display:block}'+
    '.ysTMMenu a{display:flex;align-items:center;justify-content:space-between;gap:10px;text-decoration:none;border-radius:7px;padding:8px 10px;font-family:inherit;font-size:12.5px;font-weight:500;line-height:1.25;color:var(--ink)}'+
    '.ysTMMenu a:hover{background:var(--jade-soft,rgba(31,122,82,.1))}'+
    '.ysTMMenu a.cur{color:var(--muted);pointer-events:none}'+
    '.ysTSlot{position:absolute;top:12px;left:12px;z-index:6}'+
    'html.hasTM .sheet{padding-top:58px!important}html.hasTM .wrap{padding-top:46px}'+
    '.ysTMMenu small{font-family:inherit;font-size:10px;font-weight:600;line-height:1;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}';
  function build(){
    var slot=document.getElementById('ysToolsSlot');if(!slot)return;
    document.documentElement.classList.add('hasTM');
    var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    var h='<div class="ysTM"><button type="button" class="ysTMBtn" aria-haspopup="true" aria-expanded="false">All tools<i aria-hidden="true"></i></button><div class="ysTMMenu" role="menu">';
    items.forEach(function(it){var f=it[0].split('?')[0],cur=f===file;
      h+='<a role="menuitem" href="'+B+it[0]+'"'+(cur?' class="cur" aria-current="page"':'')+'>'+it[1]+(it[2]?'<small>'+it[2]+'</small>':'')+'</a>';});
    h+='</div></div>';
    slot.innerHTML=h;
    var b=slot.querySelector('.ysTMBtn'),m=slot.querySelector('.ysTMMenu');
    b.addEventListener('click',function(e){e.stopPropagation();var on=!m.classList.contains('on');m.classList.toggle('on',on);b.setAttribute('aria-expanded',on?'true':'false');});
    document.addEventListener('click',function(e){if(!(e.target.closest&&e.target.closest('.ysTM'))){m.classList.remove('on');b.setAttribute('aria-expanded','false');}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
