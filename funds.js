/* Yield Sigma(TM) funds list (Stardust Capital Labs, Nov 2026)
   Every row in stocks.csv is a stock unless its ticker is on this list. Funds hold many of the same stocks,
   so the statistics (heat map averages, macro card) cover stocks only, and totals show stocks + funds separately.
   Add a ticker here when a new ETF, closed-end fund or bond fund goes into the workbook. */
(function(){
  var L='AMLP AMZA BDJ COWZ DVY HTD IEF MLPX PEY PFFA SCHD SPHD SPY TLT UTWO VIG XLB XLC XLE XLF XLI XLK XLP XLRE XLU XLV XLY';
  var S={};L.split(' ').forEach(function(t){S[t]=1;});
  function k(t){return String(t||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
  window.YS_FUNDS={list:L.split(' '),isFund:function(t){return !!S[k(t)];}};
})();
