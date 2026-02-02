const MAP_SIZE=6000,INITIAL_MASS=40,MIN_MASS=10,ABSORB_RATIO=1.1,PELLET_COUNT=3500,PELLET_MASS=1.6,PELLET_RADIUS=7,EJECT_MASS=8,EJECT_RADIUS=4,EJECT_SPEED=600,SPLIT_COOLDOWN=0.8,MERGE_DELAY=15,BASE_SPEED=600,RADIUS_SCALE=4,ZOOM_MIN=0.45,ZOOM_MAX=1.30,GRID_STEP=50,ENEMY_START=24,BUG_DRAIN=0.12,BAT_DRAIN=0.05,ENEMY_RADIUS=22,SPLIT_LAUNCH=1200,MIN_SPEED=50,MAX_SPEED=800,REPULSE_K=0.6,ATTRACT_K=0.25,MERGE_RATE=0.45,KEBAB_COUNT=40,KEBAB_RADIUS=22,KEBAB_MASS=40;
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const menu=document.getElementById("menu"),nickEl=document.getElementById("nick"),skinEl=document.getElementById("skin"),playBtn=document.getElementById("play");
const massHud=document.getElementById("mass"),scoreHud=document.getElementById("score"),lbHud=document.getElementById("leaderboard");
let W=canvas.width,H=canvas.height;
function rnd(a=1){return Math.random()*a}
function irnd(a){return (Math.random()*a)|0}
function clamp(v,a,b){return v<a?a:v>b?b:v}
function len(x,y){return Math.hypot(x,y)}
function norm(x,y){const l=len(x,y)||1;return [x/l,y/l]}
function radiusFromMass(m){return Math.sqrt(m)*RADIUS_SCALE}
function speedFromMass(m){return clamp(BASE_SPEED/Math.sqrt(m),MIN_SPEED,MAX_SPEED)}
function now(){return performance.now()/1000}
function colorFor(str){let h=0;for(let i=0;i<str.length;i++)h=(h*31+str.charCodeAt(i))>>>0;return `hsl(${h%360} 80% 50%)`}
function toWorld(sx,sy,c){const x=(sx-W/2)/c.zoom+c.x,y=(sy-H/2)/c.zoom+c.y;return [x,y]}
function toScreen(wx,wy,c){const x=(wx-c.x)*c.zoom+W/2,y=(wy-c.y)*c.zoom+H/2;return [x,y]}
class Quad{constructor(x,y,w,h,cap=16,dep=0){this.x=x;this.y=y;this.w=w;this.h=h;this.cap=cap;this.dep=dep;this.items=[];this.q=null}clear(){this.items.length=0;this.q=null}insert(it){if(this.q){const m=(qx, qy, qw, qh)=>wx>=qx&&wx<qx+qw&&wy>=qy&&wy<qy+qh;const wx=it.x,wy=it.y;const [q1,q2,q3,q4]=this.q;if(m(q1.x,q1.y,q1.w,q1.h))return q1.insert(it);if(m(q2.x,q2.y,q2.w,q2.h))return q2.insert(it);if(m(q3.x,q3.y,q3.w,q3.h))return q3.insert(it);if(m(q4.x,q4.y,q4.w,q4.h))return q4.insert(it);this.items.push(it);return}this.items.push(it);if(this.items.length>this.cap&&this.dep<8){const hw=this.w/2,hh=this.h/2;this.q=[new Quad(this.x,this.y,hw,hh,this.cap,this.dep+1),new Quad(this.x+hw,this.y,hw,hh,this.cap,this.dep+1),new Quad(this.x,this.y+hh,hw,hh,this.cap,this.dep+1),new Quad(this.x+hw,this.y+hh,hw,hh,this.cap,this.dep+1)];const cur=this.items;this.items=[];for(const e of cur)this.insert(e)}}query(x,y,w,h,out){if(x>this.x+this.w||x+w<this.x||y>this.y+this.h||y+h<this.y)return out;for(const it of this.items)out.push(it);if(this.q){this.q[0].query(x,y,w,h,out);this.q[1].query(x,y,w,h,out);this.q[2].query(x,y,w,h,out);this.q[3].query(x,y,w,h,out)}return out}}
class Cell{constructor(x,y,m,col,img){this.x=x;this.y=y;this.mass=m;this.col=col;this.img=img;this.vx=0;this.vy=0;this.mergeAt=now()+MERGE_DELAY;this.boost=0}get r(){return radiusFromMass(this.mass)}get speed(){return speedFromMass(this.mass)}update(dt,tx,ty){const dx=tx-this.x,dy=ty-this.y;const [nx,ny]=norm(dx,dy);const t=this.speed;const follow=0.25;const inertia=0.80;this.vx=this.vx*inertia+nx*t*follow;this.vy=this.vy*inertia+ny*t*follow;this.x+=this.vx*dt;this.y+=this.vy*dt;this.x=clamp(this.x,this.r,MAP_SIZE-this.r);this.y=clamp(this.y,this.r,MAP_SIZE-this.r)}project(dir,lenv){this.vx+=dir[0]*lenv;this.vy+=dir[1]*lenv;this.boost=0.6}}
class Player{constructor(name,img){this.name=name||"player";this.img=img;this.cells=[];this.lastSplit=0}get totalMass(){return this.cells.reduce((a,c)=>a+c.mass,0)}center(){let sx=0,sy=0,sm=0;for(const c of this.cells){sx+=c.x*c.mass;sy+=c.y*c.mass;sm+=c.mass}if(sm===0)return [MAP_SIZE/2,MAP_SIZE/2];return [sx/sm,sy/sm]}addCell(c){this.cells.push(c)}update(dt,mouse){for(const c of this.cells)c.update(dt,mouse[0],mouse[1]);this.internal(dt)}split(target){const t=now();if(t-this.lastSplit<SPLIT_COOLDOWN)return;const [cx,cy]=this.center();const dir=norm(target[0]-cx,target[1]-cy);const out=[];for(const c of this.cells){if(c.mass<MIN_MASS*2)continue;const half=c.mass*0.5;c.mass=half;c.mergeAt=t+MERGE_DELAY;const nc=new Cell(c.x,c.y,half,c.col,c.img);nc.mergeAt=t+MERGE_DELAY;nc.project(dir,SPLIT_LAUNCH);c.project(dir,SPLIT_LAUNCH*0.15);out.push(nc)}for(const n of out)this.cells.push(n);this.lastSplit=t}eject(target){const [cx,cy]=this.center();const dir=norm(target[0]-cx,target[1]-cy);for(const c of this.cells){if(c.mass<=MIN_MASS+EJECT_MASS)continue;c.mass-=EJECT_MASS;const ex=c.x+c.r*dir[0],ey=c.y+c.r*dir[1];spawnEjected(ex,ey,dir[0]*EJECT_SPEED,dir[1]*EJECT_SPEED)}}internal(dt){if(this.cells.length<2)return;const t=now();for(let i=0;i<this.cells.length;i++){for(let j=i+1;j<this.cells.length;j++){const a=this.cells[i],b=this.cells[j];const dx=b.x-a.x,dy=b.y-a.y;let d=len(dx,dy);if(d===0){d=0.0001}const nx=dx/d,ny=dy/d;const rs=a.r+b.r;const overlap=rs-d;const canMerge=(t>a.mergeAt&&t>b.mergeAt);if(overlap>0){if(!canMerge){const push=overlap*REPULSE_K;a.x-=nx*push*dt;a.y-=ny*push*dt;b.x+=nx*push*dt;b.y+=ny*push*dt;a.vx-=nx*push;b.vx+=nx*push;a.vy-=ny*push;b.vy+=ny*push}else{const pull=(overlap)*ATTRACT_K;a.x+=nx*pull*dt;a.y+=ny*pull*dt;b.x-=nx*pull*dt;b.y-=ny*pull*dt;const big=a.mass>=b.mass?a:b;const small=big===a?b:a;const tr=MERGE_RATE*dt*small.mass;small.mass=Math.max(0,small.mass-tr);big.mass+=tr;if(small.mass<MIN_MASS*0.35||d<Math.min(a.r,b.r)*0.2){big.mass+=small.mass;this.cells.splice(this.cells.indexOf(small),1)}}}}}}}
class Enemy{constructor(x,y,type){this.x=x;this.y=y;this.type=type;this.vx=rnd(200)-100;this.vy=rnd(200)-100;this.r=this.type==="bug"?ENEMY_RADIUS*1.8:ENEMY_RADIUS}update(dt){this.x+=this.vx*dt;this.y+=this.vy*dt;if(this.x<this.r||this.x>MAP_SIZE-this.r)this.vx*=-1;if(this.y<this.r||this.y>MAP_SIZE-this.r)this.vy*=-1;if(irnd(100)<2){this.vx=rnd(240)-120;this.vy=rnd(240)-120}}drainRate(){return this.type==="bat"?BAT_DRAIN:BUG_DRAIN}}
const state={player:null,food:[],ejected:[],enemies:[],kebabs:[],particles:[],cafardImg:null,kebabImg:null,pelletQT:new Quad(0,0,MAP_SIZE,MAP_SIZE),enemyQT:new Quad(0,0,MAP_SIZE,MAP_SIZE),camera:{x:MAP_SIZE/2,y:MAP_SIZE/2,zoom:1},mouse:[MAP_SIZE/2,MAP_SIZE/2],running:false,difficulty:"normal",theme:"dark"};
function spawnFood(n=PELLET_COUNT){for(let i=0;i<n;i++){state.food.push({x:rnd(MAP_SIZE),y:rnd(MAP_SIZE),r:PELLET_RADIUS,m:PELLET_MASS,c:irnd(360)})}}
function spawnEjected(x,y,vx,vy){state.ejected.push({x,y,r:EJECT_RADIUS,m:EJECT_MASS,vx,vy})}
function spawnEnemies(n){for(let i=0;i<n;i++){const t=i%4===0?"bat":"bug";state.enemies.push(new Enemy(rnd(MAP_SIZE),rnd(MAP_SIZE),t))}}
function spawnKebabs(n){for(let i=0;i<n;i++){state.kebabs.push({x:rnd(MAP_SIZE),y:rnd(MAP_SIZE),r:KEBAB_RADIUS,m:KEBAB_MASS})}}
function rebuildQT(){state.pelletQT.clear();state.enemyQT.clear();for(const p of state.food)state.pelletQT.insert(p);for(const e of state.ejected)state.pelletQT.insert(e);for(const k of state.kebabs)state.pelletQT.insert(k);for(const e of state.enemies)state.enemyQT.insert(e)}
function spawnDrainParticles(x,y,amt,col="#54ff78"){const n=Math.min(14,Math.max(6,Math.round(amt/2)));for(let i=0;i<n;i++){state.particles.push({x,y,vx:(Math.random()*2-1)*220,vy:(Math.random()*2-1)*220,life:0.6,r:2+Math.random()*2,c:col})}}
function updateParticles(dt){for(const p of state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.92;p.vy*=0.92;p.life-=dt}state.particles=state.particles.filter(p=>p.life>0)}
function drawParticles(){const c=state.camera;ctx.globalAlpha=0.85;for(const p of state.particles){const [x,y]=toScreen(p.x,p.y,c);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(x,y,p.r*c.zoom,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
function start(){const name=nickEl.value.trim()||"Azadi";const imgEl=skinEl.files[0];state.difficulty=document.getElementById("difficulty").value;const themeEl=document.getElementById("theme");state.theme=themeEl?themeEl.value:"dark";document.body.classList.toggle("theme-light",state.theme==="light");document.body.classList.toggle("theme-dark",state.theme==="dark");menu.style.display="none";canvas.style.display="block";const img=new Image();if(imgEl){const url=URL.createObjectURL(imgEl);img.src=url;img.onload=()=>URL.revokeObjectURL(url)}state.cafardImg=new Image();state.cafardImg.src="img/cafard.png";state.kebabImg=new Image();state.kebabImg.src="img/kebab.png";
state.player=new Player(name,imgEl?img:null);const sx=rnd(MAP_SIZE-1000)+500,sy=rnd(MAP_SIZE-1000)+500;state.player.addCell(new Cell(sx,sy,INITIAL_MASS,colorFor(name),imgEl?img:null));spawnFood();spawnEnemies(ENEMY_START);spawnKebabs(KEBAB_COUNT);state.running=true;lastT=now();loop()}
function update(dt){if(!state.running)return;state.player.update(dt,state.mouse);for(const e of state.enemies)e.update(dt);for(const p of state.ejected){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.98;p.vy*=0.98;p.x=clamp(p.x,p.r,MAP_SIZE-p.r);p.y=clamp(p.y,p.r,MAP_SIZE-p.r)}rebuildQT();handleCollisions(dt);updateCamera(dt);updateHUD();updateParticles(dt)}
function handleCollisions(dt){
  const cells=state.player.cells;
  for(const c of cells){
    const rr=c.r;const q1=[],q2=[];
    state.pelletQT.query(c.x-rr,c.y-rr,rr*2,rr*2,q1);
    for(const it of q1){
      const dx=it.x-c.x,dy=it.y-c.y;const d=len(dx,dy);
      if(d<rr+it.r){c.mass+=it.m;it.r=0}
    }
    state.food=state.food.filter(p=>p.r>0);
    state.ejected=state.ejected.filter(p=>p.r>0);
    state.kebabs=state.kebabs.filter(k=>k.r>0);
    state.enemyQT.query(c.x-rr,c.y-rr,rr*2,rr*2,q2);
    for(const en of q2){
      const dx=en.x-c.x,dy=en.y-c.y;const d=len(dx,dy);
      if(d<rr+en.r){
        const base=en.drainRate()*(state.difficulty==="hard"?1.6:1);
        const f=clamp(1 - d/en.r, 0, 1);
        const scale=en.type==="bug" ? (0.6 + 1.6*f) : 1;
        const rate=base*scale;
        const lose=c.mass*rate*dt;
        c.mass=Math.max(MIN_MASS,c.mass-lose);
        const col=en.type==="bug"?"#54ff78":"#ff7a3b";
        spawnDrainParticles(c.x,c.y,lose,col);
      }
    }
  }
}
function updateCamera(dt){const [cx,cy]=state.player.center();state.camera.x+= (cx-state.camera.x)*0.1;state.camera.y+= (cy-state.camera.y)*0.1;const tm=Math.max(INITIAL_MASS,state.player.totalMass);const zTarget=clamp(ZOOM_MAX-0.45*Math.log10(tm/INITIAL_MASS+1),ZOOM_MIN,ZOOM_MAX);state.camera.zoom+= (zTarget-state.camera.zoom)*0.14}
function drawGrid(){const c=state.camera;const step=GRID_STEP*c.zoom;const ox=(W/2 - c.x*c.zoom)%step,oy=(H/2 - c.y*c.zoom)%step;ctx.strokeStyle= state.theme==="light" ? "#e5e5e5" : "#1e1e1e";ctx.lineWidth=1;ctx.beginPath();for(let x=ox;x<W;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,H)}for(let y=oy;y<H;y+=step){ctx.moveTo(0,y);ctx.lineTo(W,y)}ctx.stroke()}
function draw(){ctx.clearRect(0,0,W,H);drawGrid();drawMapBounds();drawFood();drawEnemies();drawParticles();drawPlayer()}
function drawMapBounds(){const c=state.camera;ctx.strokeStyle= state.theme==="light" ? "#999" : "#333";ctx.lineWidth=4;ctx.strokeRect(...toScreen(0,0,c),MAP_SIZE*c.zoom,MAP_SIZE*c.zoom)}
function drawFood(){const c=state.camera;for(const p of state.food){const [x,y]=toScreen(p.x,p.y,c);ctx.fillStyle=`hsl(${p.c} 70% 60%)`;ctx.beginPath();ctx.arc(x,y,p.r*c.zoom,0,Math.PI*2);ctx.fill()}for(const p of state.ejected){const [x,y]=toScreen(p.x,p.y,c);ctx.fillStyle="#ffd84a";ctx.beginPath();ctx.arc(x,y,p.r*c.zoom,0,Math.PI*2);ctx.fill()}if(state.kebabImg){for(const k of state.kebabs){const [x,y]=toScreen(k.x,k.y,c);const r=k.r*c.zoom;ctx.drawImage(state.kebabImg,x-r,y-r,r*2,r*2)}}}
function drawEnemies(){const c=state.camera;for(const e of state.enemies){const [x,y]=toScreen(e.x,e.y,c);const r=e.r*c.zoom;if(e.type==="bug"&&state.cafardImg){const ang=Math.atan2(e.vy,e.vx)||0;ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.drawImage(state.cafardImg,-r,-r,r*2,r*2);ctx.restore()}else{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=e.type==="bat"?"#ff3b3b":"#54ff78";ctx.fill()}}}
function drawPlayer(){const c=state.camera;ctx.textAlign="center";ctx.textBaseline="middle";for(const cell of state.player.cells){const [x,y]=toScreen(cell.x,cell.y,c);const r=cell.r*c.zoom;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(cell.img){ctx.save();ctx.clip();ctx.drawImage(cell.img,x-r,y-r,r*2,r*2);ctx.restore();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke()}else{ctx.fillStyle=cell.col;ctx.fill()}ctx.fillStyle="#fff";ctx.font=`${Math.max(10,r*0.28)}px Segoe UI,Roboto,Arial`;ctx.fillText(state.player.name,x,y)}}
function updateHUD(){const tm=Math.round(state.player.totalMass);massHud.textContent="Masse: "+tm;scoreHud.textContent="Score: "+tm;lbHud.textContent="Leaderboard (local): "+state.player.name+" #1"}
let lastT=now();function loop(){const t=now();const dt=Math.min(0.05,Math.max(0.001,t-lastT));lastT=t;update(dt);draw();requestAnimationFrame(loop)}
window.addEventListener("resize",()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;W=canvas.width;H=canvas.height});
canvas.addEventListener("mousemove",(e)=>{state.mouse=toWorld(e.clientX,e.clientY,state.camera)});
window.addEventListener("keydown",(e)=>{if(!state.running)return;if(e.code==="Space"){state.player.split(state.mouse)}else if(e.code==="KeyW"){state.player.eject(state.mouse)}})
playBtn.addEventListener("click",start);
canvas.width=window.innerWidth;canvas.height=window.innerHeight;W=canvas.width;H=canvas.height;