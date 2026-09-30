'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrush, StrokeRenderer, motifs } from '@/lib/brush-engine.js'

const W=420,H=296
type Point=[number,number]
type Stroke={path:Point[];width:number;seed:number;delay:number;duration:number;pressure?:unknown;start?:unknown}
type TextMark={value:string;x:number;y:number;delay:number;size?:number;rotate?:number}
const line=(path:Point[],delay=0,duration=650,width=7,seed=1):Stroke=>({path,delay,duration,width,seed})
const word=(value:string,x:number,y:number,delay=0,options:Partial<TextMark>={}):TextMark=>({value,x,y,delay,...options})
const motifStrokes:Record<string,Stroke[]>={
  territory:[line([[24,69],[110,72],[190,62]],120,700,2,11),line([[126,132],[214,132],[281,125]],380,660,2,12),line([[27,246],[138,247],[230,238]],620,760,2,13)],
  branch:[], concept:[line([[30,172],[145,170],[229,140],[352,136]],100,900,2,40),line([[139,172],[172,205],[236,228],[348,231]],420,800,2,41),line([[222,140],[248,111],[305,91]],540,570,2,42)],
  landscape:[], projection:[line([[30,109],[122,111],[225,104],[354,91]],200,700,2,140),line([[145,155],[236,154],[355,162]],500,650,2,141),line([[35,208],[171,207],[360,207]],800,780,2,142)],
  celebration:[line([[178,151],[86,58]],80,620,2,160),line([[180,152],[244,73]],330,560,2,161),line([[181,155],[91,234]],580,650,2,162)],
  bark:[line([[66,70],[61,35]],0,340,7,180),line([[89,88],[95,48]],90,360,5,181),line([[129,64],[126,25]],180,330,7,182),line([[168,93],[171,53]],250,360,5,183),line([[213,74],[216,35]],330,330,6,184),line([[267,91],[272,48]],410,360,5,185),line([[324,65],[329,30]],490,340,6,186),line([[354,101],[359,73]],570,300,4,187),line([[78,184],[70,134]],230,440,6,188),line([[117,226],[122,174]],320,450,5,189),line([[162,190],[168,137]],410,440,7,190),line([[207,230],[204,172]],500,470,5,191),line([[253,194],[261,139]],590,450,7,192),line([[302,232],[299,180]],680,430,5,193),line([[345,190],[350,151]],770,390,6,194),line([[118,175],[145,145]],450,350,4,195),line([[254,141],[281,116]],610,340,4,196),line([[298,181],[324,153]],730,340,4,197)],
  flow:[],burst:[],coordination:[line([[66,235],[82,192],[103,154],[128,122],[164,91]],40,700,2,320),line([[98,221],[137,195],[190,179],[263,174]],320,700,2,321),line([[154,161],[196,130],[249,110],[326,87]],560,760,2,322)]
}
const texts:Record<string,TextMark[]>={
  territory:[word('Enquêtes',24,62,40,{size:27}),word('& Immersions',126,124,290,{size:27}),word('de territoire',27,238,530,{size:27})],
  branch:[],concept:[word('Conception',31,164,40,{size:26}),word('& bio-régionale',145,196,370,{size:25,rotate:.28}),word('frugale',245,103,510,{size:25,rotate:-.26})],
  landscape:[],projection:[word('Projections',30,101,50,{size:26}),word('paysagères',145,147,350,{size:26}),word('& climatiques',35,200,650,{size:26})],
  celebration:[word('Animations',71,48,30,{size:25,rotate:.76}),word('festives',181,106,280,{size:25,rotate:-.72}),word('& collectives',80,229,520,{size:25,rotate:-.35})],
  bark:[],flow:[],burst:[],coordination:[word('Gestion',94,142,180,{size:25,rotate:-.42}),word('& coordination',156,151,450,{size:24,rotate:-.36}),word('de projet',195,199,690,{size:25,rotate:-.2})]
}
const labels=[['territory','underlined type','French words connected by brush underlines'],['branch','branching','A botanical branch growing from its trunk'],['concept','typographic fork','French type set along branching lines'],['landscape','strata','Layered landscape marks drawing across paper'],['projection','line rhythm','Three lines of French type with underlines'],['celebration','text rays','French words spreading like rays'],['bark','scattered marks','Scattered bark-like strokes appearing'],['flow','flowing contours','A bundle of flowing marks'],['burst','radial burst','Radial dry brush strokes'],['coordination','rising paths','Project coordination type following rising curves']] as const

