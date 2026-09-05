import { useMemo, useState } from 'react';

type Word = {
  word: string;
  emoji: string;
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
      { word: 'Dog', emoji: '🐶' },
      { word: 'Cat', emoji: '🐱' },
      { word: 'Bird', emoji: '🐦' },
      { word: 'Fish', emoji: '🐟' },
      { word: 'Lion', emoji: '🦁' },
      { word: 'Rabbit', emoji: '🐰' },
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
      { word: 'Apple', emoji: '🍎' },
      { word: 'Banana', emoji: '🍌' },
      { word: 'Milk', emoji: '🥛' },
      { word: 'Water', emoji: '💧' },
      { word: 'Bread', emoji: '🍞' },
      { word: 'Strawberry', emoji: '🍓' },
    ],
  },
  {
    key: 'play',
    label: 'Play',
    emoji: '🧸',
    words: [
      { word: 'Ball', emoji: '⚽' },
      { word: 'Car', emoji: '🚗' },
      { word: 'Book', emoji: '📘' },
      { word: 'Teddy', emoji: '🧸' },
      { word: 'Star', emoji: '⭐' },
      { word: 'Moon', emoji: '🌙' },
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

  const world = WORLDS.find((item) => item.key === worldKey) ?? null;
  const target = world ? world.words[targetIndex % world.words.length] : null;
  const options = useMemo(() => world && target ? sampleOptions(world.words, target) : [], [world, target, roundSeed]);

  function openWorld(key: string) {
    setWorldKey(key);
    setGameMode(false);
    setMessage('Tap anything to hear it!');
  }

  function startFindIt() {
    if (!world) return;
    const nextIndex = Math.floor(Math.random() * world.words.length);
    setTargetIndex(nextIndex);
    setRoundSeed((value) => value + 1);
    setGameMode(true);
    setMessage('');
    window.setTimeout(() => speak(`Where is the ${world.words[nextIndex].word}?`), 120);
  }

  function choose(item: Word) {
    if (!target) return;
    if (item.word === target.word) {
      setMessage('Yay! ⭐');
      speak(`Yes! ${target.word}!`);
      window.setTimeout(() => startFindIt(), 900);
    } else {
      setMessage(`That is ${item.word}. Try again!`);
      speak(`That is ${item.word}. Try again.`);
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
      <header className="little-english-head">
        <button type="button" onClick={() => world ? setWorldKey(null) : close()}>{world ? '← Worlds' : '← Back'}</button>
        <div><span>✨</span><strong>Manuzinha</strong><span>✨</span></div>
        <button type="button" className="little-exit" onClick={close}>{standalone ? 'Grown-ups' : 'Done'}</button>
      </header>

      {!world ? (
        <main className="little-english-home">
          <div className="little-hello">
            <span className="little-mascot">🐻</span>
            <div><h2>Come play, Manuzinha!</h2><p>Tap a world and listen to the words.</p></div>
          </div>
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
              <p className="little-instruction">Tap a picture. It will say the word!</p>
              <div className="little-word-grid">
                {world.words.map((item) => (
                  <button type="button" key={item.word} onClick={() => { setMessage(item.word); speak(item.word); }}>
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
                <strong>Where is the {target?.word}?</strong>
                <small>Tap to hear again</small>
              </button>
              <div className="little-choice-grid">
                {options.map((item) => (
                  <button type="button" key={item.word} onClick={() => choose(item)} aria-label={item.word}>
                    <span>{item.emoji}</span>
                  </button>
                ))}
              </div>
              <div className="little-message big" aria-live="polite">{message || 'Which one? 👀'}</div>
              <button className="little-back-to-words" type="button" onClick={() => { setGameMode(false); setMessage('Tap anything to hear it!'); }}>🎈 Just play</button>
            </>
          )}
        </main>
      )}
    </div>
  );
}
