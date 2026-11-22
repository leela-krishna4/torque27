/* Torque 2K27 subpage effects: preloader, ember particles, cursor, tilt, reveal, progress, countdown */
(function(){
"use strict";
var d=document,b=d.body,RM=matchMedia("(prefers-reduced-motion:reduce)").matches;
function $(s,r){return (r||d).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||d).querySelectorAll(s))}

/* preloader */
var pre=$(".pre");
if(pre){var hide=function(){pre.classList.add("go");setTimeout(function(){pre.remove()},1400)};
  if(RM)pre.remove();else setTimeout(hide,950);}

/* scroll progress */
var prog=$(".prog");
function onScroll(){var h=d.documentElement.scrollHeight-innerHeight;if(prog)prog.style.transform="scaleX("+(h>0?scrollY/h:0)+")"}
addEventListener("scroll",onScroll,{passive:true});onScroll();

/* custom cursor */
if(matchMedia("(pointer:fine)").matches&&!RM){
  var cur=$(".cur"),ring=$(".cring"),mx=0,my=0,rx=0,ry=0,on=false;
  addEventListener("mousemove",function(e){mx=e.clientX;my=e.clientY;if(!on){on=true;b.classList.add("has-cursor");rx=mx;ry=my}
    cur.style.transform="translate("+mx+"px,"+my+"px)"},{passive:true});
  (function f(){rx+=(mx-rx)*.18;ry+=(my-ry)*.18;ring.style.transform="translate("+rx+"px,"+ry+"px)";requestAnimationFrame(f)})();
  d.addEventListener("mouseover",function(e){ring.classList.toggle("hov",!!e.target.closest("a,button,.pp"))});
}

/* reveal on scroll */
var rv=$$(".glass,.pp,.tick");
rv.forEach(function(el,i){el.classList.add("rv");el.style.transitionDelay=(i%4)*80+"ms"});
if("IntersectionObserver" in window){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.1});
  rv.forEach(function(el){io.observe(el)});
}else rv.forEach(function(el){el.classList.add("in")});

/* 3D tilt + spotlight on cards */
if(matchMedia("(pointer:fine)").matches&&!RM){
  $$(".glass,.pp,.rail a").forEach(function(el){
    el.setAttribute("data-tilt","");
    el.addEventListener("mousemove",function(e){
      var r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
      el.style.setProperty("--mx",x*100+"%");el.style.setProperty("--my",y*100+"%");
      if(r.width<700)el.style.transform="perspective(900px) rotateX("+((.5-y)*7)+"deg) rotateY("+((x-.5)*9)+"deg) translateZ(0)";
    });
    el.addEventListener("mouseleave",function(){el.style.transform=""});
  });
}

/* ember particles */
var cv=$("#em");
if(cv&&!RM){
  var x=cv.getContext("2d"),W,H,P=[],N=Math.min(70,Math.floor(innerWidth/18));
  function rs(){W=cv.width=innerWidth;H=cv.height=innerHeight}rs();addEventListener("resize",rs);
  function mk(init){return{x:Math.random()*W,y:init?Math.random()*H:H+10,r:Math.random()*1.8+.4,vy:Math.random()*.6+.2,vx:(Math.random()-.5)*.3,a:Math.random()*.6+.2,p:Math.random()*6}}
  for(var i=0;i<N;i++)P.push(mk(true));
  (function loop(){x.clearRect(0,0,W,H);
    for(var i=0;i<P.length;i++){var p=P[i];p.y-=p.vy;p.p+=.02;p.x+=p.vx+Math.sin(p.p)*.25;
      if(p.y<-10)P[i]=mk(false);
      x.beginPath();x.arc(p.x,p.y,p.r,0,6.283);x.fillStyle="rgba(255,"+(106+Math.floor(p.a*80))+",26,"+p.a+")";x.shadowBlur=8;x.shadowColor="rgba(255,106,26,.8)";x.fill();}
    requestAnimationFrame(loop)})();
}

/* countdown to fest (10 January 2027, IST) */
var cd=$(".cd");
if(cd){var T=new Date("2027-01-10T09:00:00+05:30").getTime();
  function tk(){var s=Math.max(0,Math.floor((T-Date.now())/1000)),dd=Math.floor(s/86400),hh=Math.floor(s%86400/3600),mm=Math.floor(s%3600/60),ss=s%60;
    cd.innerHTML=[["Days",dd],["Hrs",hh],["Min",mm],["Sec",ss]].map(function(a){return"<div><b>"+String(a[1]).padStart(2,"0")+"</b>"+a[0]+"</div>"}).join("")}
  tk();setInterval(tk,1000);}

})();