export default function BrushAtlas(){
  const canvasRefs=useRef<(HTMLCanvasElement|null)[]>([])
  const studiesRef=useRef<any[]>([])
  const [speed,setSpeed]=useState(1)
  const [dryness,setDryness]=useState(74)
  const [endPressure,setEndPressure]=useState(14)
  const [paused,setPaused]=useState(false)
  const [status,setStatus]=useState('Drawing')
  const speedRef=useRef(speed)
  const pausedRef=useRef(paused)

  useEffect(()=>{
    const dpr=Math.min(window.devicePixelRatio||1,2)
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const stamp=motifs.branch({depth:3,spread:.65,seed:12}) as Stroke[]
    const generated:Record<string,Stroke[]>={
      branch:stamp,
      landscape:motifs.strata({count:19,spacing:10,waviness:.6}) as Stroke[],
      flow:motifs.flow({count:14,bend:.85,variation:.45}) as Stroke[],
      burst:motifs.burst({count:22,innerRadius:23,outerRadius:130}) as Stroke[]
    }
    const brush=createBrush()
    const instances=labels.map(([id],index)=>{
      const canvas=canvasRefs.current[index]
      if(!canvas)return null
      canvas.width=W*dpr;canvas.height=H*dpr
      const context=canvas.getContext('2d')!
      context.setTransform(dpr,0,0,dpr,0,0)
      const fine=texts[id].length>0
      const source=generated[id]||motifStrokes[id]
      const renderers=source.map(s=>new StrokeRenderer(brush.stroke({...s,start:undefined,material:fine?'fine-pencil':'dry-pastel',pressure:fine?'fine':s.pressure||'taper',endPressure:endPressure/100,grain:(fine?.35:1)*dryness/100,pigment:fine?.95:.9,edgeRoughness:fine?.08:.38,width:fine?1.5:s.width}),dpr))
      return {canvas,context,renderers,elapsed:studiesRef.current[index]?.elapsed??-index*90}
    }).filter(Boolean) as {canvas:HTMLCanvasElement;context:CanvasRenderingContext2D;renderers:InstanceType<typeof StrokeRenderer>[];elapsed:number}[]
    studiesRef.current=instances
    let raf=0,last=performance.now(),active=true
    const tick=(now:number)=>{
      if(!active)return
      const dt=now-last;last=now
      let complete=true
      for(const [index,instance] of instances.entries()){
        if(!pausedRef.current&&!reduced)instance.elapsed+=dt*speedRef.current
        const c=instance.context;c.fillStyle='#edf1e8';c.fillRect(0,0,W,H)
        const elapsed=reduced?1e6:instance.elapsed
        for(const renderer of instance.renderers)if(!renderer.draw(c,elapsed))complete=false
        const id=labels[index][0]
        c.fillStyle='#a65726'
        for(const item of texts[id]){const p=Math.max(0,Math.min(1,(elapsed-item.delay)/360));if(p<1)complete=false;if(!p)continue;c.save();c.globalAlpha=p;c.translate(item.x,item.y+(1-p)*5);c.rotate(item.rotate||0);c.font=`400 ${item.size||25}px Arial, Helvetica, sans-serif`;c.fillText(item.value,0,0);c.restore()}
      }
      setStatus(pausedRef.current?'Paused':complete?'Complete':'Drawing')
      if(!complete&&!pausedRef.current&&!reduced)raf=requestAnimationFrame(tick)
    }
    const draw=()=>{cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(tick)}
    const onVisibility=()=>{if(document.hidden)cancelAnimationFrame(raf);else draw()}
    document.addEventListener('visibilitychange',onVisibility)
    if(reduced){for(const instance of instances)instance.elapsed=1e6;draw()}else draw()
    ;(window as any).__brushAtlasRedraw=draw
    ;(window as any).__brushAtlasReduced=reduced
    return()=>{active=false;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',onVisibility);delete (window as any).__brushAtlasRedraw;delete (window as any).__brushAtlasReduced}
  },[dryness,endPressure])

  function replayAll(){studiesRef.current.forEach((s,i)=>s.elapsed=-i*90);pausedRef.current=false;setPaused(false);requestAnimationFrame(()=>{(window as any).__brushAtlasRedraw?.()})}
  function replay(index:number){if((window as any).__brushAtlasReduced)return;const s=studiesRef.current[index];if(s)s.elapsed=0;pausedRef.current=false;setPaused(false);requestAnimationFrame(()=>{(window as any).__brushAtlasRedraw?.()})}
  function togglePause(){pausedRef.current=!pausedRef.current;setPaused(pausedRef.current);requestAnimationFrame(()=>{(window as any).__brushAtlasRedraw?.()})}
  function changeSpeed(value:number){speedRef.current=value;setSpeed(value)}
  function changeDryness(value:number){setDryness(value)}

  return <main className="shell">
    <header><div><p className="eyebrow">Canvas experiment 03</p><h1>Brush motion atlas</h1></div><p className="intro">Ten ways for dry marks to arrive: growing, gathering, branching, radiating and following language. Tap any study to replay it on its own.</p></header>
    <section className="toolbar" aria-label="Animation controls">
      <button className="primary" onClick={replayAll}>Replay all</button><button onClick={togglePause}>{paused?'Resume':'Pause'}</button>
      <div className="control"><label htmlFor="speed">Speed</label><output htmlFor="speed">{speed.toFixed(1)}×</output><input id="speed" type="range" min=".5" max="2" step=".1" value={speed} onChange={e=>changeSpeed(Number(e.target.value))}/></div>
      <div className="control"><label htmlFor="dryness">Dryness</label><output htmlFor="dryness">{dryness}%</output><input id="dryness" type="range" min="20" max="100" step="1" value={dryness} onChange={e=>changeDryness(Number(e.target.value))}/></div>
      <div className="control"><label htmlFor="end-fullness">End fullness</label><output htmlFor="end-fullness">{endPressure}%</output><input id="end-fullness" type="range" min="0" max="100" step="1" value={endPressure} onChange={e=>setEndPressure(Number(e.target.value))} aria-label="Stroke endpoint width as a percentage of peak width"/></div>
      <div className="status"><span className="status-dot"/><span>{status}</span></div>
    </section>
    <section className="atlas" aria-label="Animated brush studies">
      {labels.map(([id,label,description],i)=><div key={id} className="study" tabIndex={0} role="button" data-label={`${String(i+1).padStart(2,'0')} · ${label}`} aria-label={`Replay ${label}`} onClick={()=>replay(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();replay(i)}}}><canvas ref={el=>{canvasRefs.current[i]=el}} role="img" aria-label={description}/></div>)}
      <div className="empty" aria-hidden="true"/><div className="empty" aria-hidden="true"/>
    </section>
    <div className="caption"><p>Canvas studies built from editable paths and reusable brush settings.</p><p>Texture stays fixed as each stroke is revealed.</p></div>
  </main>
}
