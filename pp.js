// ═══════════════════════════════
//  CRYSTAL DATA
// ═══════════════════════════════
const CRYSTALS={
  white:   {name:'白水晶 | CLEAR QUARTZ',  meaning:'专注 · 净化 · 平衡 | Focus · Purify · Balance',   hex:'#e2e8f0',r:226,g:232,b:240,freq:493.88},
  amethyst:{name:'紫水晶 | AMETHYST',      meaning:'智慧 · 灵性 · 觉醒 | Wisdom · Spirit · Awake',   hex:'#a855f7',r:168,g:85, b:247,freq:440.00},
  citrine: {name:'黄水晶 | CITRINE',       meaning:'财富 · 自信 · 能量 | Wealth · Confidence · Energy',hex:'#fbbf24',r:251,g:191,b:36, freq:329.63},
  rose:    {name:'粉水晶 | ROSE QUARTZ',   meaning:'爱情 · 治愈 · 人缘 | Love · Healing · Harmony',  hex:'#f472b6',r:244,g:114,b:182,freq:349.23},
  phantom: {name:'幽灵水晶 | PHANTOM QUARTZ',meaning:'事业 · 招财 · 异象 | Career · Fortune · Vision',hex:'#10b981',r:16, g:185,b:129,freq:261.63}
};

let W,H,cx,cy,t=0;
let curKey='white',charging=false,energy=0;
let audioCtx,mainGain,osc1,osc2,oscH,audioOn=false;

const bgC=document.getElementById('bgC'), bgX=bgC.getContext('2d');
const grC=document.getElementById('growC'), grX=grC.getContext('2d');
const krC=document.getElementById('krC'),  krX=krC.getContext('2d');

function resize(){
  var wrap=document.getElementById('cy-charge-wrap');
  if(!wrap)return;
  W=wrap.offsetWidth; H=wrap.offsetHeight;
  bgC.width=grC.width=krC.width=W;
  bgC.height=grC.height=krC.height=H;
  cx=W/2; cy=H/2;
  resetGrowth();
}
window.addEventListener('resize',resize);

// ═══════════════════════════════
//  CRISTAL GROWTH SYSTEM
//  Based on DLA + hexagonal lattice
// ═══════════════════════════════

// Hexagonal lattice directions (6 axes at 0°,60°,120°,180°,240°,300°)
// Plus 6 secondary axes at 30° offsets for richer branching
const HEX_ANGLES = [0,60,120,180,240,300].map(a=>a*Math.PI/180);
const SEC_ANGLES  = [30,90,150,210,270,330].map(a=>a*Math.PI/180);

// A "branch" is a growing arm of the crystal
class Branch {
  constructor(x,y,angle,gen,len,parentEnergy){
    this.x=x; this.y=y;
    this.angle=angle;
    this.gen=gen;          // generation (0=main axis, 1=first branch, etc.)
    this.maxLen=len;
    this.curLen=0;
    this.speed=1.4-gen*0.28; // slower each generation
    this.done=false;
    this.children=[];
    this.spawned=false;
    this.glow=1.0-gen*0.18;
    this.width=Math.max(0.4, 2.2-gen*0.55);
    this.sparkTimer=0;
    this.birthEnergy=parentEnergy;
    // For drawing: collect points
    this.points=[{x,y}];
  }

