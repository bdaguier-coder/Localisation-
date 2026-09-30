import {levels} from './levels.js';
const dialogs=[...document.querySelectorAll('.module-dialog')];
const frame=document.querySelector('#video-frame');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let opener=null,flightRAF=0,flightTimer=0,openTimer=0;
const plane=document.querySelector('#airplane'),path=document.querySelector('#flight-path');
const flightSvg=document.querySelector('.flight-map');
const predecessors={consequences:null,technologie:'consequences',video:'technologie',methode:'video'};
const flightDuration=1600;
function destinationPoint(id){
 const button=document.querySelector(`.destination[data-open="${id}"]`);
 const anchor=button.querySelector(matchMedia('(max-width:760px)').matches?'.marker':'.flight-anchor');
 const rect=anchor.getBoundingClientRect(),map=flightSvg.getBoundingClientRect();
 return {x:rect.left+rect.width/2-map.left,y:rect.top+rect.height/2-map.top};
}
function stopFlight(){cancelAnimationFrame(flightRAF);clearTimeout(flightTimer);plane.style.opacity='0';path.style.opacity='0'}
function fly(id){
 stopFlight();
 if(motion.matches)return;
 const rect=flightSvg.getBoundingClientRect();
 flightSvg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
 flightSvg.setAttribute('preserveAspectRatio','none');
 const from=predecessors[id]?destinationPoint(predecessors[id]):{x:rect.width-26,y:26};
 const target=destinationPoint(id);
 const control={x:(from.x+target.x)/2,y:Math.min(from.y,target.y)-Math.min(70,Math.abs(target.x-from.x)*.14)};
 // Reveal only the travelled part of the curve, never the route ahead.
 path.setAttribute('d',`M${from.x} ${from.y}`);path.style.opacity='.8';
 const iconScale=1; // One viewBox unit equals one CSS pixel: a 20px aircraft.
 const start=performance.now();plane.style.opacity='1';
 function tick(now){const t=Math.min((now-start)/flightDuration,1),u=t*t*(3-2*t),v=1-u;
 const x=v*v*from.x+2*v*u*control.x+u*u*target.x,y=v*v*from.y+2*v*u*control.y+u*u*target.y;
 const angle=Math.atan2(2*v*(control.y-from.y)+2*u*(target.y-control.y),2*v*(control.x-from.x)+2*u*(target.x-control.x))*180/Math.PI;
 const cx=from.x+(control.x-from.x)*u,cy=from.y+(control.y-from.y)*u;
 path.setAttribute('d',`M${from.x} ${from.y} Q${cx} ${cy} ${x} ${y}`);
 plane.setAttribute('transform',`translate(${x} ${y}) rotate(${angle}) scale(${iconScale})`);
 if(t<1)flightRAF=requestAnimationFrame(tick);else flightTimer=setTimeout(()=>{plane.style.opacity='0'},100);
 }flightRAF=requestAnimationFrame(tick);
}
function pauseVideo(){try{const video=frame.contentDocument?.querySelector('video');if(video&&!video.paused&&!video.ended){video.pause();frame.contentWindow.showStart?.()}}catch{}}
function show(id,trigger){const dialog=document.getElementById(id);if(!dialog)return;
 dialogs.filter(d=>d.open).forEach(d=>d.close());opener=trigger||document.querySelector(`[data-open="${id}"]`);
 fly(id);clearTimeout(openTimer);openTimer=setTimeout(()=>{dialog.showModal();dialog.scrollTop=0;document.body.style.overflow='hidden';
 if(id==='video'&&!frame.getAttribute('src'))frame.src=frame.dataset.src;
 dialog.querySelector('.close-dialog').focus({preventScroll:true});if(id==='methode')ensure3D();},motion.matches?0:flightDuration+160);
}
for(const button of document.querySelectorAll('[data-open]'))button.addEventListener('click',()=>show(button.dataset.open,button));
for(const button of document.querySelectorAll('[data-switch]'))button.addEventListener('click',()=>show(button.dataset.switch));
for(const dialog of dialogs){dialog.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
 dialog.addEventListener('close',()=>{if(dialog.id==='video')pauseVideo();if(!dialogs.some(d=>d.open)){document.body.style.overflow='';opener?.focus({preventScroll:true})}});
}
const funnel=document.querySelector('#funnel'),detail=document.querySelector('#level-detail');
let funnel3D=null,funnelLoading=false;
async function ensure3D(){if(funnel3D){funnel3D.resume();return}if(funnelLoading)return;funnelLoading=true;try{const {createFunnel}=await import('./funnel-3d.js');funnel3D=await createFunnel({mount:document.querySelector('#funnel-3d'),onSelect:select,getSelected:()=>active,dialog:document.querySelector('#methode'),motion});}catch(e){console.warn('Vue 3D indisponible, les quatre niveaux restent accessibles.');}finally{funnelLoading=false}}
const colors=['#80d5c8','#8ab9ee','#b5a0ec','#ebac88'];let active=-1;
const buttons=levels.map((level,i)=>{const b=document.createElement('button');b.type='button';b.className='funnel-level';b.style.setProperty('--width',[100,82,64,47][i]+'%');b.style.setProperty('--color',colors[i]);b.setAttribute('aria-controls','level-detail');b.innerHTML=`<span>0${i+1}</span><strong>${level.title}</strong>`;b.addEventListener('click',()=>select(i));b.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')select(i)});b.addEventListener('focus',()=>select(i));b.addEventListener('keydown',e=>{let j;if(e.key==='ArrowDown'||e.key==='ArrowRight')j=(i+1)%4;if(e.key==='ArrowUp'||e.key==='ArrowLeft')j=(i+3)%4;if(e.key==='Home')j=0;if(e.key==='End')j=3;if(j!==undefined){e.preventDefault();buttons[j].focus()}});funnel.append(b);return b});
function select(i){if(active===i)return;active=i;funnel3D?.refresh();const l=levels[i];buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(j===i)));detail.innerHTML=`<div class="step-visual" style="--step-color:${colors[i]};--zone-width:${[100,72,42,16][i]}%"><img src="images/explorer/${['funnel-zone','funnel-axis','funnel-landmark','funnel-confirm'][i]}.webp" width="600" height="400" alt="${['Un voyageur et une carte de région : situer la zone large.','Un véhicule sur un axe entre son départ et sa destination.','Une station-service et un repère de localisation réduisent la zone.','Le lieu et la carte concordent : position confirmée.'][i]}"><div class="zone-scale" aria-hidden="true"><span></span></div><div class="step-progress" aria-hidden="true">${['Zone large','Axe','Repère précis','Confirmation'].map((label,j)=>`<span class="${j===i?'current':''}">${label}</span>`).join('')}</div></div><p class="eyebrow">0${i+1} / ${l.title} · ${l.tag}</p><h3>${l.hook}</h3><p class="explanation">${l.explanation}</p><ul class="questions">${l.questions.map(q=>`<li>${q}</li>`).join('')}</ul><div class="level-tools"><strong>${l.tool}</strong>${l.toolText}<div class="level-links">${(l.links||[]).map(([label,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join('')}</div></div><button class="level-next">${i<3?'Explorer le niveau suivant →':'Revenir au cadre ↺'}</button>`;detail.querySelector('.level-next').addEventListener('click',()=>{select((i+1)%4);buttons[(i+1)%4].focus({preventScroll:true})})}
select(0);
motion.addEventListener('change',()=>{if(motion.matches)stopFlight()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){clearTimeout(openTimer);stopFlight()}});

window.addEventListener('resize',stopFlight);
