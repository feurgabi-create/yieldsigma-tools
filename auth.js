/* Yield Sigma(TM) sign-in and sync (Stardust Capital Labs, Nov 2026)
   Google sign-in through Firebase (project yield-sigma). Optional: every page works without it.
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
  var CFG={apiKey:"AIzaSyBMoVUKGQfvFMtDfo8Vexw8th3tADBBeR8",authDomain:"yield-sigma.firebaseapp.com",projectId:"yield-sigma",
    storageBucket:"yield-sigma.firebasestorage.app",messagingSenderId:"281792973419",appId:"1:281792973419:web:dc8a668218eb1d9bfabf2e"};
  var SYNC=['ysWatch','ysBells','ysPresets','ysETF'];   /* lists that follow the account */
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
        fb.auth().onAuthStateChanged(function(u){u?signedIn(u):signedOut();});});
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

  A.signIn=function(){
    return load().then(function(){var p=new fb.auth.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
      return fb.auth().signInWithPopup(p);}).catch(function(e){
      var c=e&&e.code||'';if(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request')return;
      /* inside an embed (e.g. Google Sites) the popup can be blocked: sign in on the tool's own page */
      var inFrame;try{inFrame=window.top!==window.self;}catch(x){inFrame=true;}
      if(inFrame){window.open(location.href.replace(/([?&])(embed|ws)=1&?/,'$1'),'_blank','noopener');return;}
      console.warn('[YS_AUTH] sign-in',c||e);alert('Sign-in didn’t go through. Please allow pop-ups for tools.yieldsigma.com and try again.');
    });
  };
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
    '.ysThemeAnchor>.ysAuth{position:absolute;top:12px;right:52px}';
  var styled=false;
  function html(){
    var u=A.user;
    if(!u)return '<button type="button" class="ysAuthBtn" title="Sign in with Google to keep your watchlist on every device">Sign in</button>';
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
    if(!styled&&th.length){var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);styled=true;}
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.ysAuthBtn');
    if(b){e.preventDefault();e.stopPropagation();if(!A.user){A.signIn();return;}var box=b.parentNode,on=openEl!==box;openEl=on?box:null;menu(on);return;}
    if(e.target.closest&&e.target.closest('.ysAuthMenu .out')){A.signOut();return;}
    if(e.target.closest&&e.target.closest('.ysAuthMenu'))return;
    if(openEl)menu(false);
  },true);
  document.addEventListener('change',function(e){if(e.target.classList&&e.target.classList.contains('nl')&&e.target.closest('.ysAuthMenu'))A.setNewsletter(e.target.checked);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&openEl)menu(false);});
  /* cards draw their bar after the data arrives: keep the button next to every light / dark switch */
  function watch(){draw();try{new MutationObserver(function(){if(document.querySelector('.ysThemeBtn')&&![].every.call(document.querySelectorAll('.ysThemeBtn'),function(t){return t.previousElementSibling&&t.previousElementSibling.classList.contains('ysAuth');}))draw();}).observe(document.body,{childList:true,subtree:true});}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
  /* a change made just before leaving the page still gets saved */
  window.addEventListener('pagehide',function(){if(Object.keys(dirty).length){clearTimeout(timer);push();}});
  /* signed in before on this browser: reconnect quietly */
  try{if(localStorage.getItem(FLAG)==='1')load();}catch(e){}
})();