  grow(energy){
    if(this.done) return;
    const step=this.speed*(0.6+energy*0.016);
    this.curLen+=step;
    const tx=this.x+Math.cos(this.angle)*this.curLen;
    const ty=this.y+Math.sin(this.angle)*this.curLen;
    this.points.push({x:tx,y:ty});
    // Keep points array lean
    if(this.points.length>300) this.points.shift();

    // Spawn child branches at intervals
    if(!this.spawned && this.curLen>=this.maxLen*0.38 && this.gen<4 && energy>8){
      this.spawned=true;
      const tip={x:this.x+Math.cos(this.angle)*this.curLen,
                 y:this.y+Math.sin(this.angle)*this.curLen};
      // Branch off at ±60° (hexagonal law)
      const childLen=this.maxLen*(0.55-this.gen*0.08);
      if(childLen>6){
        [-60,60].forEach(da=>{
          const a=this.angle+da*Math.PI/180;
          this.children.push(new Branch(tip.x,tip.y,a,this.gen+1,childLen,energy));
        });
        // Occasional 3rd branch for higher energy
        if(energy>45 && Math.random()<0.35){
          this.children.push(new Branch(tip.x,tip.y,this.angle,this.gen+1,childLen*0.7,energy));
        }
      }
    }

    if(this.curLen>=this.maxLen) this.done=true;

    // Recurse children
    this.children.forEach(c=>c.grow(energy));
  }

  draw(ctx, r,g,b, baseAlpha){
    if(this.points.length<2) return;
    const alpha=baseAlpha*this.glow;

    // Main arm with gradient glow
    for(let i=1;i<this.points.length;i++){
      const p0=this.points[i-1], p1=this.points[i];
      const progress=i/this.points.length;

      // Outer soft glow pass
      ctx.globalAlpha=alpha*0.25*progress;
      ctx.strokeStyle=`rgb(${r},${g},${b})`;
      ctx.lineWidth=this.width*4.5;
      ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.stroke();

      // Mid glow
      ctx.globalAlpha=alpha*0.45*progress;
      ctx.lineWidth=this.width*2.0;
      ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.stroke();

      // Core bright line
      ctx.globalAlpha=alpha*0.85*progress;
      ctx.strokeStyle=`rgb(${Math.min(255,r+80)},${Math.min(255,g+80)},${Math.min(255,b+80)})`;
      ctx.lineWidth=this.width*0.55;
      ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.stroke();
    }

    // Tip sparkle on active growing tip
    if(!this.done && this.points.length>0){
      const tip=this.points[this.points.length-1];
      const pulse=0.6+Math.sin(t*8+this.gen)*0.4;
      ctx.globalAlpha=alpha*pulse*0.9;
      const sg=ctx.createRadialGradient(tip.x,tip.y,0,tip.x,tip.y,this.width*5);
      sg.addColorStop(0,`rgba(255,255,255,0.9)`);
      sg.addColorStop(0.4,`rgba(${r},${g},${b},0.6)`);
      sg.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle=sg;
      ctx.beginPath();ctx.arc(tip.x,tip.y,this.width*5,0,Math.PI*2);ctx.fill();

      // Node crystal dot at every branch junction
      ctx.globalAlpha=alpha*0.7;
      ctx.fillStyle=`rgba(255,255,255,0.95)`;
      ctx.beginPath();ctx.arc(tip.x,tip.y,this.width*0.7,0,Math.PI*2);ctx.fill();
    }

    // Junction node at branch start
    if(this.gen>0){
      ctx.globalAlpha=alpha*0.65;
      const ng=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.width*3.5);
      ng.addColorStop(0,`rgba(255,255,255,0.85)`);
      ng.addColorStop(0.5,`rgba(${r},${g},${b},0.5)`);
      ng.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle=ng;
      ctx.beginPath();ctx.arc(this.x,this.y,this.width*3.5,0,Math.PI*2);ctx.fill();
    }

    ctx.globalAlpha=1;
    // Recurse
    this.children.forEach(c=>c.draw(ctx,r,g,b,baseAlpha));
  }

  allDone(){
    return this.done && this.children.every(c=>c.allDone());
  }
}

// Main growth manager
let mainBranches=[];
let crystalAge=0;
let crystalFadeIn=0;
let prevKey=null;

function resetGrowth(){
  mainBranches=[];
  crystalAge=0;
  crystalFadeIn=0;
  // Seed 6 main hexagonal axes from crystal center
  HEX_ANGLES.forEach(angle=>{
    mainBranches.push(new Branch(cx,cy,angle,0,85+Math.random()*20,energy));
  });
  // 6 secondary axes (shorter, later gen)
  SEC_ANGLES.forEach(angle=>{
    mainBranches.push(new Branch(cx,cy,angle,1,55+Math.random()*15,energy));
  });
}

