/* Yield Sigma(TM) sign-in and sync (Stardust Capital Labs, Nov 2026)
   Sign-in through Firebase (project yield-sigma, sign-in pages on auth.yieldsigma.com): Google, or a
   one-time link sent by email (no password). Optional: every page works without it.
   Signed in, the watchlist, price alerts and presets this browser keeps (localStorage keys in SYNC)
   are saved to the visitor's account (Firestore users/{uid}) and follow them to any device.
   - First sign-in on a browser merges that browser's lists with the saved ones (nothing is lost).
   - After that, every change on any page is saved; changes from another device arrive live and
     reach the pages through the same 'storage' event the pages already listen to.
   - The button sits next to the light / dark switch on every page (placed automatically).
   - Firebase loads only when the visitor clicks Sign in, or was signed in before on this browser.
   Pages may use YS_AUTH.user (null or {uid,email,name}) and YS_AUTH.on(fn). */
(function(){
  if(window.YS_AUTH)return;
  var V='10.12.2',SDK='https://www.gstatic.com/firebasejs/'+V+'/';
  var CFG={apiKey:"AIzaSyBMoVUKGQfvFMtDfo8Vexw8th3tADBBeR8",authDomain:"auth.yieldsigma.com",projectId:"yield-sigma",
    storageBucket:"yield-sigma.firebasestorage.app",messagingSenderId:"281792973419",appId:"1:281792973419:web:dc8a668218eb1d9bfabf2e"};
  var SYNC=['ysWatch','ysBells','ysPresets'];   /* lists that follow the account (ETFs live in their own collection) */
  var FLAG='ysAuthed',MERGED='ysAuthMerged',fns=[],A={user:null,profile:{},on:function(f){fns.push(f);}};
  window.YS_AUTH=A;
  var q;try{q=new URLSearchParams(location.search);}catch(e){q=null;}
  var hideBtn=q&&(q.get('embed')==='1'||q.get('ws')==='1');
  function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else RAW.call(localStorage,k,v);}catch(e){return null;}}
  function flag(v){try{if(v)localStorage.setItem(FLAG,'1');else localStorage.removeItem(FLAG);}catch(e){}}
  function emit(){fns.forEach(function(f){try{f(A.user);}catch(e){}});draw();}

  /* ---- watch writes to the synced keys (any page, any script) ---- */
  var RAW=Storage.prototype.setItem,RAWDEL=Storage.prototype.removeItem,dirty={},timer=null;
  try{
    Storage.prototype.setItem=function(k,v){RAW.apply(this,arguments);if(this===localStorage&&SYNC.indexOf(k)>=0)mark(k);};
    Storage.prototype.removeItem=function(k){RAWDEL.apply(this,arguments);if(this===localStorage&&SYNC.indexOf(k)>=0)mark(k);};
  }catch(e){}
  function mark(k){if(!A.user)return;dirty[k]=1;clearTimeout(timer);timer=setTimeout(push,700);}

  /* ---- Firebase, loaded on demand ---- */
  var fb=null,db=null,unsub=null,loading=null;
  function script(src){return new Promise(function(ok,no){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s);});}
  function load(){
    if(loading)return loading;
    loading=script(SDK+'firebase-app-compat.js').then(function(){return Promise.all([script(SDK+'firebase-auth-compat.js'),script(SDK+'firebase-firestore-compat.js')]);})
      .then(function(){fb=window.firebase;if(!fb.apps.length)fb.initializeApp(CFG);db=fb.firestore();
        fb.auth().onAuthStateChanged(function(u){A.known=true;u?signedIn(u):signedOut();});});
    return loading;
  }
  function userDoc(){return db.collection('users').doc(A.user.uid);}

  /* ---- merge rules: lists add up; for keyed objects the saved account wins a clash ---- */
  function parse(s){try{return JSON.parse(s);}catch(e){return null;}}
  function merge(k,local,cloud){
    if(local==null)return cloud;if(cloud==null)return local;
    var L=parse(local),C=parse(cloud);
    if(Array.isArray(L)&&Array.isArray(C)){
      if(k==='ysETF'){var by={};C.forEach(function(e){if(e&&e.sym)by[e.sym]=e;});L.forEach(function(e){if(e&&e.sym&&!by[e.sym])C.push(e);});return JSON.stringify(C);}
      L.forEach(function(t){if(C.indexOf(t)<0)C.push(t);});return JSON.stringify(C);}
    if(L&&C&&typeof L==='object'&&typeof C==='object'){Object.keys(L).forEach(function(t){if(!(t in C))C[t]=L[t];});return JSON.stringify(C);}
    return cloud;
  }
  function setLocal(k,v){var old=ls(k);if(old===v)return;
    if(v==null)try{RAWDEL.call(localStorage,k);}catch(e){} else ls(k,v);
    try{window.dispatchEvent(new StorageEvent('storage',{key:k,oldValue:old,newValue:v,storageArea:localStorage}));}catch(e){}}

  function signedIn(u){
    chooser(false);
    A.user={uid:u.uid,email:u.email||'',name:u.displayName||'',photo:u.photoURL||''};flag(true);
    var ref=userDoc();
    ref.get().then(function(snap){
      var d=snap.exists?snap.data():{},data=d.data||{},up={},first=!snap.exists;
      /* first sign-in on this browser: add this browser's lists to the account; after that the account leads,
         so a name removed on another device stays removed here */
      var merged=ls(MERGED)===u.uid;
      SYNC.forEach(function(k){var loc=ls(k),cl=data[k]==null?null:data[k],m=merged?(cl!=null?cl:loc):merge(k,loc,cl);if(m==null)return;setLocal(k,m);if(m!==cl)up['data.'+k]=m;});
      ls(MERGED,u.uid);
      A.profile={newsletter:!!d.newsletter};
      var base={email:A.user.email,name:A.user.name,lastSeen:fb.firestore.FieldValue.serverTimestamp()};
      if(first){base.created=fb.firestore.FieldValue.serverTimestamp();base.newsletter=false;var o={};Object.keys(up).forEach(function(p){o[p.slice(5)]=up[p];});base.data=o;return ref.set(base);}
      Object.keys(up).forEach(function(p){base[p]=up[p];});return ref.update(base);
    }).then(function(){
      if(unsub)unsub();
      unsub=ref.onSnapshot(function(s){if(!s.exists)return;var d=s.data(),data=d.data||{};A.profile={newsletter:!!d.newsletter};
        if(!s.metadata.hasPendingWrites)SYNC.forEach(function(k){if(data[k]!=null&&!dirty[k])setLocal(k,data[k]);});draw();});
    }).catch(function(e){console.warn('[YS_AUTH] sync',e&&e.code||e);});
    emit();
  }
  function signedOut(){if(unsub){unsub();unsub=null;}A.user=null;A.profile={};flag(false);emit();}
  function push(){if(!A.user||!db)return;var up={},ks=Object.keys(dirty);dirty={};if(!ks.length)return;
    ks.forEach(function(k){var v=ls(k);up['data.'+k]=v==null?fb.firestore.FieldValue.delete():v;});
    userDoc().update(up).catch(function(e){console.warn('[YS_AUTH] save',e&&e.code||e);ks.forEach(function(k){dirty[k]=1;});});}

  /* the sign-in box: Google, or a sign-in link by email */
  var EMAILKEY='ysEmailForSignIn';
  A.signIn=function(){chooser(true);};
  A.google=function(){
    chooser(false);
    return load().then(function(){var p=new fb.auth.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
      return fb.auth().signInWithPopup(p);}).catch(function(e){
      var c=e&&e.code||'';if(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request')return;
      /* inside an embed (e.g. Google Sites) the popup can be blocked: sign in on the tool's own page */
      var inFrame;try{inFrame=window.top!==window.self;}catch(x){inFrame=true;}
      if(inFrame){window.open(location.href.replace(/([?&])(embed|ws)=1&?/,'$1'),'_blank','noopener');return;}
      console.warn('[YS_AUTH] sign-in',c||e);alert('Sign-in didn’t go through. Please allow pop-ups for tools.yieldsigma.com and try again.');
    });
  };
  /* pages that read or write their own collections (the ETF page) wait for Firebase here */
  A.emailLink=function(email){
    email=String(email||'').trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return Promise.reject({code:'auth/invalid-email'});
    var url=location.href.split('#')[0].replace(/([?&])(embed|ws)=1&?/,'$1').replace(/[?&]$/,'');
    return load().then(function(){return fb.auth().sendSignInLinkToEmail(email,{url:url,handleCodeInApp:true});})
      .then(function(){ls(EMAILKEY,email);});
  };
  /* arriving from the emailed link: finish the sign-in, then tidy the address */
  function finishEmailLink(){
    var href=location.href;if(!/[?&]oobCode=/.test(href)||!/[?&]mode=signIn/.test(href))return;
    load().then(function(){
      if(!fb.auth().isSignInWithEmailLink(href))return;
      var email=ls(EMAILKEY)||window.prompt('Confirm the email address you used to sign in:');if(!email)return;
      return fb.auth().signInWithEmailLink(email,href).then(function(){try{localStorage.removeItem(EMAILKEY);}catch(e){}});
    }).catch(function(e){console.warn('[YS_AUTH] email link',e&&e.code||e);alert('That sign-in link has expired or was already used. Please ask for a new one.');})
    .then(function(){try{var u=new URL(location.href);['apiKey','oobCode','mode','lang','continueUrl'].forEach(function(p){u.searchParams.delete(p);});history.replaceState(null,'',u.pathname+u.search+u.hash);}catch(e){}});
  }
  A.ready=function(){return load().then(function(){return {fb:fb,db:db};});};
  A.signOut=function(){if(fb)fb.auth().signOut();menu(false);};
  A.setNewsletter=function(on){if(!A.user||!db)return;A.profile.newsletter=!!on;
    userDoc().update({newsletter:!!on,newsletterAt:fb.firestore.FieldValue.serverTimestamp(),email:A.user.email}).catch(function(e){console.warn('[YS_AUTH] newsletter',e&&e.code||e);});};

  /* ---- the button and the account menu ---- */
  var css='.ysAuth{position:relative;display:inline-flex;font-family:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace}'+
    '.ysAuthBtn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;min-width:30px;border:1px solid var(--rule,#D2DBD1);border-radius:20px;background:transparent;color:var(--muted,#5E6F63);cursor:pointer;padding:0 11px;font:600 11.5px/1 "JetBrains Mono",ui-monospace,monospace}'+
    '.ysAuthBtn:hover{color:var(--jade,#1F7A52);border-color:var(--jade,#1F7A52)}'+
    '.ysAuthBtn.in{padding:0;width:30px;background:var(--jade,#1F7A52);border-color:var(--jade,#1F7A52);color:var(--paper,#fff);font-size:12.5px}'+
    '.ysAuthMenu{position:absolute;top:calc(100% + 6px);right:0;width:270px;display:none;background:var(--paper,#fff);color:var(--ink,#132419);border:1px solid var(--rule,#D2DBD1);border-radius:10px;box-shadow:0 14px 34px -14px rgba(10,25,20,.38);padding:12px 14px;z-index:60;text-align:left}'+
    '.ysAuthMenu.on{display:block}'+
    '.ysAuthMenu .who{font-size:12.5px;font-weight:600;word-break:break-all}.ysAuthMenu .sub{font-size:11px;color:var(--muted,#5E6F63);margin:3px 0 10px}'+
    '.ysAuthMenu label{display:flex;gap:8px;align-items:flex-start;font-size:12px;cursor:pointer;padding:9px 0;border-top:1px solid var(--rule,#D2DBD1);border-bottom:1px solid var(--rule,#D2DBD1)}'+
    '.ysAuthMenu input{accent-color:var(--jade,#1F7A52);margin-top:2px}'+
    '.ysAuthMenu button.out{margin-top:10px;border:0;background:none;color:var(--jade,#1F7A52);font:600 12px/1 "JetBrains Mono",ui-monospace,monospace;cursor:pointer;padding:0}'+
    '.ysThemeAnchor>.ysAuth{position:absolute;top:12px;right:52px}.ysAuthSlot{flex:none;display:inline-flex}'+
    '.ysAuthModal{position:fixed;inset:0;z-index:999;background:rgba(10,20,15,.45);display:flex;align-items:center;justify-content:center;padding:16px}'+
    '.ysAuthBox{position:relative;width:100%;max-width:360px;background:var(--paper,#fff);color:var(--ink,#132419);border:1px solid var(--rule,#D2DBD1);border-radius:14px;box-shadow:0 24px 60px -20px rgba(0,0,0,.45);padding:24px 22px 20px;font-family:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace}'+
    '.ysAuthBox .x{position:absolute;top:8px;right:10px;border:0;background:none;color:var(--muted,#5E6F63);font-size:20px;cursor:pointer}'+
    '.ysAuthBox .t{font:500 22px/1.2 Newsreader,Georgia,serif;margin-bottom:6px}.ysAuthBox .s{font-size:12px;color:var(--muted,#5E6F63);margin-bottom:18px;line-height:1.5}'+
    '.ysAuthBox .g,.ysAuthBox .send{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:42px;border-radius:21px;cursor:pointer;font:600 13px/1 "JetBrains Mono",ui-monospace,monospace}'+
    '.ysAuthBox .g{border:1px solid var(--rule,#D2DBD1);background:var(--field,#fff);color:var(--ink,#132419)}.ysAuthBox .g:hover{border-color:var(--jade,#1F7A52)}'+
    '.ysAuthBox .send{border:1px solid var(--jade,#1F7A52);background:var(--jade,#1F7A52);color:#fff;margin-top:8px}.ysAuthBox .send[disabled]{opacity:.5;cursor:default}'+
    '.ysAuthBox .or{display:flex;align-items:center;gap:10px;margin:16px 0;font-size:11px;color:var(--muted,#5E6F63)}.ysAuthBox .or:before,.ysAuthBox .or:after{content:"";flex:1;height:1px;background:var(--rule,#D2DBD1)}'+
    '.ysAuthBox .em{width:100%;height:42px;border:1px solid var(--rule,#D2DBD1);border-radius:10px;padding:0 12px;background:var(--field,#fff);color:var(--ink,#132419);font:13px "JetBrains Mono",ui-monospace,monospace;box-sizing:border-box}'+
    '.ysAuthBox .em:focus{outline:2px solid var(--jade,#1F7A52);outline-offset:1px}'+
    '.ysAuthBox .fine{font-size:11px;color:var(--muted,#5E6F63);margin-top:10px;text-align:center;line-height:1.5}.ysAuthBox .fine a{color:var(--jade,#1F7A52)}'+
    '.ysAuthBox .mail{font-size:30px;line-height:1;margin-bottom:10px;color:var(--jade,#1F7A52)}'+
    '.ysAuthBox .msg{font-size:12px;line-height:1.5;margin-top:10px;min-height:1em}.ysAuthBox .msg.ok{color:var(--jade,#1F7A52)}.ysAuthBox .msg.bad{color:var(--rust,#B54A2C)}';
  var styled=false;
  function html(){
    var u=A.user;
    if(!u)return '<button type="button" class="ysAuthBtn" title="Sign in to keep your watchlist on every device">Sign in</button>';
    var ini=(u.name||u.email||'?').trim().charAt(0).toUpperCase();
    return '<button type="button" class="ysAuthBtn in" aria-haspopup="true" aria-expanded="false" title="'+esc(u.email)+'">'+esc(ini)+'</button>'+
      '<div class="ysAuthMenu" role="menu"><div class="who">'+esc(u.name||u.email)+'</div><div class="sub">'+esc(u.email)+' · watchlist, alerts and presets saved to your account</div>'+
      '<label><input type="checkbox" class="nl"'+(A.profile.newsletter?' checked':'')+'> Send me the Yield Sigma newsletter</label>'+
      '<button type="button" class="out">Sign out</button></div>';
  }
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function menu(on){document.querySelectorAll('.ysAuthMenu').forEach(function(m){m.classList.toggle('on',!!on&&m.parentNode===openEl);});
    document.querySelectorAll('.ysAuthBtn.in').forEach(function(b){b.setAttribute('aria-expanded',on&&b.parentNode===openEl?'true':'false');});if(!on)openEl=null;}
  var openEl=null;
  function draw(){
    if(hideBtn)return;
    var th=document.querySelectorAll('.ysThemeBtn');
    th.forEach(function(t){
      var box=t.previousElementSibling&&t.previousElementSibling.classList.contains('ysAuth')?t.previousElementSibling:null;
      if(!box){box=document.createElement('span');box.className='ysAuth';t.parentNode.insertBefore(box,t);}
      var wasOpen=openEl===box,h=html();if(box.getAttribute('data-h')===h)return;
      box.setAttribute('data-h',h);box.innerHTML=h;if(wasOpen)menu(true);
    });
    /* pages can also mark a spot for it (the bar of a tool opened over a card) */
    document.querySelectorAll('.ysAuthSlot').forEach(function(sl){
      var box=sl.querySelector('.ysAuth');if(!box){box=document.createElement('span');box.className='ysAuth';sl.appendChild(box);}
      var wasOpen=openEl===box,h=html();if(box.getAttribute('data-h')===h)return;box.setAttribute('data-h',h);box.innerHTML=h;if(wasOpen)menu(true);});
    if(!styled&&(th.length||document.querySelector('.ysAuthSlot'))){var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);styled=true;}
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.ysAuthBtn');
    if(b){e.preventDefault();e.stopPropagation();if(!A.user){chooser(true);return;}var box=b.parentNode,on=openEl!==box;openEl=on?box:null;menu(on);return;}
    if(e.target.closest&&e.target.closest('.ysAuthMenu .out')){A.signOut();return;}
    if(e.target.closest&&e.target.closest('.ysAuthBox .g')){A.google();return;}
    if(e.target.closest&&e.target.closest('.ysAuthBox .send')){sendLink();return;}
    if(e.target.closest&&e.target.closest('.ysAuthBox .again')){e.preventDefault();chooser(false);chooser(true);return;}
    if(e.target.closest&&e.target.closest('.ysAuthBox .x')||e.target.classList&&e.target.classList.contains('ysAuthModal')){chooser(false);return;}
    if(e.target.closest&&e.target.closest('.ysAuthModal'))return;
    if(e.target.closest&&e.target.closest('.ysAuthMenu'))return;
    if(openEl)menu(false);
  },true);
  document.addEventListener('change',function(e){if(e.target.classList&&e.target.classList.contains('nl')&&e.target.closest('.ysAuthMenu'))A.setNewsletter(e.target.checked);});
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){if(openEl)menu(false);chooser(false);}
    if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('em')&&e.target.closest('.ysAuthBox')){e.preventDefault();sendLink();}});
  function chooser(on){
    var m=document.querySelector('.ysAuthModal');
    if(!on){if(m)m.remove();return;}
    if(m)return;
    if(!styled){var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);styled=true;}
    load();   /* get Firebase ready while the visitor chooses */
    m=document.createElement('div');m.className='ysAuthModal';
    m.innerHTML='<div class="ysAuthBox" role="dialog" aria-modal="true" aria-label="Sign in"><button type="button" class="x" aria-label="Close">×</button>'+
      '<div class="t">Sign in to Yield Sigma</div><div class="s">Keeps your watchlist, alerts and Paper ETFs on every device. Free.</div>'+
      '<button type="button" class="g">'+GSVG+'Continue with Google</button>'+
      '<div class="or"><span>or</span></div>'+
      '<input type="email" class="em" placeholder="you@example.com" autocomplete="email" value="'+esc(ls(EMAILKEY)||'')+'">'+
      '<button type="button" class="send">Continue with email</button>'+
      '<div class="msg" role="status"></div></div>';
    document.body.appendChild(m);
  }
  function sendLink(){
    var box=document.querySelector('.ysAuthBox');if(!box)return;var inp=box.querySelector('.em'),msg=box.querySelector('.msg'),btn=box.querySelector('.send');
    btn.disabled=true;msg.className='msg';msg.textContent='';btn.textContent='Sending…';
    A.emailLink(inp.value).then(function(){
        /* the familiar "check your email" step, in place of the form */
        var em=esc(inp.value.trim());
        box.innerHTML='<button type="button" class="x" aria-label="Close">×</button><div class="mail">✉</div>'+
          '<div class="t" style="margin:0">Check your email</div>';},
      function(e){btn.disabled=false;btn.textContent='Continue with email';msg.className='msg bad';msg.textContent=e&&e.code==='auth/invalid-email'?'Please enter a valid email address.':'The link couldn’t be sent. Please try again in a minute.';console.warn('[YS_AUTH] send link',e&&e.code||e);});
  }
  var GSVG='<svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 7-10.3 7-17.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
  /* cards draw their bar after the data arrives: keep the button next to every light / dark switch */
  function watch(){draw();try{new MutationObserver(function(){var need=[].some.call(document.querySelectorAll('.ysThemeBtn'),function(t){return !(t.previousElementSibling&&t.previousElementSibling.classList.contains('ysAuth'));})||[].some.call(document.querySelectorAll('.ysAuthSlot'),function(sl){return !sl.querySelector('.ysAuth');});if(need)draw();}).observe(document.body,{childList:true,subtree:true});}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
  /* a change made just before leaving the page still gets saved */
  window.addEventListener('pagehide',function(){if(Object.keys(dirty).length){clearTimeout(timer);push();}});
  /* signed in before on this browser: reconnect quietly */
  try{if(localStorage.getItem(FLAG)==='1')load();}catch(e){}
  finishEmailLink();
})();