/* ===== interactive layer v3 ===== */
(function(){
var d=document,RM=matchMedia("(prefers-reduced-motion:reduce)").matches;
function $(s,r){return (r||d).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||d).querySelectorAll(s))}
var tt;function toast(t){var el=$(".toast");if(!el){el=d.createElement("div");el.className="toast";el.setAttribute("role","status");d.body.appendChild(el)}el.textContent=t;el.classList.add("on");clearTimeout(tt);tt=setTimeout(function(){el.classList.remove("on")},2200)}

/* title scramble on load + hover */
var h1=$("h1");
if(h1&&!RM){var final=h1.innerHTML,txt=h1.textContent,chars="ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#/%",busy=false;
  function scr(){if(busy)return;busy=true;var n=0,len=txt.length;
    var iv=setInterval(function(){n+=.7;var out="";for(var i=0;i<len;i++){var c=txt[i];out+=(c===" "||i<n)?c:chars[Math.floor(Math.random()*chars.length)]}
      h1.textContent=out;if(n>=len){clearInterval(iv);h1.innerHTML=final;busy=false}},35)}
  setTimeout(scr,1100);h1.addEventListener("mouseenter",scr);}

/* ripple + magnetic buttons */
$$(".btn").forEach(function(b){
  b.addEventListener("click",function(e){var r=b.getBoundingClientRect(),s=Math.max(r.width,r.height),x=d.createElement("span");x.className="ripple";x.style.cssText="width:"+s+"px;height:"+s+"px;left:"+(e.clientX-r.left-s/2)+"px;top:"+(e.clientY-r.top-s/2)+"px";b.appendChild(x);setTimeout(function(){x.remove()},650)});
  if(!RM&&matchMedia("(pointer:fine)").matches){
    b.addEventListener("mousemove",function(e){var r=b.getBoundingClientRect();b.style.transform="translate("+((e.clientX-r.left-r.width/2)*.18)+"px,"+((e.clientY-r.top-r.height/2)*.25)+"px)"});
    b.addEventListener("mouseleave",function(){b.style.transform=""});}
});

/* hero parallax */
var hero=$(".hero-img");
if(hero&&!RM&&matchMedia("(pointer:fine)").matches){
  var num=$("span",hero),g=null;
  hero.addEventListener("mousemove",function(e){var r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    if(num)num.style.transform="translate("+(-x*40)+"px,"+(-y*22)+"px)";if(g)g.style.transform="translate("+(x*26)+"px,"+(y*16)+"px)"});
  hero.addEventListener("mouseleave",function(){if(num)num.style.transform="";if(g)g.style.transform=""});
}

/* floating register + back to top */
var fab=$(".fab");
if(fab){var up=$(".up",fab);
  addEventListener("scroll",function(){fab.classList.toggle("on",scrollY>420)},{passive:true});
  if(up)up.addEventListener("click",function(){scrollTo({top:0,behavior:"smooth"})});}

/* add to calendar */
var cal=$("[data-cal]");
if(cal)cal.addEventListener("click",function(){
  var t=cal.getAttribute("data-cal"),
  ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Torque 2K27//EN","BEGIN:VEVENT","UID:"+t.replace(/\W/g,"")+"@torquejntuk.in","DTSTAMP:20261118T000000Z","DTSTART;VALUE=DATE:20270110","DTEND;VALUE=DATE:20270112","SUMMARY:Torque 2K27 - "+t,"LOCATION:UCEK JNTUK Kakinada","DESCRIPTION:Torque 2K27 technical fest. https://torquejntuk.in","END:VEVENT","END:VCALENDAR"].join("\r\n"),
  a=d.createElement("a");a.href=URL.createObjectURL(new Blob([ics],{type:"text/calendar"}));a.download="torque-2k27.ics";a.click();toast("Added to calendar file")});

/* share */
var sh=$("[data-share]");
if(sh)sh.addEventListener("click",function(){
  var data={title:d.title,text:"Join me at Torque 2K27!",url:location.href};
  if(navigator.share){navigator.share(data).catch(function(){})}
  else if(navigator.clipboard){navigator.clipboard.writeText(location.href).then(function(){toast("Link copied")},function(){toast("Copy failed")})}});

