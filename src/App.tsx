import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Music2, VolumeX, Gift, Sparkles } from 'lucide-react';
import { assets } from './data/assets';

type Page = 'letter' | 'hub';
const guestName = new URLSearchParams(location.search).get('guest')?.trim() || 'friend';

export function App() {
  const [page, setPage] = useState<Page>('letter');
  const [opened, setOpened] = useState(false);
  const [sound, setSound] = useState(false);
  return <main className="scene">
    <div className="grain" aria-hidden="true" />
    <div className="snowline" aria-hidden="true">✦　❄　✧　❄　✶　❄　✦　❄　✧</div>
    <header className="topbar"><a className="brand" href="#home" onClick={e => {e.preventDefault(); setPage('letter'); setOpened(false)}}><span className="brand-mark">✿</span> A LITTLE HOLIDAY THING</a><button className="sound" onClick={() => setSound(!sound)} aria-label={sound ? 'Turn sound off' : 'Turn sound on'}>{sound ? <Music2 size={16}/> : <VolumeX size={16}/>} <span>{sound ? 'Sound on' : 'Sound off'}</span></button></header>
    <AnimatePresence mode="wait">
      {page === 'letter' ? <motion.section key="letter" className="letter-page" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:.45}}>
        <div className="eyebrow"><span/> A NOTE FOR YOU <span/></div>
        {!opened ? <motion.button className="envelope" onClick={() => setOpened(true)} whileHover={{y:-5,rotate:-1}} whileTap={{scale:.97}} aria-label="Open your invitation">
          <span className="envelope-spark">✦</span><span className="envelope-flap"/><span className="seal">{assets.envelope}</span><span className="envelope-label">for {guestName}</span><span className="open-note">TAP TO OPEN</span>
        </motion.button> : <motion.article className="letter-card" initial={{rotateX:-25,opacity:0,y:22}} animate={{rotateX:0,opacity:1,y:0}} transition={{duration:.65}}>
          <span className="corner corner-a">❧</span><span className="corner corner-b">❧</span><p className="script">Dear {guestName},</p><h1>You’re invited<br/>to a <em>very merry</em><br/>birthday!</h1><p className="copy">We’re celebrating another trip around the sun<br/>with a little Christmas magic. Come join us!</p><div className="details"><span>DECEMBER 20</span><i>✦</i><span>2—5 PM</span><i>✦</i><span>THE COZY CABIN</span></div><button className="primary" onClick={() => setPage('hub')}>Come on in <ArrowRight size={16}/></button><p className="signoff">With love &amp; tinsel, <b>your party host</b></p>
        </motion.article>}
        {!opened && <p className="tap-hint">A little something has your name on it</p>}
      </motion.section> : <motion.section key="hub" className="hub-page" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:.45}}>
        <div className="hub-heading"><p className="eyebrow"><span/> YOUR LITTLE HOLIDAY WORLD <span/></p><h1>Make yourself<br/><em>at home, {guestName}.</em></h1><p>Pick a little adventure to get started.</p></div>
        <div className="cards">
          <HubCard icon={assets.dressUp} n="01" title="Dress up" subtitle="Make a festive friend" color="pink"/>
          <HubCard icon={assets.drawing} n="02" title="Draw & play" subtitle="A tiny art challenge" color="green"/>
          <HubCard icon={assets.letters} n="03" title="Letters to Santa" subtitle="Save your seat" color="blue"/>
        </div>
        <button className="back-link" onClick={() => {setPage('letter');setOpened(true)}}><ArrowLeft size={15}/> Back to your invitation</button>
      </motion.section>}
    </AnimatePresence>
    <footer><span>MADE WITH A LITTLE CHRISTMAS MAGIC</span><span>❄</span><span>DECEMBER · 2025</span></footer>
    <div className="side-stamp"><Gift size={14}/> YOU’RE INVITED</div>
  </main>;
}

function HubCard({icon,n,title,subtitle,color}:{icon:string;n:string;title:string;subtitle:string;color:string}) {
 return <motion.button className={`hub-card ${color}`} whileHover={{y:-7,rotate:-1}} whileTap={{scale:.97}}>
   <span className="card-number">{n}</span><span className="art-blob"><span className="art-icon">{icon}</span><Sparkles className="sparkle" size={18}/></span><span className="card-title">{title}</span><span className="card-subtitle">{subtitle}</span><span className="card-arrow"><ArrowRight size={16}/></span>
 </motion.button>
}
