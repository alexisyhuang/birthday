import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Music2, VolumeX, Gift, RotateCcw, Eraser, Send, Check, Clock3 } from 'lucide-react';
import { assets } from './data/assets';
import { cloudEnabled, guestRequest, verifyInvitation } from './lib/backend';

type Page = 'welcome' | 'letter' | 'hub' | 'dress' | 'draw' | 'santa';
type Outfit = { character: string; accessory: string };
const initialGuestName = new URLSearchParams(location.search).get('guest')?.trim() || 'friend';
const characters = ['cat','dog','olaf','bear'] as const;
const accessoryIds = ['gingerbread','bow','santa_hat','scarf'] as const;
const colors = ['#314d3b','#b75349','#e2a646','#5476a0','#292929'];
const prompts = ['A little Christmas tree','A jolly snowman','A cozy mug of cocoa'];
const read = <T,>(key:string,fallback:T):T => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
function normalizeOutfit(value:Outfit):Outfit {
  const characters:Record<string,string>={'🐱':'cat','🐶':'dog','🐻':'bear','⛄':'olaf','snowman':'olaf'};
  const accessories:Record<string,string>={'🎀':'bow','🎩':'santa_hat','🧣':'scarf','✨':'gingerbread','hat':'santa_hat','sparkle':'gingerbread'};
  return {character:characters[value.character]??value.character,accessory:accessories[value.accessory]??value.accessory};
}

