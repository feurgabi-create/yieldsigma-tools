/* Yield Sigma(TM) watchlist (Stardust Capital Labs, Nov 2026)
   One list per browser, shared by every tools.yieldsigma.com page (directory, card…).
   No sign-up: the list lives in this browser; a link with ?w=KO,MZTI,CAT brings it to any device.
   Pages use YS_WATCH.has(t), YS_WATCH.toggle(t), YS_WATCH.list(), YS_WATCH.star(t), YS_WATCH.on(fn). */
(function(){
  var KEY='ysWatch',fns=[];
  var MEM=[];
  var norm=function(t){return String(t||'').trim().toUpperCase();};
  function read(){try{var v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v.map(norm).filter(Boolean):[];}catch(e){return MEM.slice();}}
  function write(a){MEM=a.slice();try{localStorage.setItem(KEY,JSON.stringify(a));}catch(e){}fns.forEach(function(f){try{f(a.slice());}catch(e){}});}
  /* a shared link adds its names to this browser's list */
  try{var w=new URLSearchParams(location.search).get('w');
    if(w){var a=read();w.split(',').map(norm).filter(Boolean).forEach(function(t){if(a.indexOf(t)<0)a.push(t);});write(a);}}catch(e){}
  var W={
    list:function(){return read();},
    has:function(t){return read().indexOf(norm(t))>=0;},
    toggle:function(t){t=norm(t);if(!t)return false;var a=read(),i=a.indexOf(t);if(i>=0)a.splice(i,1);else a.push(t);write(a);return i<0;},
    on:function(f){fns.push(f);},
    link:function(){return 'https://tools.yieldsigma.com/directory.html?w='+read().map(encodeURIComponent).join(',');},
    star:function(t,extra){var on=W.has(t);return '<button type="button" class="ysStar'+(on?' on':'')+'" data-star="'+norm(t).replace(/"/g,'')+'" aria-pressed="'+on+'" title="'+(on?'Remove from my watchlist':'Add to my watchlist')+'"'+(extra||'')+'>'+(on?'★':'☆')+'</button>';}
  };
  window.YS_WATCH=W;
  /* another tab or workspace tile changed the list */
  window.addEventListener('storage',function(e){if(e.key===KEY)fns.forEach(function(f){try{f(read());}catch(x){}});});
})();