// Regrow when energy resets or crystal changes
let lastEnergy=-1;
let regrowTimer=0;

function maybeRegrow(){
  // If charging, let existing crystal grow
  // If energy drops near 0, fade and regrow
  if(energy<2 && lastEnergy>10){
    regrowTimer=80; // delay before regrow
  }
  if(regrowTimer>0){
    regrowTimer--;
    if(regrowTimer===0) resetGrowth();
  }
  lastEnergy=energy;
}

function updateGrowth(){
  crystalAge++;
  const growRate=charging?1:0.3;
  const energyFactor=0.2+energy/100*0.8;

  // Grow all branches
  if(energy>2 || charging){
    mainBranches.forEach(b=>{
      if(Math.random()<growRate*energyFactor) b.grow(energy);
    });
  }

  // Spawn new outer ring when energy is high
  if(charging && energy>55 && crystalAge%120===0){
    const outerR=100+Math.random()*20;
    HEX_ANGLES.forEach((angle,i)=>{
      if(Math.random()<0.5) return;
      const ox=cx+Math.cos(angle)*outerR;
      const oy=cy+Math.sin(angle)*outerR;
      // grow outward from that point
      mainBranches.push(new Branch(ox,oy,angle,1,35+Math.random()*20,energy));
    });
  }

  // Spawn fresh inner branches when charging strongly
  if(charging && energy>30 && crystalAge%60===0){
    const spawnAngle=HEX_ANGLES[Math.floor(Math.random()*6)];
    mainBranches.push(new Branch(cx,cy,spawnAngle,0,70+Math.random()*25,energy));
  }

  // Fade in
  crystalFadeIn=Math.min(1,crystalFadeIn+0.015);

  // Prune very old completed sub-branches to keep perf
  if(mainBranches.length>40) mainBranches=mainBranches.slice(-36);
}

function drawGrowth(){
  // Persistent layer: don't fully clear — let old arms "crystallize" (stay faint)
  grX.globalCompositeOperation='source-over';
  grX.globalAlpha=charging?0.06:0.025;
  grX.fillStyle='black';
  grX.fillRect(0,0,W,H);
  grX.globalAlpha=1;
  grX.globalCompositeOperation='source-over';

  const d=CRYSTALS[curKey];
  const {r,g,b}=d;
  const baseAlpha=crystalFadeIn*(0.35+energy*0.006);

  grX.lineCap='round';
  grX.lineJoin='round';

  mainBranches.forEach(branch=>{
    branch.draw(grX,r,g,b,baseAlpha);
  });

  // Central nucleus — pulsing core node where all branches originate
  const nucleusR=4.5+Math.sin(t*4)*1.5+(energy*0.06);
  const nucPulse=0.7+Math.sin(t*5)*0.3;
  const nuc=grX.createRadialGradient(cx,cy,0,cx,cy,nucleusR*3.5);
  nuc.addColorStop(0,`rgba(255,255,255,${.95*nucPulse*crystalFadeIn})`);
  nuc.addColorStop(0.3,`rgba(${r},${g},${b},${.7*nucPulse*crystalFadeIn})`);
  nuc.addColorStop(1,`rgba(${r},${g},${b},0)`);
  grX.fillStyle=nuc;
  grX.beginPath();grX.arc(cx,cy,nucleusR*3.5,0,Math.PI*2);grX.fill();
  grX.fillStyle='white';
  grX.globalAlpha=.9*crystalFadeIn;
  grX.beginPath();grX.arc(cx,cy,nucleusR*.55,0,Math.PI*2);grX.fill();
  grX.globalAlpha=1;

  // Energy burst sparks when charging (crystallization events)
  if(charging && energy>15 && Math.random()<0.4){
    const ang=HEX_ANGLES[Math.floor(Math.random()*6)];
    const dist=30+Math.random()*60;
    const sx=cx+Math.cos(ang)*dist, sy=cy+Math.sin(ang)*dist;
    const sparkSize=1.5+Math.random()*3;
    grX.globalAlpha=0.7+Math.random()*0.3;
    const spark=grX.createRadialGradient(sx,sy,0,sx,sy,sparkSize*3);
    spark.addColorStop(0,'rgba(255,255,255,0.95)');
    spark.addColorStop(0.4,`rgba(${r},${g},${b},0.6)`);
    spark.addColorStop(1,`rgba(${r},${g},${b},0)`);
    grX.fillStyle=spark;
    grX.beginPath();grX.arc(sx,sy,sparkSize*3,0,Math.PI*2);grX.fill();
    // Tiny cross at spark (crystal node symbol)
    grX.globalAlpha=0.6;
    grX.strokeStyle='rgba(255,255,255,0.8)';
    grX.lineWidth=0.6;
    [0,60,120].forEach(da=>{
      const a=ang+da*Math.PI/180;
      grX.beginPath();
      grX.moveTo(sx,sy);
      grX.lineTo(sx+Math.cos(a)*sparkSize*2.5,sy+Math.sin(a)*sparkSize*2.5);
      grX.stroke();
    });
    grX.globalAlpha=1;
  }
}

