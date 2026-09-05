import { useMemo, useState } from 'react';

type Word = {
  word: string;
  emoji: string;
  say?: string;
};

type World = {
  key: string;
  label: string;
  emoji: string;
  words: Word[];
};

const WORLDS: World[] = [
  {
    key: 'animals',
    label: 'Animals',
    emoji: '🐶',
    words: [
      { word: 'Dog', emoji: '🐶', say: 'Dog! Woof woof!' },
      { word: 'Cat', emoji: '🐱', say: 'Cat! Meow!' },
      { word: 'Bird', emoji: '🐦', say: 'Bird! Tweet tweet!' },
      { word: 'Fish', emoji: '🐟', say: 'Fish! Splash splash!' },
      { word: 'Lion', emoji: '🦁', say: 'Lion! Roar!' },
      { word: 'Rabbit', emoji: '🐰', say: 'Rabbit! Hop hop!' },
    ],
  },
  {
    key: 'colours',
    label: 'Colours',
    emoji: '🌈',
    words: [
      { word: 'Red', emoji: '🔴' },
      { word: 'Blue', emoji: '🔵' },
      { word: 'Green', emoji: '🟢' },
      { word: 'Yellow', emoji: '🟡' },
      { word: 'Purple', emoji: '🟣' },
      { word: 'Orange', emoji: '🟠' },
    ],
  },
  {
    key: 'food',
    label: 'Food',
    emoji: '🍎',
    words: [
      { word: 'Apple', emoji: '🍎', say: 'Apple! Yummy!' },
      { word: 'Banana', emoji: '🍌', say: 'Banana! Yummy!' },
      { word: 'Milk', emoji: '🥛' },
      { word: 'Water', emoji: '💧' },
      { word: 'Bread', emoji: '🍞' },
      { word: 'Strawberry', emoji: '🍓', say: 'Strawberry! Yummy!' },
    ],
  },
  {
    key: 'play',
    label: 'Play',
    emoji: '🧸',
    words: [
      { word: 'Ball', emoji: '⚽' },
      { word: 'Car', emoji: '🚗', say: 'Car! Beep beep!' },
      { word: 'Book', emoji: '📘' },
      { word: 'Teddy', emoji: '🧸' },
      { word: 'Star', emoji: '⭐' },
      { word: 'Moon', emoji: '🌙' },
    ],
  },
  {
    key: 'body',
    label: 'My Body',
    emoji: '👀',
    words: [
      { word: 'Eyes', emoji: '👀', say: 'Eyes! Blink blink!' },
      { word: 'Nose', emoji: '👃' },
      { word: 'Mouth', emoji: '👄' },
      { word: 'Ears', emoji: '👂', say: 'Ears! Listen!' },
      { word: 'Hands', emoji: '👐', say: 'Hands! Clap clap!' },
      { word: 'Feet', emoji: '🦶', say: 'Feet! Stomp stomp!' },
    ],
  },
  {
    key: 'move',
    label: 'Move!',
    emoji: '💃',
    words: [
      { word: 'Clap', emoji: '👏', say: 'Clap clap clap!' },
      { word: 'Jump', emoji: '🦘', say: 'Jump jump jump!' },
      { word: 'Wave', emoji: '👋', say: 'Wave! Hello!' },
      { word: 'Dance', emoji: '💃', say: 'Dance dance dance!' },
      { word: 'Spin', emoji: '🌀', say: 'Spin around!' },
      { word: 'Stomp', emoji: '👣', say: 'Stomp stomp stomp!' },
    ],
  },
];

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB';
  utterance.rate = 0.82;
  utterance.pitch = 1.08;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((voice) => voice.lang.toLowerCase().startsWith('en-gb'))
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en'));
  if (preferred) utterance.voice = preferred;
  window.speechSynthesis.speak(utterance);
}

function sampleOptions(words: Word[], target: Word): Word[] {
  const others = words.filter((item) => item.word !== target.word).sort(() => Math.random() - 0.5).slice(0, 2);
  return [target, ...others].sort(() => Math.random() - 0.5);
}