export function App() {
  const [page,setPage]=useState<Page>('welcome');
  const [guestName,setGuestName]=useState(initialGuestName);
  const [backendError,setBackendError]=useState('');
  const [opened,setOpened]=useState(false);
  const [sound,setSound]=useState(false);
  const [outfit,setOutfit]=useState<Outfit>(()=>normalizeOutfit(read(`outfit-${initialGuestName}`,{character:'cat',accessory:'scarf'})));
  const [rsvp,setRsvp]=useState<'yes'|'no'|null>(()=>read(`rsvp-${initialGuestName}`,null));
  const [confirmed,setConfirmed]=useState(false);

  useEffect(()=>{
    if(!cloudEnabled)return;
    verifyInvitation().then(data=>{
      setGuestName(data.guest.name);setRsvp(data.rsvp);
      if(data.outfit)setOutfit({character:data.outfit.character_id==='snowman'?'olaf':data.outfit.character_id,accessory:data.outfit.accessory??''});
    }).catch(e=>setBackendError(e instanceof Error?e.message:'Could not verify invitation.'));
  },[]);
  const goHub=()=>setPage('hub');
  async function saveOutfit(next:Outfit){
    setOutfit(next);localStorage.setItem(`outfit-${guestName}`,JSON.stringify(next));
    if(cloudEnabled)try{await guestRequest('outfit',{character_id:next.character==='olaf'?'snowman':next.character,accessory:next.accessory||null});setBackendError('');}
    catch(e){setBackendError(e instanceof Error?e.message:'Could not save outfit.');}
  }
  async function saveRsvp(answer:'yes'|'no'){
    setRsvp(answer);localStorage.setItem(`rsvp-${guestName}`,JSON.stringify(answer));setConfirmed(true);window.setTimeout(()=>setConfirmed(false),2200);
    if(cloudEnabled)try{await guestRequest('rsvp',{status:answer});setBackendError('');}catch(e){setBackendError(e instanceof Error?e.message:'Could not save RSVP.');}
  }

  const artStyle={'--hub-bg-desktop':`url(\"${assets.hubBackground.desktop}\")`,'--hub-bg-phone':`url(\"${assets.hubBackground.phone}\")`} as CSSProperties;
  return <main className={`scene scene-${page}`} style={artStyle}>
    <div className="grain" aria-hidden="true"/>
    <header className="topbar"><button className="brand" onClick={()=>{setPage('welcome');setOpened(false)}}><span className="brand-mark">✿</span> A LITTLE HOLIDAY THING</button><button className="sound" onClick={()=>setSound(!sound)} aria-label={sound?'Turn sound off':'Turn sound on'}>{sound?<Music2 size={16}/>:<VolumeX size={16}/>}<span>{sound?'Sound on':'Sound off'}</span></button></header>
    {backendError&&<div className="backend-notice" role="status">{backendError}</div>}
    <AnimatePresence mode="wait">
      {page==='welcome' ? <motion.section key="welcome" className="welcome-page" {...transition}>
        <p className="eyebrow"><span/> A LITTLE NOTE FOR YOU <span/></p>
        <motion.button className="welcome-cat" aria-label="Continue to your invitation" onClick={()=>{setOpened(false);setPage('letter')}} whileHover={{scale:1.045,y:-4}} whileTap={{scale:.97}}>
          <img src={assets.welcomeCat} alt="A festive cat with a present"/><span>Tap me!</span>
        </motion.button>
        <p className="welcome-copy">Psst… {guestName}, you’ve got mail!</p>
      </motion.section>
      : page==='letter' ? <motion.section key="letter" className="letter-page" {...transition}>
        {!opened ? <div className="envelope-stage"><p className="eyebrow"><span/> A NOTE FOR YOU <span/></p><motion.button className="envelope-art" onClick={()=>setOpened(true)} whileHover={{y:-5,rotate:-1}} whileTap={{scale:.98}} aria-label="Open your invitation"><img src={assets.envelope} alt="A festive envelope addressed from Allie"/><span className="envelope-prompt">Open your invitation <ArrowRight size={15}/></span></motion.button><p className="tap-hint">A little something has your name on it</p></div>
        : <motion.article className="letter-card" initial={{rotateX:-20,opacity:0,y:22}} animate={{rotateX:0,opacity:1,y:0}} transition={{duration:.65}} style={{backgroundImage:`url("${assets.letterBackground}")`}}>
          <div className="letter-content"><p className="script">Dear {guestName},</p><h1>You’re invited<br/>to a <em>very merry</em><br/>birthday!</h1><p className="copy">We’re celebrating another trip around the sun with a little Christmas magic. Come join us!</p><div className="details"><span>DECEMBER 13 · SUNDAY</span><i>✦</i><span>3—6 PM</span><i>✦</i><span>20 WEST STREET, NYC</span></div><button className="primary" onClick={goHub}>Come on in <ArrowRight size={16}/></button><p className="signoff">With love &amp; tinsel, <b>Allie</b></p></div>
        </motion.article>}
      </motion.section>
      : page==='hub' ? <motion.section key="hub" className="hub-page" {...transition}>
        <div className="hub-heading"><p className="eyebrow"><span/> YOUR LITTLE HOLIDAY WORLD <span/></p><h1>Welcome, <em>{guestName}!</em></h1><p>Choose a little adventure.</p></div>
        <div className="activity-world">
          <HubActivity className="world-dress" label="Dress up" image={assets.activities.dressUp} onClick={()=>setPage('dress')}/>
          <HubActivity className="world-draw" label="Draw and play" image={assets.activities.drawing} onClick={()=>setPage('draw')}/>
          <HubActivity className="world-letters" label="Letters to Santa" image={assets.activities.letters} onClick={()=>setPage('santa')}/>
        </div>
        <button className="back-link" onClick={()=>{setPage('letter');setOpened(true)}}><ArrowLeft size={15}/> Back to your invitation</button>
      </motion.section>
      : <motion.section key={page} className="activity-page" {...transition}>
        <button className="activity-back" onClick={goHub}><ArrowLeft size={15}/> Back to the little world</button>
        {page==='dress'?<DressUp name={guestName} outfit={outfit} onSave={saveOutfit}/>:page==='draw'?<Drawing name={guestName}/>:<Santa name={guestName} rsvp={rsvp} confirmed={confirmed} onSave={saveRsvp}/>}
      </motion.section>}
    </AnimatePresence>
    <footer><span>MADE WITH A LITTLE CHRISTMAS MAGIC</span><span>❄</span><span>DECEMBER · 2026</span></footer><div className="side-stamp"><Gift size={14}/> YOU’RE INVITED</div>
  </main>;
}
const transition={initial:{opacity:0,y:14},animate:{opacity:1,y:0},exit:{opacity:0,y:-12},transition:{duration:.35}};
function HubActivity({className,label,image,onClick}:{className:string;label:string;image:string;onClick:()=>void}){return <motion.button className={`world-activity ${className}`} aria-label={label} onClick={onClick} whileHover={{scale:1.035,rotate:-1}} whileTap={{scale:.97}}><img src={image} alt=""/></motion.button>}
function ActivityTitle({kicker,title,sub}:{kicker:string;title:string;sub:string}){return <div className="activity-title"><p className="eyebrow"><span/>{kicker}<span/></p><h1>{title}</h1><p>{sub}</p></div>}
function DressUp({name,outfit,onSave}:{name:string;outfit:Outfit;onSave:(o:Outfit)=>void}){
  const [character,setCharacter]=useState(outfit.character),[accessory,setAccessory]=useState(outfit.accessory);
  const accessoryImage=accessory==='santa_hat'?'santaHat':accessory as keyof typeof assets.accessories;
  return <><ActivityTitle kicker="THE LITTLE DRESS-UP ROOM" title="A festive friend" sub="Pick a character and give them one special finishing touch."/><div className="dress-layout">
    <div className="character-stage"><span className="stage-star star-one">✦</span><span className="stage-star star-two">✧</span><motion.div key={character} className="character-art"><img className="character-base" src={assets.characters[character as keyof typeof assets.characters]} alt={`${character} character`}/>{accessory&&<img className={`character-accessory accessory-${accessory}`} src={assets.accessories[accessoryImage]} alt=""/>}</motion.div><span className="stage-caption">YOUR LITTLE PAL</span></div>
    <div className="choice-panel"><label>01 / CHOOSE A PAL</label><div className="choice-row">{characters.map(c=><button key={c} className={`choice character-choice ${character===c?'selected':''}`} aria-label={`Choose ${c}`} onClick={()=>setCharacter(c)}><img src={assets.characters[c]} alt=""/></button>)}</div><label>02 / ONE ACCESSORY</label><div className="choice-row">{accessoryIds.map(a=>{const key=a==='santa_hat'?'santaHat':a as keyof typeof assets.accessories;return <button key={a} className={`choice accessory-choice ${accessory===a?'selected':''}`} aria-label={`Choose ${a.replace('_',' ')}`} onClick={()=>setAccessory(a)}><img src={assets.accessories[key]} alt=""/></button>})}<button className={`choice none-choice ${!accessory?'selected':''}`} aria-label="No accessory" onClick={()=>setAccessory('')}>×</button></div><button className="primary save-button" onClick={()=>onSave({character,accessory})}><Check size={15}/> Save this look</button><p className="saved-note">{cloudEnabled?`Saved securely for ${name}.`:`Saved on this device for ${name}.`}</p></div>
  </div></>;
}

