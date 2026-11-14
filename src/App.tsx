import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, PointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Music2, VolumeX, RotateCcw, Eraser, Check, Clock3, CalendarDays, MapPin, Trophy, Pencil, X } from 'lucide-react';
import { assets } from './data/assets';
import { cloudEnabled, guestRequest, verifyInvitation } from './lib/backend';
import { scoreDrawing } from './lib/drawingScore';
import { questionnaireQuestions, questionnaireSchema, type QuestionnaireAnswers } from './lib/questionnaire';

type Page = 'welcome' | 'letter' | 'hub' | 'dress' | 'draw' | 'santa';
type Outfit = { character: string; accessory: string };
type LeaderboardEntry = { score: number; created_at: string; guests?: { name?: string } | { name?: string }[] | null };
type DrawingPrompt = { id: string; title: string; image: string; alt: string; width: number; height: number };
const initialGuestName = new URLSearchParams(location.search).get('guest')?.trim() || 'friend';
const characters = ['cat','dog','olaf','bear'] as const;
const accessoryIds = ['gingerbread','bow','santa_hat','scarf'] as const;
const drawingPrompts: DrawingPrompt[] = [
  {id:'11111111-1111-4111-8111-111111111111',title:'Pusheen’s wreath',image:assets.drawingPrompts.pusheenWreath,alt:'Pusheen inside a Christmas wreath',width:785,height:1000},
  {id:'22222222-2222-4222-8222-222222222222',title:'Bear with a tree',image:assets.drawingPrompts.bearTree,alt:'A bear with a Christmas tree',width:575,height:575},
  {id:'33333333-3333-4333-8333-333333333333',title:'Hello Kitty gingerbread',image:assets.drawingPrompts.helloKittyGingerbread,alt:'Hello Kitty with gingerbread',width:961,height:1204},
  {id:'44444444-4444-4444-8444-444444444444',title:'Pusheen in winter',image:assets.drawingPrompts.pusheenWinter,alt:'Pusheen in a winter scene',width:500,height:467},
];
let drawingPromptQueue:DrawingPrompt[]=[];
let lastDrawingPromptId:string|undefined;
function nextDrawingPrompt():DrawingPrompt{
  if(drawingPromptQueue.length===0){
    drawingPromptQueue=[...drawingPrompts];
    for(let i=drawingPromptQueue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[drawingPromptQueue[i],drawingPromptQueue[j]]=[drawingPromptQueue[j],drawingPromptQueue[i]];}
    if(drawingPromptQueue.length>1&&drawingPromptQueue[0].id===lastDrawingPromptId){[drawingPromptQueue[0],drawingPromptQueue[1]]=[drawingPromptQueue[1],drawingPromptQueue[0]];}
  }
  const next=drawingPromptQueue.shift()!;
  lastDrawingPromptId=next.id;
  return next;
}
const snowflakes = Array.from({length:28},(_,i)=>i);
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
  const [introStarted,setIntroStarted]=useState(false);
  const [introReady,setIntroReady]=useState(!cloudEnabled);
  const [typedCount,setTypedCount]=useState(0);
  const [sound,setSound]=useState(false);
  const [soundUnavailable,setSoundUnavailable]=useState(false);
  const [soundError,setSoundError]=useState('');
  const musicRef=useRef<HTMLAudioElement>(null);
  const cursorRef=useRef<HTMLDivElement>(null);
  const [outfit,setOutfit]=useState<Outfit>(()=>normalizeOutfit(read(`outfit-${initialGuestName}`,{character:'cat',accessory:'scarf'})));
  const [rsvp,setRsvp]=useState<'yes'|'no'|null>(()=>read(`rsvp-${initialGuestName}`,null));
  const [confirmed,setConfirmed]=useState(false);
  const [leavingLetter,setLeavingLetter]=useState(false);
  const [returnToSanta,setReturnToSanta]=useState(false);
  const [questionnaire,setQuestionnaire]=useState<QuestionnaireAnswers>(()=>questionnaireSchema.parse(read(`questionnaire-${initialGuestName}`,{})));
  const [hubReveal,setHubReveal]=useState(false);

  useEffect(()=>{
    if(!cloudEnabled)return;
    verifyInvitation().then(data=>{
      setGuestName(data.guest.name);setRsvp(data.rsvp);setQuestionnaire(data.questionnaire);setIntroReady(true);
      if(data.outfit)setOutfit(normalizeOutfit({character:data.outfit.character_id,accessory:data.outfit.accessory??''}));
    }).catch(e=>{setBackendError(e instanceof Error?e.message:'Could not verify invitation.');setIntroReady(true);});
  },[]);
  useEffect(()=>{
    const cursor=cursorRef.current;
    if(!cursor||!window.matchMedia('(pointer:fine)').matches)return;
    const move=(event:globalThis.PointerEvent)=>{
      if(event.pointerType!=='mouse'&&event.pointerType!=='pen')return;
      const viewport=window.visualViewport;
      const rect=cursor.getBoundingClientRect();
      const x=event.clientX+(viewport?.offsetLeft??0);
      const y=event.clientY+(viewport?.offsetTop??0);
      const hotspotX=rect.width*(16/83);
      const hotspotY=rect.height*(44/93);
      cursor.style.transform=`translate3d(${x-hotspotX}px,${y-hotspotY}px,0)`;
      cursor.style.opacity='1';
    };
    const leave=(event:MouseEvent)=>{if(!event.relatedTarget)cursor.style.opacity='0';};
    window.addEventListener('pointermove',move,{passive:true});
    window.addEventListener('mouseout',leave);
    return()=>{
      window.removeEventListener('pointermove',move);
      window.removeEventListener('mouseout',leave);
    };
  },[]);
  const [hubVisit,setHubVisit]=useState(0);
  const goHub=()=>{setHubVisit(visit=>visit+1);setPage('hub');};
  async function toggleSound(){
    const audio=musicRef.current;
    if(!audio)return;
    if(sound){audio.pause();setSound(false);return;}
    setSoundUnavailable(false);
    setSoundError('');
    audio.volume=0.1;
    try{
      const playback=audio.play();
      setSound(true);
      await playback;
    }catch(error){
      setSound(false);
      setSoundUnavailable(true);
      setSoundError(error instanceof Error?error.message:'Playback was blocked by the browser.');
      console.error('Background music could not start:',error);
    }
  }
  const introLine=`Oh hi, ${guestName}! I have a special delivery for you...`;
  useEffect(()=>{if(!introStarted||!introReady||typedCount>=introLine.length)return;const timer=window.setTimeout(()=>setTypedCount(count=>count+1),42);return()=>window.clearTimeout(timer);},[introStarted,introReady,typedCount,introLine.length]);
  async function saveOutfit(next:Outfit):Promise<boolean>{
    setOutfit(next);localStorage.setItem(`outfit-${guestName}`,JSON.stringify(next));
    if(cloudEnabled)try{await guestRequest('outfit',{character_id:next.character==='olaf'?'snowman':next.character,accessory:next.accessory||null});setBackendError('');}
    catch(e){setBackendError(e instanceof Error?e.message:'Could not save outfit.');return false;}
    return true;
  }
  function answerInvitation(answer:'yes'|'no'){
    if(leavingLetter)return;
    setLeavingLetter(true);
    void saveRsvp(answer);
    window.setTimeout(()=>{setHubReveal(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);setPage('hub');},800);
  }
  async function saveRsvp(answer:'yes'|'no'){
    setRsvp(answer);localStorage.setItem(`rsvp-${guestName}`,JSON.stringify(answer));setConfirmed(true);window.setTimeout(()=>setConfirmed(false),2200);
    if(cloudEnabled)try{await guestRequest('rsvp',{status:answer});setBackendError('');}catch(e){setBackendError(e instanceof Error?e.message:'Could not save RSVP.');}
  }
  async function saveQuestionnaire(answers:QuestionnaireAnswers):Promise<boolean>{
    setQuestionnaire(answers);localStorage.setItem(`questionnaire-${guestName}`,JSON.stringify(answers));
    if(cloudEnabled)try{await guestRequest('questionnaire',{answers});setBackendError('');}
    catch(e){setBackendError(e instanceof Error?e.message:'Could not save your answers.');return false;}
    return true;
  }

  const artStyle={'--hub-bg-desktop':`url(\"${assets.hubBackground.desktop}\")`,'--hub-bg-phone':`url(\"${assets.hubBackground.phone}\")`} as CSSProperties;
  return <main className={`scene scene-${page}${page==='hub'&&hubReveal?' revealing-hub':''}`} style={artStyle}>
    <div className="grain" aria-hidden="true"/>
    {createPortal(<div ref={cursorRef} className="art-cursor" aria-hidden="true"><img src={assets.cursor} alt=""/></div>,document.body)}
    <audio ref={musicRef} src={assets.backgroundMusic} loop preload="auto" onError={()=>{setSound(false);setSoundUnavailable(true);setSoundError('The music file could not be loaded.');}} />
    {page!=='welcome'&&<header className={`topbar ${page==='letter'&&returnToSanta?'topbar-returning':''}`}><button type="button" className="sound" onClick={()=>void toggleSound()} aria-label={sound?'Turn sound off':'Turn sound on'} aria-pressed={sound}>{sound?<Music2 size={16}/>:<VolumeX size={16}/>}<span>{sound?'Sound on':'Sound off'}</span></button>{soundUnavailable&&<span className="sound-error" role="status" title={soundError}>{soundError?'Music couldn’t play':'Music unavailable'}</span>}{page==='letter'&&returnToSanta&&<button className="return-to-santa" onClick={()=>{setReturnToSanta(false);setPage('santa');}}><ArrowLeft size={15}/> Back to Letters to Santa</button>}</header>}
    {backendError&&page!=='welcome'&&<div className="backend-notice" role="status">{backendError}</div>}
    {page==='hub'&&<div className="hub-snow" aria-hidden="true">{snowflakes.map(i=><span key={i} style={{'--flake-x':`${(i*37)%100}%`,'--flake-delay':`${-(i*1.31)%15}s`,'--flake-duration':`${11+(i*7)%11}s`,'--flake-size':`${2+(i%3)}px`} as CSSProperties}/>)}</div>}
    <AnimatePresence mode="wait">
      {page==='welcome' ? <motion.section key="welcome" className="welcome-page" {...transition}>
        <div className="welcome-stage"><motion.button className="welcome-cat" aria-label={introStarted?'Welcome cat holding a present':'Talk to the welcome cat'} onClick={()=>setIntroStarted(true)} whileHover={{scale:1.025}} whileTap={{scale:.98}}>
          <AnimatePresence mode="wait" initial={false}><motion.img key={introStarted?'welcome-cat-reaction':'welcome-cat-intro'} className={`welcome-cat-art ${introStarted?'welcome-cat-art-reaction':''}`} src={introStarted?assets.welcomeCatAfterClick:assets.welcomeCat} alt={introStarted?'The welcome cat smiles with its present':'A festive cat holding a present'} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.16}}/></AnimatePresence><motion.img className="exclamation-bubble" src={assets.exclamationBubble} alt="" aria-hidden="true" animate={{y:[0,-11,0],rotate:[0,3,0]}} transition={{duration:1.15,repeat:Infinity,ease:'easeInOut'}}/>
        </motion.button></div>
        {introStarted&&introReady&&<div className="game-dialogue" aria-live="polite"><p>{introLine.slice(0,typedCount)}{typedCount<introLine.length&&<span className="type-caret"/>}</p>{typedCount>=introLine.length&&<button onClick={()=>{setOpened(false);setPage('letter')}}>Continue <ArrowRight size={15}/></button>}</div>}
      </motion.section>
      : page==='letter' ? <motion.section key="letter" className="letter-page" {...transition}>
        {!opened ? <div className="envelope-stage"><motion.button className="envelope-art" onClick={()=>setOpened(true)} whileHover={{y:-5,rotate:-1}} whileTap={{scale:.98}} aria-label="Open your invitation"><img src={assets.envelope} alt="A festive envelope addressed from Allie"/><span className="recipient-name">For {guestName}</span></motion.button></div>
        : <motion.article className="letter-card" initial={{rotateX:-20,opacity:0,y:22}} animate={{rotateX:0,opacity:1,y:0}} transition={{duration:.65}} style={{backgroundImage:`url("${assets.letterBackground}")`}}>
          <div className="letter-content"><p className="script">Dear {guestName},</p><h1>You’re invited<br/>to a <em>very merry</em><br/>birthday!</h1><div className="party-details"><div><CalendarDays size={17}/><span>Sat · Dec 12</span></div><div><Clock3 size={17}/><span>2–5 PM</span></div><div><MapPin size={17}/><span>20 West Street, NYC</span></div></div><div className="letter-actions"><button className="rsvp-letter yes" disabled={leavingLetter} onClick={()=>answerInvitation('yes')}><span>🎄</span> Yes, I can make it!</button><button className="rsvp-letter no" disabled={leavingLetter} onClick={()=>answerInvitation('no')}><span>💌</span> Maybe next year :(</button></div>{rsvp&&<motion.p className="letter-rsvp-status" initial={{opacity:0,y:5}} animate={{opacity:1,y:0}}>{confirmed?'Your reply has been saved!':`Your RSVP is saved as “${rsvp==='yes'?'Yes, I can make it':'Maybe next year :('}.”`}</motion.p>}<p className="signoff">Love, <b>Allie</b></p></div>
        </motion.article>}
      </motion.section>
      : page==='hub' ? <motion.section key={`hub-${hubVisit}`} className="hub-page" {...(hubReveal?{initial:{opacity:0,scale:1.035,filter:'blur(7px)'},animate:{opacity:1,scale:1,filter:'blur(0px)'},exit:{opacity:0},transition:{duration:1.65,ease:[0.22,1,0.36,1]}}:transition)}>
        <div className="activity-world">
          <HubActivity className="world-dress" label="Dress up" image={assets.activities.dressUp} onClick={()=>setPage('dress')}/>
          <HubActivity className="world-draw" label="Draw and play" image={assets.activities.drawing} onClick={()=>setPage('draw')}/>
          <HubActivity className="world-letters" label="Letters to Santa" image={assets.activities.letters} onClick={()=>setPage('santa')}/>
        </div>
      </motion.section>
      : <motion.section key={page} className="activity-page" {...transition}>
        <button className="activity-back" onClick={goHub}><ArrowLeft size={15}/> Back</button>
        {page==='dress'?<DressUp name={guestName} outfit={outfit} onSave={saveOutfit}/>:page==='draw'?<Drawing onBack={goHub}/>:<Santa name={guestName} rsvp={rsvp} confirmed={confirmed} answers={questionnaire} onRsvp={saveRsvp} onSaveAnswers={saveQuestionnaire} onInvitation={()=>{setLeavingLetter(false);setReturnToSanta(true);setOpened(true);setPage('letter');}}/>}
      </motion.section>}
    </AnimatePresence>
    {page==='hub'&&hubReveal&&<motion.div className="hub-blackout" aria-hidden="true" initial={{opacity:1}} animate={{opacity:0}} transition={{duration:1.8,ease:'easeOut'}} onAnimationComplete={()=>setHubReveal(false)}/>}
    {page!=='hub'&&page!=='welcome'&&<footer><span>ALLIE’S 25TH BIRTHDAY</span><span>❄</span><span>DECEMBER 12, 2026</span></footer>}
  </main>;
}
const transition={initial:{opacity:0,y:14},animate:{opacity:1,y:0},exit:{opacity:0,y:-12},transition:{duration:.35}};
function HubActivity({className,label,image,onClick}:{className:string;label:string;image:string;onClick:()=>void}){return <motion.button className={`world-activity ${className}`} aria-label={label} onClick={onClick} whileHover={{scale:1.035,rotate:-1}} whileTap={{scale:.97}}><img src={image} alt=""/></motion.button>}
function ActivityTitle({kicker,title,sub}:{kicker?:string;title:string;sub:string}){return <div className="activity-title">{kicker&&<p className="eyebrow"><span/>{kicker}<span/></p>}<h1>{title}</h1><p>{sub}</p></div>}
function DressUp({name,outfit,onSave}:{name:string;outfit:Outfit;onSave:(o:Outfit)=>Promise<boolean>}){
  const [character,setCharacter]=useState(outfit.character),[accessory,setAccessory]=useState(outfit.accessory),[saved,setSaved]=useState(false),[saving,setSaving]=useState(false);
  const [saveMessage,setSaveMessage]=useState('');
  const [saveMoment,setSaveMoment]=useState(0);
  const compliments=['Looking extra cozy!','A holiday cutie!','Ready for the festivities!','Absolutely snow adorable!','A very dapper delight!'];
  const accessoryImage=accessory==='santa_hat'?'santaHat':accessory as keyof typeof assets.accessories;
  async function save(){if(saving)return;setSaving(true);try{if(!await onSave({character,accessory}))return;setSaveMessage(compliments[Math.floor(Math.random()*compliments.length)]);setSaved(true);setSaveMoment(moment=>moment+1);window.setTimeout(()=>setSaved(false),2400);}finally{setSaving(false);}}
  return <><ActivityTitle title="Dress up" sub="Pick a character and pick an accessory!"/><div className="dress-layout">
    <div className="character-stage"><span className="stage-star star-one">✦</span><span className="stage-star star-two">✧</span><motion.div key={character} className={`character-art character-${character}`} animate={saved?{scale:[1,1.12,.96,1.04,1],rotate:[0,-5,5,-3,0],y:[0,-20,2,-9,0]}:{}} transition={{duration:.8,ease:'easeOut'}}><img className="character-base" src={assets.characters[character as keyof typeof assets.characters]} alt={`${character} character`}/>{accessory&&<img className={`character-accessory accessory-${accessory}`} src={assets.accessories[accessoryImage]} alt=""/>}</motion.div>{saved&&<motion.div key={saveMoment} className="save-glimmer" initial={{opacity:0,scale:.35,y:24,rotate:-12}} animate={{opacity:1,scale:[1.25,.96,1],y:0,rotate:0}} exit={{opacity:0,scale:.8,y:-20}} transition={{type:'spring',stiffness:280,damping:14}}>✦ {saveMessage} ✦</motion.div>}{saved&&<div className="save-sparkles" aria-hidden="true">{Array.from({length:10},(_,i)=><motion.i key={`${saveMoment}-${i}`} initial={{opacity:0,scale:0,x:0,y:0,rotate:0}} animate={{opacity:[0,1,0],scale:[0,1.2,0],x:Math.cos(i*Math.PI/5)*125,y:Math.sin(i*Math.PI/5)*115,rotate:180}} transition={{duration:.9,delay:i*.025,ease:'easeOut'}}>✦</motion.i>)}</div>}</div>
    <div className="choice-panel"><label>01 / CHOOSE A CHARACTER</label><div className="choice-row">{characters.map(c=><button key={c} className={`choice character-choice ${character===c?'selected':''}`} aria-label={`Choose ${c}`} onClick={()=>{setCharacter(c);setSaved(false)}}><img src={assets.characters[c]} alt=""/></button>)}</div><label>02 / ONE ACCESSORY</label><div className="choice-row">{accessoryIds.map(a=>{const key=a==='santa_hat'?'santaHat':a as keyof typeof assets.accessories;return <button key={a} className={`choice accessory-choice ${accessory===a?'selected':''}`} aria-label={`Choose ${a.replace('_',' ')}`} onClick={()=>{setAccessory(a);setSaved(false)}}><img src={assets.accessories[key]} alt=""/></button>})}<button className={`choice none-choice ${!accessory?'selected':''}`} aria-label="No accessory" onClick={()=>{setAccessory('');setSaved(false)}}>×</button></div><motion.button className="primary save-button" onClick={()=>void save()} disabled={saving} whileTap={{scale:.96}}><Check size={15}/>{saving?'Saving…':saved?'Looking spiffy!':'Save this look'}</motion.button><p className="saved-note">{saved?'Your festive look is saved!':cloudEnabled?`Saved for ${name}.`:`Saved on this device for ${name}.`}</p></div>
  </div></>;
}
function Drawing({onBack}:{onBack:()=>void}){
  const [prompt,setPrompt]=useState(nextDrawingPrompt);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const referenceRef=useRef<HTMLImageElement>(null);
  const brushCursorRef=useRef<HTMLDivElement>(null);
  const drawing=useRef(false);
  const finished=useRef(false);
  const completedRound=useRef(false);
  const finishRef=useRef<()=>void>(()=>{});
  const [penSize,setPenSize]=useState(7);
  const [tool,setTool]=useState<'pen'|'eraser'>('pen');
  const [seconds,setSeconds]=useState(180);
  const [playing,setPlaying]=useState(false);
  const [referenceReady,setReferenceReady]=useState(false);
  const [resultStage,setResultStage]=useState<'closed'|'compare'|'score'>('closed');
  const [comparisonDrawing,setComparisonDrawing]=useState('');
  const [similarityScore,setSimilarityScore]=useState<number|null>(null);
  const [submitError,setSubmitError]=useState('');
  const [submissionState,setSubmissionState]=useState<'not-saved'|'saving'|'saved'|'failed'>('not-saved');
  const [leaderboard,setLeaderboard]=useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading,setLeaderboardLoading]=useState(cloudEnabled);
  const [leaderboardError,setLeaderboardError]=useState('');
  const [leaderboardOpen,setLeaderboardOpen]=useState(false);

  const loadLeaderboard=useCallback(async()=>{
    if(!cloudEnabled){setLeaderboardLoading(false);return;}
    setLeaderboardLoading(true);setLeaderboardError('');
    try{
      const data=await guestRequest<{leaderboard:LeaderboardEntry[]}>('leaderboard');
      setLeaderboard(data.leaderboard??[]);
    }catch(e){setLeaderboardError(e instanceof Error?e.message:'Could not load leaderboard.');}
    finally{setLeaderboardLoading(false);}
  },[]);
  useEffect(()=>{void loadLeaderboard();},[loadLeaderboard]);

  useEffect(()=>{
    if(!playing)return;
    const timer=window.setInterval(()=>setSeconds(value=>Math.max(0,value-1)),1000);
    return()=>window.clearInterval(timer);
  },[playing]);
  useEffect(()=>{
    const canvas=canvasRef.current;
    const context=canvas?.getContext('2d');
    if(canvas&&context){context.fillStyle='#fffdf8';context.fillRect(0,0,canvas.width,canvas.height);}
  },[]);
  useEffect(()=>()=>document.body.classList.remove('drawing-cursor-active'),[]);

  function point(e:PointerEvent<HTMLCanvasElement>){
    const rect=e.currentTarget.getBoundingClientRect();
    return{x:(e.clientX-rect.left)*e.currentTarget.width/rect.width,y:(e.clientY-rect.top)*e.currentTarget.height/rect.height};
  }
  function updateBrushCursor(e:PointerEvent<HTMLCanvasElement>){
    const cursor=brushCursorRef.current;
    if(!cursor||e.pointerType==='touch')return;
    const rect=e.currentTarget.getBoundingClientRect();
    const diameter=Math.max(2,(tool==='eraser'?penSize*4:penSize)*rect.width/e.currentTarget.width);
    cursor.style.width=`${diameter}px`;cursor.style.height=`${diameter}px`;
    cursor.style.transform=`translate3d(${e.clientX-rect.left-diameter/2}px,${e.clientY-rect.top-diameter/2}px,0)`;
    cursor.style.opacity='1';
    document.body.classList.add('drawing-cursor-active');
  }
  function hideBrushCursor(){
    if(brushCursorRef.current)brushCursorRef.current.style.opacity='0';
    document.body.classList.remove('drawing-cursor-active');
  }
  function down(e:PointerEvent<HTMLCanvasElement>){
    const canvas=canvasRef.current;
    const context=canvas?.getContext('2d');
    if(finished.current||!referenceReady||!canvas||!context)return;
    updateBrushCursor(e);
    if(!playing)startRound();
    canvas.setPointerCapture(e.pointerId);
    const p=point(e);
    drawing.current=true;
    context.beginPath();context.moveTo(p.x,p.y);
    context.strokeStyle=tool==='eraser'?'#fffdf8':'#211e1d';
    context.lineWidth=tool==='eraser'?penSize*4:penSize;
    context.lineCap='round';context.lineJoin='round';
  }
  function move(e:PointerEvent<HTMLCanvasElement>){
    updateBrushCursor(e);
    if(!drawing.current)return;
    const context=canvasRef.current?.getContext('2d');
    if(!context)return;
    const p=point(e);context.lineTo(p.x,p.y);context.stroke();
  }
  function clear(){
    const canvas=canvasRef.current;
    const context=canvas?.getContext('2d');
    if(!canvas||!context)return;
    context.fillStyle='#fffdf8';context.fillRect(0,0,canvas.width,canvas.height);
    setResultStage('closed');setSimilarityScore(null);setSubmitError('');setSubmissionState('not-saved');
  }
  async function finishDrawing(){
    if(finished.current)return;
    const canvas=canvasRef.current;
    const reference=referenceRef.current;
    if(!canvas||!reference||!referenceReady)return;
    finished.current=true;completedRound.current=true;drawing.current=false;setPlaying(false);setSubmitError('');setSubmissionState(cloudEnabled?'saving':'not-saved');
    setComparisonDrawing(canvas.toDataURL('image/png'));
    let score:number|null=null;
    try{score=scoreDrawing(reference,canvas);}
    catch{setSubmitError('Could not calculate a score for this drawing.');setSubmissionState('failed');}
    setSimilarityScore(score);
    setResultStage('compare');
    if(score===null)return;
    if(cloudEnabled){
      try{
        const result=await guestRequest<{submission:{score:number|null}}>('submit-drawing',{game_id:prompt.id,score,image_base64:canvas.toDataURL('image/png')});
        if(result.submission?.score==null){setSubmissionState('failed');setSubmitError('The drawing was saved without a score. Deploy the latest guest-api function, then draw again.');return;}
        setSubmissionState('saved');
        await loadLeaderboard();
      }catch(e){setSubmissionState('failed');setSubmitError(e instanceof Error?e.message:'Could not send your drawing.');}
    }
  }
  finishRef.current=()=>{void finishDrawing();};
  useEffect(()=>{
    if(playing&&seconds===0)finishRef.current();
  },[playing,seconds]);
  function startRound(){
    if(completedRound.current){setPrompt(nextDrawingPrompt());setReferenceReady(false);completedRound.current=false;}
    const canvas=canvasRef.current;
    const context=canvas?.getContext('2d');
    if(canvas&&context){context.fillStyle='#fffdf8';context.fillRect(0,0,canvas.width,canvas.height);}
    finished.current=false;setComparisonDrawing('');setSimilarityScore(null);setSubmitError('');setSubmissionState('not-saved');setResultStage('closed');setSeconds(180);setPlaying(true);
  }

  return <>
    <ActivityTitle title="Drawing Challenge!" sub="Try to make your drawing as similar as possible before time is up. See if you can make it on the leaderboard!"/>
    <div className="draw-layout">
      <section className="draw-card">
        <div className="draw-pair">
          <div className="draw-panel">
            <div className="draw-panel-heading"><b>The Blueprint</b><span>{prompt.title}</span></div>
            <div className="drawing-surface reference-surface" style={{aspectRatio:`${prompt.width}/${prompt.height}`}}>
              <img ref={referenceRef} src={prompt.image} alt={prompt.alt} onLoad={()=>setReferenceReady(true)} onError={()=>setSubmitError('The drawing prompt could not be loaded.')}/>
              <GridOverlay/>
            </div>
          </div>
          <div className="draw-panel">
            <div className="draw-panel-heading"><b>Your drawing</b><span className={`timer ${seconds<11?'urgent':''}`}><Clock3 size={14}/>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</span></div>
            <div className="drawing-surface" style={{aspectRatio:`${prompt.width}/${prompt.height}`}}>
              <canvas ref={canvasRef} width={prompt.width} height={prompt.height} className="drawing-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={()=>drawing.current=false} onPointerCancel={()=>{drawing.current=false;hideBrushCursor()}} onPointerEnter={updateBrushCursor} onPointerLeave={hideBrushCursor}/>
              <GridOverlay/>
              <div ref={brushCursorRef} className={`brush-cursor ${tool==='eraser'?'brush-eraser':''}`} aria-hidden="true"/>
            </div>
          </div>
        </div>
        <div className="draw-tools">
          <div className="draw-tools-left">
            <div className="draw-tool-mode" role="group" aria-label="Drawing tool">
              <button className={`tool-button ${tool==='pen'?'active':''}`} aria-pressed={tool==='pen'} onClick={()=>setTool('pen')}><Pencil size={15}/> Pen</button>
              <button className={`tool-button ${tool==='eraser'?'active':''}`} aria-pressed={tool==='eraser'} onClick={()=>setTool('eraser')}><Eraser size={15}/> Eraser</button>
            </div>
            <div className="pen-sizes" role="group" aria-label="Pen and eraser size">{[{size:3,label:'Small'},{size:7,label:'Medium'},{size:13,label:'Large'},{size:18,label:'Extra large'},{size:24,label:'Jumbo'}].map(option=><button key={option.size} className={`pen-size ${penSize===option.size?'active':''}`} aria-label={`${option.label} size`} aria-pressed={penSize===option.size} onClick={()=>setPenSize(option.size)}><i style={{width:option.size+3,height:option.size+3}}/></button>)}</div>
          </div>
          <button className="tool-button" onClick={clear}><RotateCcw size={15}/> Clear</button>
        </div>
        <div className="draw-actions">
          {!playing?<button className="secondary start-drawing" onClick={startRound}><Clock3 size={14}/> Start · 3 minutes</button>:<button className="secondary" onClick={()=>void finishDrawing()}><Check size={14}/> Submit drawing</button>}
          <button className="leaderboard-toggle" onClick={()=>{setLeaderboardOpen(true);void loadLeaderboard()}} aria-label="Open leaderboard" aria-expanded={leaderboardOpen} title="Leaderboard"><Trophy size={19}/></button>
        </div>
        {submitError&&<p className="result-note result-error" role="alert">{submitError}</p>}
      </section>
    </div>
    {createPortal(<AnimatePresence>
      {leaderboardOpen&&<motion.div className="leaderboard-backdrop" role="presentation" onClick={()=>setLeaderboardOpen(false)} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
        <motion.aside className="leaderboard leaderboard-modal" aria-live="polite" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title" onClick={e=>e.stopPropagation()} initial={{opacity:0,x:28,scale:.97}} animate={{opacity:1,x:0,scale:1}} exit={{opacity:0,x:18,scale:.98}}>
          <div className="leaderboard-heading"><span className="leaderboard-trophy"><Trophy size={22}/></span><div><p className="leader-label">THE DRAWING CHALLENGE</p><h2 id="leaderboard-title">Leaderboard</h2></div><button className="leaderboard-close" aria-label="Close leaderboard" onClick={()=>setLeaderboardOpen(false)}><X size={18}/></button></div>
          {leaderboardLoading?<p className="leaderboard-message">Gathering the latest scores…</p>:leaderboardError?<div className="leaderboard-empty"><p>{leaderboardError}</p><button className="leaderboard-retry" onClick={()=>void loadLeaderboard()}><RotateCcw size={13}/> Try again</button></div>:leaderboard.length?leaderboard.slice(0,10).map((entry,i)=>{const guest=Array.isArray(entry.guests)?entry.guests[0]:entry.guests;return <div className={`leader-row ${i===0?'leader-first':''}`} key={`${entry.created_at}-${i}`}><span className="leader-rank">{String(i+1).padStart(2,'0')}</span><b>{guest?.name||'Guest'}</b><em>{entry.score}</em></div>}):<div className="leaderboard-empty"><Trophy size={24}/><b>No scores yet</b><p>Be the first to send in a drawing!</p></div>}
          <p className="leader-note">Scores use each drawing’s similarity estimate.</p>
        </motion.aside>
      </motion.div>}
    </AnimatePresence>,document.body)}
    {createPortal(<AnimatePresence>
      {resultStage!=='closed'&&<motion.div className="drawing-result-backdrop" role="presentation" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
        <motion.section className="drawing-result-dialog" role="dialog" aria-modal="true" aria-labelledby="drawing-result-title" initial={{opacity:0,y:24,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12,scale:.98}}>
          <p className="eyebrow"><span/>YOUR LITTLE MASTERPIECE<span/></p>
          <h2 id="drawing-result-title">{resultStage==='compare'?'Look what you drew!':'Your drawing similarity'}</h2>
          {resultStage==='compare'&&<div className="comparison-pair">
            <figure><figcaption>The original</figcaption><img src={prompt.image} alt={`Original: ${prompt.alt}`}/></figure>
            <figure><figcaption>Your drawing</figcaption><img src={comparisonDrawing} alt="Your submitted drawing"/></figure>
          </div>}
          {resultStage==='score'?<div className="similarity-result"><strong>{similarityScore===null?'—':`${similarityScore}%`}</strong><p className={`submission-status submission-${submissionState}`} role="status">{submissionState==='saving'?'Saving your drawing and score…':submissionState==='saved'?'Your score was added to the leaderboard.':submissionState==='failed'?`It did not make it onto the leaderboard: ${submitError}`:cloudEnabled?'This drawing has not been submitted.':'This local drawing is not on the shared leaderboard. Open your personal invitation link to submit.'}</p><section className="result-leaderboard" aria-live="polite"><div className="result-leaderboard-heading"><Trophy size={17}/><h3>Leaderboard</h3></div>{leaderboardLoading?<p className="result-leaderboard-note">Refreshing scores…</p>:leaderboardError?<p className="result-leaderboard-note">{leaderboardError}</p>:leaderboard.length?leaderboard.slice(0,10).map((entry,index)=>{const guest=Array.isArray(entry.guests)?entry.guests[0]:entry.guests;return <div className={`result-leader-row ${index===0?'top-score':''}`} key={`${entry.created_at}-${index}`}><span>{String(index+1).padStart(2,'0')}</span><b>{guest?.name||'Guest'}</b><em>{entry.score}</em></div>}):<p className="result-leaderboard-note">No leaderboard scores are available yet.</p>}</section><div className="result-actions"><button className="secondary" onClick={startRound}>Draw again</button><button className="primary" onClick={onBack}>Back</button></div></div>:<button className="primary reveal-score" onClick={()=>setResultStage('score')}>Show my score <ArrowRight size={15}/></button>}
        </motion.section>
      </motion.div>}
    </AnimatePresence>,document.body)}
  </>;
}
function GridOverlay(){return <div className="grid-overlay" aria-hidden="true"><i/><i/><i/><i/></div>}
function Santa({name,rsvp,confirmed,answers,onRsvp,onSaveAnswers,onInvitation}:{name:string;rsvp:'yes'|'no'|null;confirmed:boolean;answers:QuestionnaireAnswers;onRsvp:(r:'yes'|'no')=>Promise<void>;onSaveAnswers:(answers:QuestionnaireAnswers)=>Promise<boolean>;onInvitation:()=>void}){
  const [draft,setDraft]=useState<QuestionnaireAnswers>(answers);
  const [saving,setSaving]=useState(false);
  const [submitMessage,setSubmitMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(saving)return;setSaving(true);setSubmitMessage('');
    try{
      const cleaned:Record<string,unknown>={};
      Object.entries(draft).forEach(([key,value])=>{if(typeof value==='string'){if(value.trim())cleaned[key]=value.trim();}else if(value!==undefined)cleaned[key]=value;});
      const parsed=questionnaireSchema.parse(cleaned);
      setDraft(parsed);setSubmitMessage(await onSaveAnswers(parsed)?'Your answers have been sent to Santa!':'We couldn’t save those just yet. Please try again.');
    }catch{setSubmitMessage('Please check your answers and try again.');}
    finally{setSaving(false);}
  }
  const numberQuestions=[
    {key:'weekday_job_hours',label:'How many hours do you spend actually doing your job?',step:'0.1'},
    {key:'unread_emails',label:'How many unread emails do you have?',step:'1'},
    {key:'unread_texts',label:'How many unread texts do you have?',step:'1'},
    {key:'allie_spiritual_age',label:'Allie’s turning 25 this year, but spiritually she is…',step:'1'},
  ] as const;
  return <div className="santa-page">
    <div className="santa-heading"><h1>Letters to Santa</h1></div>
    <section className="rsvp-panel" aria-labelledby="rsvp-heading">
      <div><p className="eyebrow">DEAR {name.toUpperCase()}</p><h2 id="rsvp-heading">Update your RSVP</h2><p className="rsvp-current">{rsvp?`Your current RSVP: ${rsvp==='yes'?`Yes, I can make it!`:'Maybe next year :('}`:'You haven’t replied yet — choose either whenever you’re ready.'}</p></div>
      <div className="rsvp-buttons"><button type="button" aria-pressed={rsvp==='yes'} className={`rsvp-choice yes ${rsvp==='yes'?'chosen':''}`} onClick={()=>void onRsvp('yes')}><span>🎄</span>{rsvp==='yes'?'✓ ':''}Yes, I can make it!</button><button type="button" aria-pressed={rsvp==='no'} className={`rsvp-choice no ${rsvp==='no'?'chosen':''}`} onClick={()=>void onRsvp('no')}><span>💌</span>{rsvp==='no'?'✓ ':''}Maybe next year :(</button></div>
      {rsvp&&<motion.p className="rsvp-status" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} role="status">{confirmed?'Your reply has been tucked safely in the post.':'Your RSVP is saved.'}</motion.p>}
      <button type="button" className="invitation-again" onClick={onInvitation}>See your invitation again</button>
    </section>
    <section className="questionnaire-intro"><p>Santa wants to know if you’ve been good this year… can you help him out by answering these questions?</p><p className="questionnaire-note">(Will be used for a fun trivia game! Even if you won’t be able to make it, feel free to fill these out:)</p><p className="questionnaire-aside">Yes, Santa has a lot of questions… fill out as few or as many as you’d like and submit as you go!</p></section>
    <form className="questionnaire-form" onSubmit={submit}>
      {questionnaireQuestions.map(({key,label})=><label className="question-field" key={key}><span>{label}</span><textarea rows={1} value={draft[key]??''} onChange={event=>setDraft(current=>({...current,[key]:event.target.value||undefined}))} maxLength={1000}/></label>)}
      {numberQuestions.map(({key,label,step})=><label className="question-field number-question" key={key}><span>{label}</span><input type="number" min="0" max={key==='unread_emails'||key==='unread_texts'?1000000:1000} step={step} value={draft[key]??''} onChange={event=>setDraft(current=>({...current,[key]:event.target.value===''?undefined:Number(event.target.value)}))}/></label>)}
      <fieldset className="question-field name-question"><legend>In your mind, do you call me Allie or Alexis?</legend><div className="name-options">{(['allie','alexis','depends'] as const).map(option=><button key={option} type="button" aria-pressed={draft.name_preference===option} className={draft.name_preference===option?'selected':''} onClick={()=>setDraft(current=>({...current,name_preference:option}))}>{option==='allie'?'Allie':option==='alexis'?'Alexis':'Depends'}</button>)}</div></fieldset>
      <div className="question-submit-row"><p role="status">{submitMessage}</p><button type="submit" className="primary question-submit" disabled={saving}>{saving?'Sending to Santa…':'Send your answers'}</button></div>
    </form>
  </div>;
}