// ═══════════════════════════════
//  BACKGROUND
// ═══════════════════════════════
function drawBg(){
  const d=CRYSTALS[curKey];const{r,g,b}=d;
  bgX.clearRect(0,0,W,H);
  const bg=bgX.createRadialGradient(W*.42,H*.38,.1,W*.5,H*.5,W*.85);
  bg.addColorStop(0,`rgba(${Math.round(r*.05)},${Math.round(g*.05)},${Math.round(b*.08)},1)`);
  bg.addColorStop(.45,'rgba(5,4,12,1)');
  bg.addColorStop(1,'rgba(0,0,0,1)');
  bgX.fillStyle=bg;bgX.fillRect(0,0,W,H);
  // Subtle ambient nebula aligned to hex axes
  HEX_ANGLES.slice(0,3).forEach((angle,i)=>{
    const nx=cx+Math.cos(angle)*W*.22,ny=cy+Math.sin(angle)*H*.22;
    const neb=bgX.createRadialGradient(nx,ny,.1,nx,ny,W*.18);
    neb.addColorStop(0,`rgba(${r},${g},${b},${.012+energy*.00025})`);
    neb.addColorStop(1,'rgba(0,0,0,0)');
    bgX.fillStyle=neb;bgX.beginPath();bgX.arc(nx,ny,W*.18,0,Math.PI*2);bgX.fill();
  });
}

