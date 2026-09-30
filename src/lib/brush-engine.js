// Deterministic Canvas 2D brush engine. Coordinates and widths are CSS pixels.
export const clamp = t => Math.max(0, Math.min(1, t));
export function seeded(seed = 1) {
  let state = seed >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const mix = (a,b,t) => a+(b-a)*t;
export function pressureAt(profile, t, endPressure) {
  const keys = Array.isArray(profile) ? profile.map(key => [...key]) : profile === 'fine' ? [[0,.45],[.15,.85],[.8,.7],[1,.18]] : [[0,.22],[.16,1],[.65,.72],[1,.14]];
  if (Number.isFinite(endPressure)) keys[keys.length - 1][1] = clamp(endPressure);
  if(t <= keys[0][0]) return keys[0][1];
  for(let i=1;i<keys.length;i++) if(t <= keys[i][0]) return mix(keys[i-1][1],keys[i][1],(t-keys[i-1][0])/(keys[i][0]-keys[i-1][0]));
  return keys.at(-1)[1];
}
export function samplePath(points, spacing=.65) {
  if(!Array.isArray(points)||points.length<2||points.some(p=>p.length!==2||!p.every(Number.isFinite))) throw new Error('A path needs at least two finite [x,y] points.');
  const dense=[points[0]];
  for(let i=0;i<points.length-1;i++) {
    const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
    const steps=Math.max(16,Math.ceil(Math.hypot(c[0]-b[0],c[1]-b[1])*3));
    for(let j=1;j<=steps;j++) {const t=j/steps;dense.push([0,1].map(k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t)));}
  }
  const cumulative=[0];for(let i=1;i<dense.length;i++)cumulative.push(cumulative[i-1]+Math.hypot(dense[i][0]-dense[i-1][0],dense[i][1]-dense[i-1][1]));
  const length=cumulative.at(-1);if(length<.001)throw new Error('A stroke must have nonzero length.');
  const samples=[],count=Math.ceil(length/spacing);let index=1;
  for(let i=0;i<=count;i++){const distance=length*i/count;while(index<cumulative.length-1&&cumulative[index]<distance)index++;const a=dense[index-1],b=dense[index],span=cumulative[index]-cumulative[index-1],t=span?(distance-cumulative[index-1])/span:0,angle=Math.atan2(b[1]-a[1],b[0]-a[0]);samples.push({x:mix(a[0],b[0],t),y:mix(a[1],b[1],t),angle,t:i/count,distance});}
  return samples;
}

