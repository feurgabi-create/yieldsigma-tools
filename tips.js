/* Yield Sigma(TM) header tips (Stardust Capital Labs, Nov 2026)
   House standard for explanations: any element with data-tip="..." gets a dotted underline; hovering (desktop)
   or tapping (phone) opens a small popover with the explanation. Click elsewhere or Esc closes it.
   The tip text may use <b>. */
(function(){
  var css='[data-tip]{text-decoration:underline dotted;text-decoration-thickness:1px;text-underline-offset:3px;cursor:help}'+
    '[data-tip]:hover,[data-tip].tipOn{text-decoration-style:solid;color:var(--jade,var(--c-jade,#1F7A52))}'+
    '.ysTip{position:absolute;z-index:90;max-width:290px;background:var(--paper,var(--c-paper,#fff));color:var(--ink,var(--c-ink,#132419));'+
    'border:1px solid var(--rule,var(--c-rule,#D2DBD1));border-radius:9px;box-shadow:0 12px 30px -14px rgba(10,25,20,.4);padding:9px 12px;'+
    'font:400 12.5px/1.5 system-ui,"Segoe UI",sans-serif;text-transform:none;letter-spacing:0;text-align:left;white-space:normal;pointer-events:none}'+
    '.ysTip b{font-weight:650}';
  var st=document.createElement('style');st.textContent=css;(document.head||document.documentElement).appendChild(st);
  var tip=null,cur=null,pinned=false;
  function hide(){if(tip){tip.remove();tip=null;}if(cur)cur.classList.remove('tipOn');cur=null;pinned=false;}
  function show(el){
    if(cur===el&&tip)return;hide();cur=el;el.classList.add('tipOn');
    tip=document.createElement('div');tip.className='ysTip';tip.setAttribute('role','tooltip');tip.innerHTML=el.getAttribute('data-tip');
    document.body.appendChild(tip);
    var r=el.getBoundingClientRect(),W=document.documentElement.clientWidth,tw=tip.offsetWidth;
    var left=Math.max(8,Math.min(r.left+r.width/2-tw/2,W-tw-8));
    tip.style.left=(window.scrollX+left)+'px';tip.style.top=(window.scrollY+r.bottom+6)+'px';
  }
  document.addEventListener('mouseover',function(e){var el=e.target.closest&&e.target.closest('[data-tip]');if(el&&!pinned)show(el);});
  document.addEventListener('mouseout',function(e){var el=e.target.closest&&e.target.closest('[data-tip]');if(el&&!pinned&&!(e.relatedTarget&&el.contains(e.relatedTarget)))hide();});
  document.addEventListener('click',function(e){var el=e.target.closest&&e.target.closest('[data-tip]');
    if(el){if(pinned&&cur===el){hide();return;}show(el);pinned=true;return;}if(tip)hide();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')hide();});
  window.addEventListener('scroll',function(){if(tip&&!pinned)hide();},{passive:true});
})();