// ═══════════════════════════════
//  CRYSTAL COLUMN RENDERER
// ═══════════════════════════════
function drawCrystal(){
  const d=CRYSTALS[curKey];const{r,g,b}=d;
  krX.clearRect(0,0,W,H);
  krX.save();
  const floatY=Math.sin(t*1.4)*6+Math.sin(t*.7)*2.5;
  const wobble=Math.sin(t*.9)*.01;
  const pulse=1+(charging?Math.sin(t*18)*.01*(energy/35):0);
  krX.translate(cx,cy+floatY);krX.scale(pulse,pulse);krX.rotate(wobble);

  const TY=-95,UY=-38,LY=62,BY=98,UW=48,LW=42;
  const isW=curKey==='white';
  function cc(s,a=1){
    const fr=isW?210:r,fg=isW?220:g,fb=isW?235:b;
    return`rgba(${Math.min(255,Math.round(fr*s))},${Math.min(255,Math.round(fg*s))},${Math.min(255,Math.round(fb*s))},${a})`;
  }
  function clip(){
    krX.beginPath();
    krX.moveTo(0,TY);krX.lineTo(UW,UY);krX.lineTo(LW,LY);
    krX.lineTo(0,BY);krX.lineTo(-LW,LY);krX.lineTo(-UW,UY);krX.closePath();
  }

  if(energy>0){
    const aura=krX.createRadialGradient(0,0,30,0,0,155);
    aura.addColorStop(0,`rgba(${r},${g},${b},${.04+energy*.0014})`);
    aura.addColorStop(.6,`rgba(${r},${g},${b},${.01+energy*.0005})`);
    aura.addColorStop(1,'rgba(0,0,0,0)');
    krX.fillStyle=aura;krX.beginPath();krX.arc(0,0,155,0,Math.PI*2);krX.fill();
  }

  clip();
  const body=krX.createLinearGradient(-UW,0,UW,0);
  body.addColorStop(0,cc(.28,.88));body.addColorStop(.35,cc(.62,.82));
  body.addColorStop(.7,cc(1,.78));body.addColorStop(1,cc(1.35,.92));
  krX.fillStyle=body;krX.fill();

  krX.save();krX.beginPath();
  krX.moveTo(0,TY);krX.lineTo(UW,UY);krX.lineTo(0,UY*.5);krX.lineTo(-UW,UY);krX.closePath();
  const tf=krX.createLinearGradient(0,TY,0,UY);
  tf.addColorStop(0,cc(1.55,.95));tf.addColorStop(1,cc(1,.48));
  krX.fillStyle=tf;krX.fill();krX.restore();

  krX.save();krX.beginPath();
  krX.moveTo(0,TY);krX.lineTo(UW,UY);krX.lineTo(LW,LY);krX.lineTo(0,BY);krX.closePath();
  const rf=krX.createLinearGradient(-5,TY,UW,LY);
  rf.addColorStop(0,cc(1.3,.60));rf.addColorStop(1,cc(.55,.43));
  krX.fillStyle=rf;krX.fill();krX.restore();

  krX.save();krX.beginPath();
  krX.moveTo(0,TY);krX.lineTo(-UW,UY);krX.lineTo(-LW,LY);krX.lineTo(0,BY);krX.closePath();
  const lf=krX.createLinearGradient(-UW,0,0,0);
  lf.addColorStop(0,cc(.22,.72));lf.addColorStop(1,cc(.48,.28));
  krX.fillStyle=lf;krX.fill();krX.restore();

  krX.save();clip();krX.clip();
  const ig=krX.createRadialGradient(6,-8,5,6,-8,58);
  ig.addColorStop(0,cc(1.4,.30));ig.addColorStop(.5,cc(1,.08));ig.addColorStop(1,cc(1,0));
  krX.fillStyle=ig;krX.fillRect(-UW,TY,UW*2,BY-TY);
  const rx=Math.sin(t*.75)*14;
  const ra=.048+Math.sin(t*1.1)*.022;
  const ray=krX.createLinearGradient(rx-6,TY,rx+22,BY);
  ray.addColorStop(0,'rgba(255,255,255,0)');
  ray.addColorStop(.3,`rgba(255,255,255,${ra})`);
  ray.addColorStop(.65,`rgba(255,255,255,${ra*1.4})`);
  ray.addColorStop(1,'rgba(255,255,255,0)');
  krX.fillStyle=ray;krX.fillRect(-UW,TY,UW*2,BY-TY);
  if(curKey==='phantom'){
    krX.globalAlpha=.15+Math.sin(t*.6)*.05;
    krX.beginPath();krX.moveTo(0,-52);krX.lineTo(20,-16);krX.lineTo(20,36);
    krX.lineTo(0,52);krX.lineTo(-20,36);krX.lineTo(-20,-16);krX.closePath();
    krX.strokeStyle='rgba(16,185,129,.85)';krX.lineWidth=.8;krX.stroke();
    krX.globalAlpha=1;
  }
  krX.restore();

  if(energy>3){
    krX.save();clip();krX.clip();
    krX.globalCompositeOperation='screen';
    const eg=krX.createRadialGradient(0,5,0,0,5,72);
    eg.addColorStop(0,`rgba(${r},${g},${b},${energy*.007})`);
    eg.addColorStop(.4,`rgba(${r},${g},${b},${energy*.003})`);
    eg.addColorStop(1,'rgba(0,0,0,0)');
    krX.fillStyle=eg;krX.beginPath();krX.arc(0,5,72,0,Math.PI*2);krX.fill();
    const cg=krX.createRadialGradient(0,0,0,0,0,30);
    cg.addColorStop(0,`rgba(255,255,255,${energy*.0042})`);
    cg.addColorStop(1,'rgba(255,255,255,0)');
    krX.fillStyle=cg;krX.beginPath();krX.arc(0,0,30,0,Math.PI*2);krX.fill();
    krX.globalCompositeOperation='source-over';krX.restore();
  }

  krX.save();krX.lineJoin='round';krX.lineCap='round';
  clip();
  krX.strokeStyle=isW?'rgba(200,218,238,.62)':`rgba(${Math.min(255,r+80)},${Math.min(255,g+80)},${Math.min(255,b+80)},.48)`;
  krX.lineWidth=1.1;krX.stroke();
  krX.globalAlpha=.3;
  krX.strokeStyle=isW?'rgba(220,235,252,.9)':`rgba(${Math.min(255,r+65)},${Math.min(255,g+65)},${Math.min(255,b+65)},.9)`;
  krX.lineWidth=.6;
  krX.beginPath();krX.moveTo(0,TY);krX.lineTo(0,BY);krX.stroke();
  krX.beginPath();krX.moveTo(-UW,UY);krX.lineTo(0,-8);krX.lineTo(UW,UY);krX.stroke();
  krX.beginPath();krX.moveTo(-LW,LY);krX.lineTo(0,30);krX.lineTo(LW,LY);krX.stroke();
  krX.globalAlpha=.15;krX.lineWidth=.42;
  krX.beginPath();krX.moveTo(-UW,UY);krX.lineTo(LW,LY);krX.stroke();
  krX.beginPath();krX.moveTo(UW,UY);krX.lineTo(-LW,LY);krX.stroke();
  krX.globalAlpha=1;krX.restore();

  krX.save();
  const h1=krX.createLinearGradient(0,TY,0,UY*.72);
  h1.addColorStop(0,'rgba(255,255,255,.9)');h1.addColorStop(1,'rgba(255,255,255,0)');
  krX.strokeStyle=h1;krX.lineWidth=1.3;krX.globalAlpha=.65;
  krX.beginPath();krX.moveTo(0,TY);krX.lineTo(-UW+3,UY+2);krX.stroke();
  krX.globalAlpha=.8+Math.sin(t*3)*.18;
  krX.fillStyle='rgba(255,255,255,.95)';
  krX.beginPath();krX.arc(0,TY,1.8,0,Math.PI*2);krX.fill();
  krX.globalAlpha=.42+Math.sin(t*3)*.16;krX.strokeStyle='white';krX.lineWidth=.52;
  [[-4,-4],[4,-4],[0,-7],[0,-1]].forEach(([dx,dy])=>{
    krX.beginPath();krX.moveTo(0,TY);krX.lineTo(dx,TY+dy);krX.stroke();
  });
  krX.globalAlpha=1;krX.restore();

  if(energy>2){
    [
      {rad:112+Math.sin(t*2.2)*4,a:.05+energy/370,w:.85},
      {rad:148+Math.cos(t*1.7)*6,a:.03+energy/530,w:.55},
      {rad:192+Math.sin(t*1.3)*8,a:.018+energy/730,w:.38},
    ].forEach(({rad,a,w},i)=>{
      if(energy<i*22)return;
      krX.globalAlpha=a;krX.strokeStyle=d.hex;krX.lineWidth=w;
      krX.beginPath();krX.arc(0,0,rad,0,Math.PI*2);krX.stroke();
    });
    krX.globalAlpha=1;
  }
  krX.restore();
}