/* click a coordinator to copy the name */
$$(".pp").forEach(function(p){p.setAttribute("title","Click to copy name");p.addEventListener("click",function(e){
  if(e.target.closest&&e.target.closest(".av img,a"))return;
  var n=($("h4",p)||$("b",p)).textContent;if(navigator.clipboard)navigator.clipboard.writeText(n).then(function(){p.classList.add("cp");toast("Copied: "+n);setTimeout(function(){p.classList.remove("cp")},1500)},function(){})})});

/* draggable events rail */
var rail=$(".rail");
if(rail){var dn=false,sx=0,sl=0,moved=0;
  rail.addEventListener("pointerdown",function(e){if(e.pointerType!=="mouse")return;dn=true;moved=0;sx=e.clientX;sl=rail.scrollLeft});
  addEventListener("pointermove",function(e){if(!dn)return;var dx=e.clientX-sx;if(Math.abs(dx)>4){moved=1;rail.classList.add("drag")}rail.scrollLeft=sl-dx});
  addEventListener("pointerup",function(){dn=false;rail.classList.remove("drag")});
  rail.addEventListener("click",function(e){if(moved){e.preventDefault();moved=0}},true);}

/* click sparks */
var cv=$("#em");
if(cv&&!RM){var x=cv.getContext("2d"),S=[];
  addEventListener("click",function(e){for(var i=0;i<16;i++){var a=Math.random()*6.283,v=Math.random()*4+1.5;S.push({x:e.clientX,y:e.clientY,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1,l:1})}if(S.length===16)spark()});
  function spark(){if(!S.length)return;requestAnimationFrame(function(){
    // draw on a dedicated overlay so the ember loop's clearRect doesn't erase it
    var o=$("#sp");if(!o){o=d.createElement("canvas");o.id="sp";o.style.cssText="position:fixed;inset:0;width:100%;height:100%;z-index:9400;pointer-events:none";o.width=innerWidth;o.height=innerHeight;d.body.appendChild(o)}
    var c=o.getContext("2d");c.clearRect(0,0,o.width,o.height);
    S=S.filter(function(p){p.x+=p.vx;p.y+=p.vy;p.vy+=.15;p.l-=.025;if(p.l<=0)return false;c.globalAlpha=p.l;c.fillStyle="#ff9a3c";c.fillRect(p.x,p.y,3,3);return true});
    if(S.length)spark();else c.clearRect(0,0,o.width,o.height)})}
}
})();

/* right-click disabled (inputs and text fields keep it so paste still works) */
document.addEventListener("contextmenu",function(e){var t=e.target;if(t&&t.closest&&t.closest("input,textarea,select"))return;e.preventDefault()});


/* ===== effects v4 ===== */
(function(){
var d=document,RM=matchMedia("(prefers-reduced-motion:reduce)").matches;
function $(s,r){return (r||d).querySelector(s)}
var hero=$(".hero-img");

/* light beam sweeping across the hero + scroll parallax */
if(hero&&!RM){var bm=d.createElement("div");bm.className="beam";hero.appendChild(bm);
  var tickP=false;addEventListener("scroll",function(){if(tickP)return;tickP=true;requestAnimationFrame(function(){tickP=false;var r=hero.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)hero.style.setProperty("--sy",String(-r.top|0))})},{passive:true});}

/* ticker speeds up while you scroll (like the main page) */
var tk=$(".tick div");
if(tk&&!RM){var x=0,ly=scrollY,vis=true;
  if("IntersectionObserver" in window)new IntersectionObserver(function(e){vis=e[0].isIntersecting}).observe(tk.parentNode);
  (function f(){var y=scrollY;if(vis){x-=.7+Math.abs(y-ly)*.35;var half=tk.scrollWidth/2;if(half>0&&x<-half)x+=half;tk.style.transform="translateX("+x+"px)"}ly=y;requestAnimationFrame(f)})();}

/* rail card spotlight follows the cursor */
Array.prototype.forEach.call(d.querySelectorAll(".rail a"),function(a){a.addEventListener("mousemove",function(e){var r=a.getBoundingClientRect();a.style.setProperty("--mx",(e.clientX-r.left)+"px");a.style.setProperty("--my",(e.clientY-r.top)+"px")})});

/* ember trail behind the mouse */
if(!RM&&matchMedia("(pointer:fine)").matches){
  var cv=d.createElement("canvas");cv.id="tr";cv.setAttribute("aria-hidden","true");d.body.appendChild(cv);
  var c=cv.getContext("2d"),P=[],run=false,n=0;
  function rs(){cv.width=innerWidth;cv.height=innerHeight}rs();addEventListener("resize",rs);
  function loop(){c.clearRect(0,0,cv.width,cv.height);
    P=P.filter(function(p){p.x+=p.vx;p.y+=p.vy;p.vy-=.02;p.l-=.03;if(p.l<=0)return false;c.globalAlpha=p.l;c.fillStyle="#ff8a2a";c.beginPath();c.arc(p.x,p.y,p.r*p.l+.4,0,6.283);c.fill();return true});
    if(P.length)requestAnimationFrame(loop);else{run=false;c.clearRect(0,0,cv.width,cv.height)}}
  addEventListener("mousemove",function(e){if(++n%2)return;if(P.length<60)P.push({x:e.clientX,y:e.clientY,vx:(Math.random()-.5)*.8,vy:(Math.random()-.5)*.8,r:Math.random()*2+1,l:1});if(!run){run=true;requestAnimationFrame(loop)}},{passive:true});
}

/* page-change wipe when opening another page of this site */
if(!RM){
  addEventListener("pageshow",function(e){var o=$(".leave");if(o)o.remove()});
  d.addEventListener("click",function(e){
    if(!e.target.closest||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    var a=e.target.closest("a[href]");if(!a||a.target==="_blank"||a.hasAttribute("download"))return;
    var h=a.getAttribute("href");if(!h||h.charAt(0)==="#"||/^(mailto:|tel:|javascript:)/i.test(h))return;
    var u;try{u=new URL(a.href,location.href)}catch(x){return}
    if(u.origin!==location.origin||(u.pathname===location.pathname&&u.hash))return;
    e.preventDefault();var o=d.createElement("div");o.className="leave";o.innerHTML="<b>TORQUE<i> 2K27</i></b>";d.body.appendChild(o);
    requestAnimationFrame(function(){requestAnimationFrame(function(){o.classList.add("go")})});
    setTimeout(function(){location.href=a.href},520);
  });
}
})();


