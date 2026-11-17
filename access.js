/* Yield Sigma(TM) member access (Stardust Capital Labs, Nov 2026)
   A paying member opens any tools page once with ?code=THE-CODE. This browser remembers it,
   and every lock on every tools.yieldsigma.com page opens (directory cards, card search).
   ?code=off forgets it (to see the pages as a visitor again).
   CODES holds a hash of each valid code, never the code itself. Retire a code by removing its line:
   browsers holding it go back to visitor view on their next visit. */
(function(){
  var KEY='ysAccess';
  var CODES={
    '87e2df92':'Nov 2026'
  };
  function h(s){s=String(s||'').trim().toUpperCase();var x=2166136261;for(var i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)>>>0;}return x.toString(16);}
  function get(){try{return localStorage.getItem(KEY)||'';}catch(e){return '';}}
  function set(v){try{if(v)localStorage.setItem(KEY,v);else localStorage.removeItem(KEY);}catch(e){}}
  try{
    var q=new URLSearchParams(location.search),c=q.get('code');
    if(c!==null){
      if(c.toLowerCase()==='off')set('');
      else if(CODES[h(c)])set(h(c));
      q.delete('code');
      var u=location.pathname+(q.toString()?'?'+q.toString():'')+location.hash;
      history.replaceState(null,'',u);
    }
  }catch(e){}
  window.YS_ACCESS={ok:function(){return !!CODES[get()];}};
  /* members: every Subscribe pill reads "Member ✓" and the Premium tag on the history page goes away */
  if(window.YS_ACCESS.ok()){
    document.documentElement.classList.add('ysMember');
    var css='html.ysMember .premstack .lock{display:none}html.ysMember .premstack .subpill{position:static;margin-left:6px}';
    function fix(root){(root.querySelectorAll?root:document).querySelectorAll('a[href*="substack.com/subscribe"].subpill,a[href*="substack.com/subscribe"].subPill').forEach(function(a){
      a.textContent='Member ✓';a.href='https://gabe948456.substack.com/';a.title='You have member access';});}
    function go(){var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);fix(document);
      try{new MutationObserver(function(){fix(document);}).observe(document.body,{childList:true,subtree:true});}catch(e){}}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
  }
})();