function Drawing({name}:{name:string}){const canvasRef=useRef<HTMLCanvasElement>(null),drawing=useRef(false),[color,setColor]=useState(colors[0]),[eraser,setEraser]=useState(false),[prompt]=useState(()=>prompts[Math.floor(Math.random()*prompts.length)]),[seconds,setSeconds]=useState(60),[playing,setPlaying]=useState(false),[submitted,setSubmitted]=useState(false);useEffect(()=>{if(!playing||seconds<=0)return;const t=window.setInterval(()=>setSeconds(s=>Math.max(0,s-1)),1000);return()=>window.clearInterval(t)},[playing,seconds]);useEffect(()=>{const c=canvasRef.current;if(!c)return;const ctx=c.getContext('2d');if(ctx){ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,c.width,c.height)}},[]);function point(e:PointerEvent<HTMLCanvasElement>){const r=e.currentTarget.getBoundingClientRect();return{x:(e.clientX-r.left)*e.currentTarget.width/r.width,y:(e.clientY-r.top)*e.currentTarget.height/r.height}}function down(e:PointerEvent<HTMLCanvasElement>){const c=canvasRef.current!,ctx=c.getContext('2d')!;c.setPointerCapture(e.pointerId);const p=point(e);drawing.current=true;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.strokeStyle=eraser?'#fffdf8':color;ctx.lineWidth=eraser?24:5;ctx.lineCap='round';ctx.lineJoin='round'}function move(e:PointerEvent<HTMLCanvasElement>){if(!drawing.current)return;const p=point(e),ctx=canvasRef.current!.getContext('2d')!;ctx.lineTo(p.x,p.y);ctx.stroke()}function clear(){const c=canvasRef.current!,ctx=c.getContext('2d')!;ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,c.width,c.height);setSubmitted(false)}async function submit(){setPlaying(false);setSubmitted(true);if(cloudEnabled){try{const image=canvasRef.current!.toDataURL('image/png');await guestRequest('submit-drawing',{game_id:'11111111-1111-4111-8111-111111111111',image_base64:image});setSubmitted(true);return}catch{setSubmitted(true);return}}const scores=read<{name:string;score:number}[]>('draw-scores',[]);scores.push({name,score:Math.floor(Math.random()*35)+65});localStorage.setItem('draw-scores',JSON.stringify(scores.slice(-8)))}return <><ActivityTitle kicker="THE TINY ART CHALLENGE" title="Ready, set, doodle!" sub="Draw the prompt before the 60-second timer runs out."/><div className="draw-layout"><section className="draw-card"><div className="prompt-bar"><span>YOUR PROMPT</span><b>{prompt}</b><span className={`timer ${seconds<11?'urgent':''}`}><Clock3 size={14}/>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</span></div><canvas ref={canvasRef} width={640} height={390} className="drawing-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={()=>drawing.current=false} onPointerCancel={()=>drawing.current=false}/><div className="draw-tools"><div className="palette">{colors.map(c=><button key={c} aria-label={`Select ${c}`} className={`color-dot ${color===c&&!eraser?'active':''}`} style={{background:c}} onClick={()=>{setColor(c);setEraser(false)}}/>)}</div><button className={`tool-button ${eraser?'active':''}`} onClick={()=>setEraser(!eraser)}><Eraser size={15}/> Erase</button><button className="tool-button" onClick={clear}><RotateCcw size={15}/> Clear</button></div><div className="draw-actions"><button className="secondary" onClick={()=>{setPlaying(true);setSeconds(60);setSubmitted(false)}}>Start the timer</button><button className="primary" onClick={submit}><Send size={14}/> Send my drawing</button></div>{submitted&&<p className="result-note">{cloudEnabled ? "Your drawing was sent securely for review. Scoring will be added with the server scoring phase." : "Your doodle is in! Demo score saved on this device."}</p>}</section><aside className="leaderboard"><p className="leader-label">THE FESTIVE FIVE</p><h2>Leaderboard</h2>{[...read<{name:string;score:number}[]>('draw-scores',[]),{name:'Merry Maker',score:98},{name:'Snowy',score:91},{name:'Pip',score:84}].sort((a,b)=>b.score-a.score).slice(0,5).map((entry,i)=><div className="leader-row" key={`${entry.name}-${i}`}><span>0{i+1}</span><b>{entry.name}</b><em>{entry.score}</em></div>)}<p className="leader-note">Demo scores are stored in this browser.</p></aside></div></>}
function Santa({name,rsvp,confirmed,onSave}:{name:string;rsvp:'yes'|'no'|null;confirmed:boolean;onSave:(r:'yes'|'no')=>void}){return <><ActivityTitle kicker="A LETTER FOR SANTA" title="Save your little seat" sub="Let Allie know if you can make it. You can change this anytime."/><div className="santa-letter"><span className="stamp">✉</span><div className="letter-rule">NORTH POLE POST · DECEMBER 13</div><p className="script">Dear {name},</p><p className="santa-copy">Allie is saving a place for you at the Christmas birthday party! Will you be there for the cocoa, cake, and holiday cheer?</p><div className="rsvp-buttons"><button className={`rsvp-choice yes ${rsvp==='yes'?'chosen':''}`} onClick={()=>onSave('yes')}><span>🎄</span> Yes, I’ll be there!</button><button className={`rsvp-choice no ${rsvp==='no'?'chosen':''}`} onClick={()=>onSave('no')}><span>💌</span> Can’t make it</button></div>{rsvp&&<motion.p className="rsvp-status" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}>{confirmed?'Your reply has been tucked safely in the post.':`Your reply is saved: ${rsvp==='yes'?'I’ll be there!':'can’t make it'}`}</motion.p>}<p className="santa-sign">With a sprinkle of magic,<br/><b>Santa</b></p></div></>}