/* coordinator photos: images/<name><roll digits>, any of .jpg .jpeg .png .webp; initials if none exists */
(function(){
  var EXT=["jpeg","jpg","png","JPEG","JPG","webp"];
  Array.prototype.forEach.call(document.querySelectorAll("img[data-b]"),function(im){
    var k=0,av=im.parentNode,ini=(av.firstChild&&av.firstChild.nodeType===3)?av.firstChild.nodeValue:"";
    if(av.firstChild&&av.firstChild.nodeType===3)av.removeChild(av.firstChild);   /* same as main site: initials only if no photo */
    function next(){if(k>=EXT.length){av.textContent=ini;av.classList.remove("ph");return}im.src=im.getAttribute("data-b")+"."+EXT[k++]}
    im.addEventListener("error",next);im.addEventListener("load",function(){av.classList.add("ph")});next();
  });
})();


/* click a coordinator photo to see the whole picture */
(function(){
  var d=document;
  d.addEventListener("click",function(e){
    var im=e.target.closest&&e.target.closest(".pp .av img");if(!im)return;
    var card=im.closest(".pp"),o=d.createElement("div");o.className="lbx";o.setAttribute("role","dialog");o.setAttribute("aria-label","Photo");
    var big=d.createElement("img");big.src=im.src;big.alt="";
    var n=d.createElement("b");n.textContent=card.querySelector("h4").textContent;
    var r=d.createElement("small");r.textContent=card.querySelector("small").textContent;
    o.appendChild(big);o.appendChild(n);o.appendChild(r);d.body.appendChild(o);
    requestAnimationFrame(function(){o.classList.add("on")});
    function close(){o.classList.remove("on");setTimeout(function(){o.remove()},300);removeEventListener("keydown",k)}
    function k(ev){if(ev.key==="Escape")close()}
    o.addEventListener("click",close);addEventListener("keydown",k);
  });
})();


/* coordinator phone numbers from phones.js (empty = reserved blank space) */
(function(){
  var P=window.PHONES||{};
  Array.prototype.forEach.call(document.querySelectorAll(".pp"),function(c){
    var im=c.querySelector("img[data-b]");if(!im)return;
    var id=im.getAttribute("data-b").split("/").pop();
    if(!(id in P))return;
    var box=c.querySelector("h4").parentNode,a=document.createElement("a"),v=String(P[id]||"").replace(/\D/g,"");
    if(v){a.href="tel:+91"+v;a.textContent=v}else{a.className="slot";a.innerHTML="&nbsp;";a.setAttribute("aria-hidden","true")}
    box.appendChild(a);
  });
})();
