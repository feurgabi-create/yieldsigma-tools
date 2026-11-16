/* Yield Sigma(TM) light / dark switch (Stardust Capital Labs, Nov 2026)
   One choice for every tools.yieldsigma.com page: pages always start light; a visitor's
   switch to dark is remembered in this browser and applies to every page and every
   workspace tile at once (pages on the same site share the stored choice and hear changes).
   Load it in <head>, before the page's own styles run, so a dark page never flashes light.
   Pages read YS_THEME.dark, call YS_THEME.toggle(), and register YS_THEME.on(fn) to redraw. */
(function(){
  var KEY='ysTheme',fns=[];
  function stored(){try{return localStorage.getItem(KEY)==='dark';}catch(e){return false;}}
  function apply(d){
    T.dark=d;
    document.documentElement.setAttribute('data-theme',d?'dark':'light');
    var b=document.querySelectorAll('.ysThemeBtn');
    for(var i=0;i<b.length;i++){b[i].setAttribute('aria-pressed',d?'true':'false');b[i].title=d?'Switch to light':'Switch to dark';}
    fns.forEach(function(f){try{f(d);}catch(e){}});
  }
  var T={dark:false,
    on:function(f){fns.push(f);},
    set:function(d){try{localStorage.setItem(KEY,d?'dark':'light');}catch(e){}apply(!!d);},
    toggle:function(){T.set(!T.dark);},
    /* a small sun / moon button; the page places it and styles it with .ysThemeBtn */
    button:function(){return '<button type="button" class="ysThemeBtn" aria-label="Dark mode" aria-pressed="'+(T.dark?'true':'false')+'" title="'+(T.dark?'Switch to light':'Switch to dark')+'" onclick="YS_THEME.toggle()">'+
      '<svg class="sun" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'+
      '<svg class="moon" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>';}
  };
  window.YS_THEME=T;
  T.dark=stored();
  document.documentElement.setAttribute('data-theme',T.dark?'dark':'light');
  /* another page or workspace tile switched: follow it */
  window.addEventListener('storage',function(e){if(e.key===KEY)apply(e.newValue==='dark');});
  document.addEventListener('DOMContentLoaded',function(){apply(T.dark);});
})();
