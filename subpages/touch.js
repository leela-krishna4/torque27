/* Touch / mobile layer: gives phones the effects that laptops get from the mouse.
   - every :hover style also works through a ".hot" class
   - the card nearest the middle of the screen lights up as you scroll (like hovering it)
   - tapping a card lights it up, and touch leaves a spark trail
   Runs only on devices without a mouse. */
(function(){
"use strict";
if(!matchMedia("(hover:none)").matches)return;
var d=document,RM=matchMedia("(prefers-reduced-motion:reduce)").matches;
function init(){
  /* 1. clone every ":hover" rule as ".hot" */
  var css=[],cand={};
  function grab(sel){
    sel.split(",").forEach(function(part){
      var re=/([^\s>+~]+?):hover/g,m;
      while((m=re.exec(part))){var c=m[1];if(!c||c.indexOf(":")>-1)continue;
        if(/^[a-z0-9]+$/i.test(c)){var ctx=part.slice(0,m.index+c.length).trim();if(ctx!==c)cand[ctx]=1}else cand[c]=1}
    });
  }
  function walk(rules,wrap){
    for(var i=0;i<rules.length;i++){
      var r=rules[i];
      if(r.type===1){
        if(r.selectorText&&r.selectorText.indexOf(":hover")>-1&&r.selectorText.indexOf(":not(:hover")<0){
          grab(r.selectorText);
          var t=r.selectorText.replace(/:hover/g,".hot")+"{"+r.style.cssText+"}";
          css.push(wrap?wrap+"{"+t+"}":t);
        }
      }else if(r.type===4&&r.cssRules){walk(r.cssRules,"@media "+r.conditionText)}
    }
  }
  for(var k=0;k<d.styleSheets.length;k++){try{walk(d.styleSheets[k].cssRules,"")}catch(e){}}
  if(css.length){var st=d.createElement("style");st.setAttribute("data-touch","");st.textContent=css.join("\n");d.head.appendChild(st)}
  var sels=Object.keys(cand);
  if(!sels.length)return;

  /* 2. spotlight: per kind of card, the one nearest the middle of the screen is "hot" */
  var groups=sels.map(function(s){return{s:s,on:null}}),ticking=false;
  function spy(){
    ticking=false;
    var mid=innerHeight/2,band=innerHeight*.26;
    groups.forEach(function(g){
      var best=null,bd=1e9,els;
      try{els=d.querySelectorAll(g.s)}catch(e){return}
      for(var i=0;i<els.length;i++){
        var el=els[i];if(d.body.contains(el)===false)continue;
        var r=el.getBoundingClientRect();
        if(r.height<8||r.height>innerHeight*.7||r.width>innerWidth*1.05)continue;
        if(r.right<0||r.left>innerWidth)continue;
        var dist=Math.abs((r.top+r.height/2)-mid)+Math.abs((r.left+r.width/2)-innerWidth/2)*.35;
        if(Math.abs((r.top+r.height/2)-mid)<band&&dist<bd){bd=dist;best=el}
      }
      if(g.on&&g.on!==best&&!g.tap)g.on.classList.remove("hot");
      if(best){best.classList.add("hot");g.on=best}else if(!g.tap)g.on=null;
    });
  }
  function sched(){if(!ticking){ticking=true;requestAnimationFrame(spy)}}
  addEventListener("scroll",sched,{passive:true});addEventListener("resize",sched);
  if(!RM){sched();setTimeout(sched,800)}

  /* 3. tap lights a card for a moment */
  d.addEventListener("touchstart",function(e){
    var t=e.target;if(!t.closest)return;
    groups.forEach(function(g){
      var el;try{el=t.closest(g.s)}catch(x){return}
      if(el){el.classList.add("hot");clearTimeout(g.tm);g.tap=true;g.tm=setTimeout(function(){g.tap=false;sched()},1600)}
    });
  },{passive:true});

  /* 4. spark trail under the finger */
  if(RM)return;
  var cv=d.createElement("canvas");cv.setAttribute("aria-hidden","true");cv.style.cssText="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9300";d.body.appendChild(cv);
  var c=cv.getContext("2d"),P=[],run=false;
  function rs(){cv.width=innerWidth;cv.height=innerHeight}rs();addEventListener("resize",rs);
  function loop(){
    c.clearRect(0,0,cv.width,cv.height);
    P=P.filter(function(p){p.x+=p.vx;p.y+=p.vy;p.vy-=.03;p.l-=.035;if(p.l<=0)return false;c.globalAlpha=p.l;c.fillStyle="#ff8a2a";c.beginPath();c.arc(p.x,p.y,p.r*p.l+.4,0,6.283);c.fill();return true});
    if(P.length)requestAnimationFrame(loop);else{run=false;c.clearRect(0,0,cv.width,cv.height)}
  }
  function burst(x,y,n){for(var i=0;i<n&&P.length<90;i++)P.push({x:x,y:y,vx:(Math.random()-.5)*2.2,vy:(Math.random()-.5)*2.2,r:Math.random()*2.4+1,l:1});if(!run){run=true;requestAnimationFrame(loop)}}
  var lastT=0;
  d.addEventListener("touchstart",function(e){var t=e.touches[0];if(t)burst(t.clientX,t.clientY,10)},{passive:true});
  d.addEventListener("touchmove",function(e){var n=Date.now();if(n-lastT<45)return;lastT=n;var t=e.touches[0];if(t)burst(t.clientX,t.clientY,2)},{passive:true});
}
if(d.readyState==="complete")setTimeout(init,300);else addEventListener("load",function(){setTimeout(init,300)});
})();