// Split a sampled path into separate, reproducible marks without changing its curve.
export function fragmentStroke(stroke, {maxLength=65,gap=4,seed=1}={}) {
  if(!(maxLength>0)||!Number.isFinite(maxLength)||gap<0||!Number.isFinite(gap)) throw new Error('Fragment length must be positive and gap must be nonnegative.');
  const samples=stroke.samples,total=samples.at(-1).distance;
  if(total<=maxLength) return [stroke];
  const rand=seeded((seed>>>0)^Math.imul(stroke.seed>>>0,2654435761));
  const minLength=Math.min(maxLength,Math.max(8,maxLength*.35));
  const pointAt=distance=>{
    let low=0,high=samples.length-1;
    while(low<high){const mid=(low+high)>>1;if(samples[mid].distance<distance)low=mid+1;else high=mid;}
    const next=samples[low],previous=samples[Math.max(0,low-1)];
    if(next===previous)return {...next,distance};
    const fraction=(distance-previous.distance)/(next.distance-previous.distance);
    return {x:mix(previous.x,next.x,fraction),y:mix(previous.y,next.y,fraction),angle:Math.atan2(next.y-previous.y,next.x-previous.x),distance};
  };
  const fragments=[];
  let start=0;
  while(start<total-2){
    const length=Math.min(total-start,minLength+(maxLength-minLength)*rand());
    const end=start+length;
    const points=[pointAt(start),...samples.filter(p=>p.distance>start&&p.distance<end),pointAt(end)];
    const offset=(rand()-.5)*Math.min(1.4,stroke.width*.22);
    const dx=-Math.sin(points[0].angle)*offset,dy=Math.cos(points[0].angle)*offset;
    const localSamples=points.map(p=>({x:p.x+dx,y:p.y+dy,angle:p.angle,distance:p.distance-start,t:(p.distance-start)/length}));
    fragments.push({...stroke,id:`${stroke.id}-part-${fragments.length}`,samples:localSamples,width:stroke.width*(.88+rand()*.24),pigment:stroke.pigment*(.85+rand()*.2),seed:(stroke.seed+fragments.length*9973+seed)>>>0,delay:stroke.delay+stroke.duration*start/total,duration:Math.max(1,stroke.duration*length/total),start:undefined});
    const space=rand()<.1?-Math.min(gap*.25,1.5):gap*(.55+rand()*.9);
    start=end+space;
  }
  return fragments;
}
export function createBrush(defaults={}) {
  let serial=0;
  return {stroke(options) {const stroke={material:'dry-pastel',color:'#a65726',width:6,grain:.74,edgeRoughness:.35,pigment:.85,endPressure:.14,seed:42,pressure:'taper',duration:1100,delay:0,...defaults,...options};if(!(stroke.width>0)||!(stroke.duration>0))throw new Error('Width and duration must be positive.');if(stroke.endPressure<0||stroke.endPressure>1)throw new Error('endPressure must be between 0 and 1.');stroke.id=options.id||`stroke-${serial++}`;stroke.samples=samplePath(stroke.path);if(stroke.start){const{stroke:parent,at}=stroke.start;if(!parent||!Number.isFinite(parent.delay)||!Number.isFinite(at)||at<0||at>1)throw new Error('Invalid parent stroke timing.');stroke.delay=parent.delay+parent.duration*at;}return stroke;}};
}
function hash(x,y,seed){let n=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;}
export function paperHeight(x,y,seed=902){return .65*hash(Math.floor(x*1.7),Math.floor(y*1.7),seed)+.35*hash(Math.floor(x*.37),Math.floor(y*.37),seed);}
export class StrokeRenderer {
  constructor(stroke,dpr=1){this.stroke=stroke;this.dpr=dpr;const pad=stroke.width+4,s=stroke.samples;this.x=Math.floor(Math.min(...s.map(p=>p.x))-pad);this.y=Math.floor(Math.min(...s.map(p=>p.y))-pad);this.w=Math.ceil(Math.max(...s.map(p=>p.x))-this.x+pad);this.h=Math.ceil(Math.max(...s.map(p=>p.y))-this.y+pad);const surface=()=>{const c=document.createElement('canvas');c.width=Math.ceil(this.w*dpr);c.height=Math.ceil(this.h*dpr);return c;};this.texture=surface();this.visible=surface();this.renderPigment();this.last=-1;}
  renderPigment(){const c=this.texture.getContext('2d'),s=this.stroke,rand=seeded(s.seed),fine=s.material==='fine-pencil';c.setTransform(this.dpr,0,0,this.dpr,-this.x*this.dpr,-this.y*this.dpr);c.fillStyle=s.color;const bristles=Array.from({length:fine?9:30},()=>({offset:rand()*2-1,weight:.5+rand()*.5,phase:rand()*6.28}));for(const p of s.samples){const pressure=pressureAt(s.pressure,p.t,s.endPressure),radius=s.width*pressure*.5,nx=-Math.sin(p.angle),ny=Math.cos(p.angle);for(const b of bristles){const wobble=Math.sin(p.distance*.14+b.phase)*s.edgeRoughness,offset=b.offset*radius+wobble,x=p.x+nx*offset,y=p.y+ny*offset,tooth=paperHeight(x,y),threshold=(fine?.1:.22)+s.grain*(fine?.24:.48)-pressure*.16;if(tooth<threshold||rand()<(fine?.04:.12)*s.grain)continue;c.globalAlpha=clamp(s.pigment*(.12+.3*pressure)*b.weight*(.5+tooth));c.beginPath();c.ellipse(x,y,(fine?.4:.45)+rand()*.42,(fine?.18:.2)+rand()*.32,p.angle,0,Math.PI*2);c.fill();}}c.globalAlpha=1;}
  draw(context,elapsed){const progress=clamp((elapsed-this.stroke.delay)/this.stroke.duration);if(progress<=0)return false;if(progress>=1){context.drawImage(this.texture,this.x,this.y,this.w,this.h);return true;}const count=Math.floor(progress*(this.stroke.samples.length-1));if(count!==this.last){const c=this.visible.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.visible.width,this.visible.height);c.globalCompositeOperation='source-over';c.drawImage(this.texture,0,0);c.globalCompositeOperation='destination-in';c.setTransform(this.dpr,0,0,this.dpr,-this.x*this.dpr,-this.y*this.dpr);c.strokeStyle='#fff';c.lineWidth=this.stroke.width+5;c.lineCap='round';c.lineJoin='round';c.beginPath();this.stroke.samples.slice(0,count+1).forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.globalCompositeOperation='source-over';this.last=count;}context.drawImage(this.visible,this.x,this.y,this.w,this.h);return false;}
}
export const motifs={
  branch({depth=3,spread=.65,seed=12}={}){const rand=seeded(seed),brush=createBrush({seed,width:7}),out=[];function grow(path,level,parent,at=0){const stroke=brush.stroke({path,width:7*Math.pow(.64,level),seed:seed+out.length,duration:1000*Math.pow(.75,level),...(parent?{start:{stroke:parent,at}}:{})});out.push(stroke);if(level>=depth)return;for(const fraction of [.4,.7]){const p=stroke.samples[Math.round(fraction*(stroke.samples.length-1))],angle=p.angle+(rand()>.4?1:-1)*(spread+rand()*.35),len=(85+rand()*45)*Math.pow(.62,level);grow([[p.x,p.y],[p.x+Math.cos(angle)*len*.52,p.y+Math.sin(angle)*len*.5],[p.x+Math.cos(angle-.12)*len,p.y+Math.sin(angle-.12)*len]],level+1,stroke,fraction);}}grow([[65,270],[87,205],[128,145],[186,85],[247,35]],0);return out;},
  strata({count=18,spacing=10,waviness=.25,seed=100}={}){const rand=seeded(seed);return Array.from({length:count},(_,i)=>{const x=25+rand()*110,y=45+i*spacing,len=65+rand()*170;return{path:[[x,y],[x+len*.5,y+(rand()-.5)*waviness*55],[Math.min(390,x+len),y+(rand()-.5)*16]],width:2+rand()*3.5,seed:seed+i,delay:i*65,duration:550};});},
  flow({count=14,bend=.7,variation=.3,seed=220}={}){const rand=seeded(seed);return Array.from({length:count},(_,i)=>{const x=35+i*18,top=30+rand()*50;return{path:[[x,255-rand()*30],[x+12,185],[x+60*bend,130],[Math.min(393,x+110*bend),top]],width:2+rand()*3,seed:seed+i,delay:i*65,duration:900+rand()*variation*500};});},
  burst({count=22,innerRadius=25,outerRadius=125,seed=270}={}){const rand=seeded(seed);return Array.from({length:count},(_,i)=>{const a=i*Math.PI*2/count+(rand()-.5)*.13,r=outerRadius*(.7+rand()*.3),inner=innerRadius+rand()*20;return{path:[[205+Math.cos(a)*inner,148+Math.sin(a)*inner],[205+Math.cos(a+.04)*r*.65,148+Math.sin(a+.04)*r*.65],[205+Math.cos(a)*r,148+Math.sin(a)*r]],width:2+rand()*6,seed:seed+i,delay:i*45,duration:550};});}
};
