/* Yield Sigma(TM) P/E check (Stardust Capital Labs, Nov 2026)
   One rule for every page that shows a P/E:
   1. Excel's P/E (Stocks data feed, last 12 months) is used when it is above 0, at most 60, and within
      2x of the P/E from the SEC filings.
   2. Otherwise (missing, #FIELD!, over 60, zero, or far from the filings) the SEC P/E is used:
      today's stock price x shares / net income of the latest 10-K, if it is above 0 and at most 60.
   3. Otherwise no P/E ("-").
   The payout ratio is then worked out again as dividend yield x the checked P/E (none when there is no P/E).
   REITs (P/AFFO, payout on AFFO) and foreign filers: only the 0-60 test, no SEC figure.
   Pages call YS_PE.fix(rec, isReit) while parsing a row, and wait for YS_PE.ready before parsing. */
(function(){
  var GIST='https://gist.githubusercontent.com/feurgabi-create/94abe3b6de993ea6a6e888053b242b82/raw/';
  var BASE='https://tools.yieldsigma.com/';
  var MAX=60;
  var key=function(t){return String(t||'').toUpperCase().replace(/[^A-Z0-9]/g,'');};
  var M={};
  function get(url,json){
    return fetch(url+(url.indexOf('?')<0?'?':'&')+'h='+Math.floor(Date.now()/600000),{cache:'no-store'})
      .then(function(r){if(!r.ok)throw 0;return json?r.json():r.text();}).catch(function(){return json?{}:'';});
  }
  var ready=Promise.all([get(GIST+'fund.csv'),get(BASE+'profiles.json',true)]).then(function(r){
    var L=String(r[0]||'').split(/\r?\n/),prof=r[1]||{},P={};
    Object.keys(prof).forEach(function(t){P[key(t)]=prof[t];});
    if(!/^ticker,/.test(L[0]||''))return;
    var H=L[0].split(',');
    for(var i=1;i<L.length;i++){
      var c=L[i].split(',');if(!c[0])continue;var o={};H.forEach(function(h,j){o[h]=c[j];});
      var k=key(c[0]),ni=parseFloat(o.ni3),cap=P[k]&&P[k].cap,sh=P[k]&&P[k].shares;
      M[k]={status:o.status,ni:(o.status==='OK'&&ni>0)?ni*1e6:null,shares:sh>0?sh:null,cap:cap>0?cap:null};
    }
  }).catch(function(){});
  function ok(v){return v!==null&&v!==undefined&&isFinite(v)&&v>0&&v<=MAX;}
  function fix(rec,isReit){
    if(!rec)return rec;
    var ex=(rec.pe===null||rec.pe===undefined||!isFinite(rec.pe))?null:rec.pe;
    rec.peSrc=null;
    if(isReit){rec.pe=ok(ex)?ex:null;if(rec.pe!==null)rec.peSrc='Excel';return rec;}
    /* SEC P/E with today's stock price: price x shares / net income of the latest 10-K
       (falls back to the stored market value when there is no live price or share count) */
    var s=M[key(rec.ticker)],sec=null;
    if(s&&s.ni){var px=rec.price;sec=(s.shares&&px>0)?px*s.shares/s.ni:(s.cap?s.cap/s.ni:null);}
    if(ok(ex)&&(sec===null||(ex/sec>=0.5&&ex/sec<=2)))rec.peSrc='Excel';
    else if(ok(sec)){rec.pe=sec;rec.peSrc='SEC';}
    else rec.pe=null;
    payout(rec);return rec;
  }
  /* the payout ratio in the data is dividend yield x Excel's P/E, so a bad P/E makes a bad payout:
     work it out again from the checked P/E; with no usable P/E there is no payout ratio either */
  function payout(rec){
    if(rec.pe!==null&&rec.yield!==null&&rec.yield!==undefined&&isFinite(rec.yield)&&rec.yield>0)rec.payoutRatio=Math.round(rec.yield*rec.pe*100)/100;
    else rec.payoutRatio=null;
  }
  window.YS_PE={ready:ready,fix:fix,MAX:MAX};
})();
