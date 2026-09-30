export async function createFunnel({mount,onSelect,getSelected,dialog,motion}){
 const THREE=await import('./vendor/three.module.min.js');
 let renderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{renderer=createCanvasRenderer(THREE);}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setClearColor(0x000000,0);mount.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,40);
 camera.position.set(0,2.6,8.8);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xf7fbff,0x4f5870,2.6));
 const key=new THREE.DirectionalLight(0xffffff,3.1);key.position.set(-4,5,4);scene.add(key);
 const fill=new THREE.DirectionalLight(0xa3b8ff,1.4);fill.position.set(4,1,-2);scene.add(fill);
 const group=new THREE.Group();scene.add(group);group.rotation.y=-.35;
 const colors=[0x80d5c8,0x8ab9ee,0xb5a0ec,0xebac88],radii=[1.65,1.25,.85,.45,.10],meshes=[],parts=[];
 for(let i=0;i<4;i++){
  const part=new THREE.Group();part.position.y=1.36-i*.9;group.add(part);parts.push(part);
  const material=new THREE.MeshStandardMaterial({color:colors[i],roughness:.37,metalness:.13,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radii[i],radii[i+1],.74,64,1,true),material);mesh.userData.level=i;part.add(mesh);meshes.push(mesh);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(radii[i],.026,8,64),new THREE.MeshStandardMaterial({color:colors[i],roughness:.3,metalness:.2}));rim.rotation.x=Math.PI/2;rim.position.y=.37;part.add(rim);
  // Fine rotating ribs make the revolution of a circular shape visible.
  for(let j=0;j<8;j++){
   const angle=j*Math.PI/4,points=[new THREE.Vector3(Math.sin(angle)*radii[i],.37,Math.cos(angle)*radii[i]),new THREE.Vector3(Math.sin(angle)*radii[i+1],-.37,Math.cos(angle)*radii[i+1])];
   part.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.26})));
  }
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#173348';ctx.font='bold 52px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`0${i+1}`,64,48);
  const texture=new THREE.CanvasTexture(canvas),label=new THREE.Mesh(new THREE.PlaneGeometry(.43,.32),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.FrontSide,depthWrite:false}));
  label.position.set(0,.06,(radii[i]+radii[i+1])/2+.04);label.rotation.x=-Math.atan((radii[i]-radii[i+1])/.74);part.add(label);
 }
 let raf=0,last=0,inView=true,disposed=false;
 const canDraw=()=>!disposed&&dialog.open&&!document.hidden&&inView;
 function draw(time){raf=0;if(!canDraw())return;const dt=Math.min((time-last)/1000||.016,.06);last=time;
  if(!motion.matches)group.rotation.y+=dt*.34;
  const selected=getSelected();parts.forEach((part,i)=>{const size=i===selected?1.035:1;part.scale.setScalar(size);meshes[i].material.emissive.setHex(i===selected?colors[i]:0);meshes[i].material.emissiveIntensity=i===selected?.1:0});
  renderer.render(scene,camera);if(!motion.matches)raf=requestAnimationFrame(draw);
 }
 function resume(){if(!raf&&canDraw()){last=performance.now();raf=requestAnimationFrame(draw)}}
 function stop(){cancelAnimationFrame(raf);raf=0}
 function resize(){const w=mount.clientWidth,h=mount.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.position.z=camera.aspect<.85?10.8:8.8;camera.updateProjectionMatrix();resume()}
 const observer=new ResizeObserver(resize);observer.observe(mount);
 const visible=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)resume();else stop()});visible.observe(mount);
 const state=new MutationObserver(()=>{if(dialog.open){resize();resume()}else stop()});state.observe(dialog,{attributes:true,attributeFilter:['open']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else resume()});motion.addEventListener('change',()=>{stop();resume()});
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function hit(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);scene.updateMatrixWorld(true);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(meshes,false)[0]?.object.userData.level}
 mount.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const i=hit(e);mount.style.cursor=i===undefined?'default':'pointer';if(i!==undefined){onSelect(i);resume()}});
 let down=null;mount.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY}});
 mount.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>12)return;down=null;const i=hit(e);if(i!==undefined){onSelect(i);resume()}});mount.addEventListener('pointercancel',()=>{down=null});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();disposed=true;stop();observer.disconnect();visible.disconnect();state.disconnect();mount.closest('.funnel-column').classList.remove('has-3d');renderer.dispose();mount.replaceChildren()});
 mount.closest('.funnel-column').classList.add('has-3d');resize();resume();
 return {resume,refresh:resume};
}

// A small CPU projection of the same meshes when WebGL is unavailable.
function createCanvasRenderer(T){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
 let width=1,height=1,ratio=1;
 return {domElement:canvas,setPixelRatio(n){ratio=Math.min(n,1.5)},setClearColor(){},dispose(){},setSize(w,h){width=w;height=h;canvas.width=w*ratio;canvas.height=h*ratio;canvas.style.width=w+'px';canvas.style.height=h+'px'},
 render(scene,camera){
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);scene.updateMatrixWorld(true);camera.updateMatrixWorld();
  const faces=[],lines=[],labels=[],light=new T.Vector3(-.5,.8,1).normalize();
  const screen=v=>{const q=v.clone().project(camera);return {x:(q.x+1)*width/2,y:(1-q.y)*height/2,z:q.z}};
  scene.traverse(mesh=>{
   if(mesh.isMesh&&mesh.geometry.type==='CylinderGeometry'){
    const geo=mesh.geometry,pos=geo.attributes.position,index=geo.index,base=mesh.material.color.clone().convertLinearToSRGB();
    for(let j=0;j<index.count;j+=3){const v=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(pos,index.getX(j+k)).applyMatrix4(mesh.matrixWorld));
     const n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize(),shade=.62+.35*Math.abs(n.dot(light));
     const points=v.map(screen);faces.push({points,z:points.reduce((sum,p)=>sum+p.z,0)/3,color:`rgb(${Math.min(255,base.r*255*shade)},${Math.min(255,base.g*255*shade)},${Math.min(255,base.b*255*shade)})`});
    }
   }else if(mesh.isLine){const pos=mesh.geometry.attributes.position;lines.push([0,1].map(k=>screen(new T.Vector3().fromBufferAttribute(pos,k).applyMatrix4(mesh.matrixWorld))))}
   else if(mesh.isMesh&&mesh.material.map){const center=new T.Vector3().setFromMatrixPosition(mesh.matrixWorld),normal=new T.Vector3(0,0,1).transformDirection(mesh.matrixWorld);if(normal.dot(camera.position.clone().sub(center))>0)labels.push({point:screen(center),image:mesh.material.map.image})}
  });
  faces.sort((a,b)=>b.z-a.z);for(const face of faces){ctx.beginPath();face.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=face.color;ctx.strokeStyle=face.color;ctx.lineWidth=.6;ctx.fill();ctx.stroke()}
  ctx.strokeStyle='#ffffff25';ctx.lineWidth=.6;for(const [a,b] of lines){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
  for(const {point,image} of labels)ctx.drawImage(image,point.x-17,point.y-13,34,26);
 }};
}