export function LittleEnglish({ standalone = false }: { standalone?: boolean }) {
  const [open, setOpen] = useState(standalone);
  const [worldKey, setWorldKey] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState(false);
  const [targetIndex, setTargetIndex] = useState(0);
  const [roundSeed, setRoundSeed] = useState(0);
  const [message, setMessage] = useState('');
  const [celebrating, setCelebrating] = useState(false);

  const world = WORLDS.find((item) => item.key === worldKey) ?? null;
  const target = world ? world.words[targetIndex % world.words.length] : null;
  const options = useMemo(() => world && target ? sampleOptions(world.words, target) : [], [world, target, roundSeed]);

  function openWorld(key: string) {
    setWorldKey(key);
    setGameMode(false);
    setCelebrating(false);
    setMessage('Tap anything to hear it!');
  }

  function playWord(item: Word) {
    setMessage(item.word);
    setCelebrating(false);
    speak(item.say ?? item.word);
  }

  function startFindIt() {
    if (!world) return;
    const nextIndex = Math.floor(Math.random() * world.words.length);
    setTargetIndex(nextIndex);
    setRoundSeed((value) => value + 1);
    setGameMode(true);
    setCelebrating(false);
    setMessage('');
    window.setTimeout(() => speak(`Where is the ${world.words[nextIndex].word}?`), 120);
  }

  function choose(item: Word) {
    if (!target) return;
    if (item.word === target.word) {
      setMessage('Yay! ⭐');
      setCelebrating(true);
      speak(`Yes! ${target.word}!`);
      window.setTimeout(() => {
        setCelebrating(false);
        startFindIt();
      }, 1050);
    } else {
      setMessage(`${item.emoji} ${item.word}`);
      setCelebrating(false);
      speak(`${item.word}. Try another one!`);
    }
  }

  function close() {
    window.speechSynthesis?.cancel();
    if (standalone) {
      window.location.assign(`${window.location.origin}${window.location.pathname}`);
      return;
    }
    setOpen(false);
    setWorldKey(null);
    setGameMode(false);
    setMessage('');
  }

  if (!open) {
    return (
      <button className="little-english-launcher" type="button" onClick={() => setOpen(true)} aria-label="Open Manuzinha">
        <span>⭐</span>
        <strong>Manuzinha</strong>
      </button>
    );
  }

  return (
    <div className="little-english-overlay" role="dialog" aria-modal="true" aria-label="Manuzinha">
      <div className="little-english-sky" aria-hidden="true"><span>☁️</span><span>⭐</span><span>☁️</span></div>
      <div className="little-floaters" aria-hidden="true"><span>✨</span><span>🫧</span><span>⭐</span><span>🫧</span><span>✨</span></div>
      {celebrating ? <div className="little-celebration" aria-hidden="true"><span>⭐</span><span>🎉</span><span>✨</span><span>🌟</span><span>🎈</span></div> : null}

      <header className="little-english-head">
        <button type="button" onClick={() => world ? setWorldKey(null) : close()}>{world ? '← Worlds' : '← Back'}</button>
        <div><span>✨</span><strong>Manuzinha</strong><span>✨</span></div>
        <button type="button" className="little-exit" onClick={close}>{standalone ? 'Grown-ups' : 'Done'}</button>
      </header>

      {!world ? (
        <main className="little-english-home">
          <button className="little-hello" type="button" onClick={() => speak(`Hi Manuzinha! Let's play!`)} aria-label="Say hello to Manuzinha">
            <span className="little-mascot">🐻</span>
            <div><h2>Hi, Manuzinha! 👋</h2><p>Tap the bear or pick something fun.</p></div>
            <span className="little-speaker">🔊</span>
          </button>
          <div className="little-world-grid">
            {WORLDS.map((item) => (
              <button type="button" key={item.key} onClick={() => openWorld(item.key)}>
                <span>{item.emoji}</span>
                <strong>{item.label}</strong>
              </button>
            ))}
          </div>
          <button className="little-surprise" type="button" onClick={() => openWorld(WORLDS[Math.floor(Math.random() * WORLDS.length)].key)}>🎁 Surprise me!</button>
        </main>
      ) : (
        <main className="little-english-play">
          <div className="little-world-title"><span>{world.emoji}</span><h2>{world.label}</h2></div>

          {!gameMode ? (
            <>
              <p className="little-instruction">Tap a picture ✨</p>
              <div className="little-word-grid">
                {world.words.map((item) => (
                  <button type="button" key={item.word} onClick={() => playWord(item)}>
                    <span>{item.emoji}</span>
                    <strong>{item.word}</strong>
                  </button>
                ))}
              </div>
              <div className="little-message" aria-live="polite">{message}</div>
              <button className="little-find" type="button" onClick={startFindIt}>🔎 Find it!</button>
            </>
          ) : (
            <>
              <button className="little-question" type="button" onClick={() => target && speak(`Where is the ${target.word}?`)}>
                <span>🔊</span>
                <strong>Listen again</strong>
                <small>Where is the {target?.word}?</small>
              </button>
              <div className="little-choice-grid">
                {options.map((item) => (
                  <button type="button" key={item.word} onClick={() => choose(item)} aria-label={item.word}>
                    <span>{item.emoji}</span>
                  </button>
                ))}
              </div>
              <div className={`little-message big ${celebrating ? 'celebrating' : ''}`} aria-live="polite">{message || 'Which one? 👀'}</div>
              <button className="little-back-to-words" type="button" onClick={() => { setGameMode(false); setCelebrating(false); setMessage('Tap anything to hear it!'); }}>🎈 Just play</button>
            </>
          )}
        </main>
      )}
    </div>
  );
}