// ═══════════════════════════════
//  SELECTION & AUDIO
// ═══════════════════════════════
window.pick=function(key,btn){
  if(key!==prevKey){prevKey=key;resetGrowth();}
  curKey=key;
  const d=CRYSTALS[key];
  document.getElementById('crystalName').innerText=d.name;
  document.getElementById('crystalMeaning').innerText=d.meaning;
  document.getElementById('crystalMeaning').style.color=d.hex;
  document.getElementById('ebar').style.background=`linear-gradient(90deg,rgba(255,255,255,.7),${d.hex})`;
  document.getElementById('chargeBtn').style.color=d.hex;
  document.querySelectorAll('.cb').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  if(audioOn&&osc1){
    const now=audioCtx.currentTime;
    osc1.frequency.setTargetAtTime(d.freq,now,.5);
    osc2.frequency.setTargetAtTime(d.freq+2.5,now,.5);
    oscH.frequency.setTargetAtTime(d.freq*2.02,now,.5);
  }
};
pick('white',null);

function initAudio(){
  if(audioOn)return;
  const AC=window.AudioContext||window.webkitAudioContext;
  audioCtx=new AC();
  mainGain=audioCtx.createGain();mainGain.gain.value=0;
  const comp=audioCtx.createDynamicsCompressor();
  comp.threshold.value=-10;comp.ratio.value=12;
  mainGain.connect(comp);comp.connect(audioCtx.destination);
  const d=CRYSTALS[curKey];
  osc1=audioCtx.createOscillator();osc1.type='sine';osc1.frequency.value=d.freq;
  osc1.connect(mainGain);osc1.start();
  osc2=audioCtx.createOscillator();osc2.type='sine';osc2.frequency.value=d.freq+2.5;
  const g2=audioCtx.createGain();g2.gain.value=.8;
  osc2.connect(g2);g2.connect(mainGain);osc2.start();
  oscH=audioCtx.createOscillator();oscH.type='sine';oscH.frequency.value=d.freq*2.02;
  const gh=audioCtx.createGain();gh.gain.value=.15;
  oscH.connect(gh);gh.connect(mainGain);oscH.start();
  audioOn=true;
}
function updateAudio(ch,lv){
  if(!audioOn)return;
  if(audioCtx.state==='suspended')audioCtx.resume();
  const now=audioCtx.currentTime,d=CRYSTALS[curKey];
  if(ch){mainGain.gain.setTargetAtTime(.4,now,.8);osc2.frequency.setTargetAtTime(d.freq+2.5+(lv*.015),now,.1);}
  else{mainGain.gain.setTargetAtTime(0,now,2.5);osc1.frequency.setTargetAtTime(d.freq,now,1);osc2.frequency.setTargetAtTime(d.freq+2.5,now,1);}
}

// ═══════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════
function loop(){
  t+=.016;
  if(charging){energy=Math.min(100,energy+.35);}
  else{energy=Math.max(0,energy-.18);}

  document.getElementById('ebar').style.width=`${energy}%`;
  const st=document.getElementById('status');
  if(energy>=100){st.innerText='能量共鸣完成 · RESONANCE COMPLETE';st.style.color='rgba(255,255,255,.75)';}
  else if(charging){st.innerText='晶体生长中 · CRYSTAL GROWING...';st.style.color=CRYSTALS[curKey].hex;}
  else{st.innerText='长按注入能量 · HOLD TO CHARGE';st.style.color='#475569';}

  updateAudio(charging,energy);
  maybeRegrow();
  updateGrowth();
  drawBg();
  drawGrowth();
  drawCrystal();
  requestAnimationFrame(loop);
}

window.startC=function(e){
  if(e)e.preventDefault();
  if(!audioOn)initAudio();
  charging=true;document.getElementById('chargeBtn').classList.add('on');
};
window.stopC=function(e){
  if(e)e.preventDefault();
  charging=false;document.getElementById('chargeBtn').classList.remove('on');
};

resize();
loop();
