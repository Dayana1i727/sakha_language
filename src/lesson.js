/* =====================================================================
   Уроки, адаптация по возрасту, прогресс, достижения, словарь
   ===================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var App = window.App || {};
  var KEY = 'sakha-state-v2';
  var todayStr = function () { return new Date().toISOString().slice(0, 10); };
  var shuffle = function (a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
  var norm = function (s) { return String(s).toLowerCase().replace(/[.,;:!?«»"']/g, '').replace(/\s+/g, ' ').trim(); };
  // с большой буквы (для колонки переводов в «Соотносить»)
  var cap = function (s) {
    s = String(s || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  /* ------------------------- звуковые отклики (WebAudio) ------------------------- */
  var AC = null;
  function ac() {
    if (AC) { if (AC.state === 'suspended') { try { AC.resume(); } catch (e) {} } return AC; }
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
    return AC;
  }
  function soundsOn() { return S.sound !== false; }
  function tone(freq, start, dur, opts) {
    var a = ac(); if (!a) return;
    opts = opts || {};
    var t = a.currentTime + start;
    var o = a.createOscillator(), g = a.createGain();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t + dur);
    var peak = opts.vol == null ? 0.16 : opts.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.03);
  }
  // «колокольчик»: основной тон + мягкая октава сверху
  function bell(freq, start, dur, vol) {
    tone(freq, start, dur, { type: 'sine', vol: vol });
    tone(freq * 2, start, dur * 0.7, { type: 'sine', vol: (vol || 0.14) * 0.35 });
  }
  function sfx(kind) {
    if (!soundsOn()) return;
    if (kind === 'tap') {            // лёгкий щелчок-капля
      tone(720, 0, 0.09, { type: 'sine', vol: 0.05, slide: 900 });
    } else if (kind === 'ok') {      // восходящая терция — «получилось!»
      bell(880, 0, 0.30, 0.16);
      bell(1318.5, 0.055, 0.34, 0.12);
    } else if (kind === 'bad') {     // мягкий нисходящий, без резкости
      tone(392, 0, 0.20, { type: 'sine', vol: 0.10 });
      tone(311, 0.10, 0.26, { type: 'sine', vol: 0.085, slide: 280 });
    } else if (kind === 'win') {     // мажорное арпеджио на финиш урока
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { bell(f, i * 0.10, 0.42, 0.14); });
      bell(1046.5, 0.46, 0.75, 0.11);
    } else if (kind === 'ach') {     // «искорки» достижения
      [1568, 2093, 2637].forEach(function (f, i) { tone(f, i * 0.07, 0.22, { type: 'sine', vol: 0.075 }); });
      bell(1046.5, 0.22, 0.5, 0.1);
    }
  }

  /* ------------------------- уровни по возрасту ------------------------- */
  var GROUPS = {
    kid:   { key: 'kid',   label: '6–9 лет',           name: 'Юный исследователь', tasks: 3, options: 3, pairs: 3, build: 'letters', hint: true  },
    teen:  { key: 'teen',  label: '10–14 лет',         name: 'Школьник',           tasks: 4, options: 4, pairs: 4, build: 'letters', hint: true  },
    adult: { key: 'adult', label: '15 лет и старше',   name: 'Взрослый ученик',    tasks: 5, options: 4, pairs: 5, build: 'words',   hint: false }
  };

  /* ------------------------- контент уроков ------------------------- */
  var CONTENT = {
    1: {
      title: 'Знакомства',
      sub: 'Приветствия, имя, «рад познакомиться»',
      words: [
        { y: 'Дорообо',                ru: 'привет' },
        { y: 'Үтүө күн',               ru: 'добрый день' },
        { y: 'Аат',                    ru: 'имя' },
        { y: 'Мин',                    ru: 'я' },
        { y: 'Эн',                     ru: 'ты' },
        { y: 'Үөрүстүм',               ru: 'рад познакомиться' },
        { y: 'Баһыыба',                ru: 'спасибо' },
        { y: 'Көрсүһүөххэ диэри',      ru: 'до свидания' }
      ],
      build: {
        letters: [
          { prompt: 'Привет!', hint: 'Начинается на «Д», 7 букв', answer: 'Дорообо' },
          { prompt: 'Спасибо', hint: 'Начинается на «Б», 7 букв', answer: 'Баһыыба' }
        ],
        words: [
          { prompt: 'Меня зовут Айсен', answer: 'Мин аатым Айсен', chips: ['Мин', 'аатым', 'Айсен', 'эн', 'аат'] },
          { prompt: 'До свидания!', answer: 'Көрсүһүөххэ диэри', chips: ['Көрсүһүөххэ', 'диэри', 'Дорообо', 'күн'] }
        ]
      }
    },
    2: {
      title: 'Бытовые фразы',
      sub: 'Хорошо, плохо, спасибо, извините — на каждый день',
      words: [
        { y: 'Үчүгэй',              ru: 'хорошо' },
        { y: 'Куһаҕан',             ru: 'плохо' },
        { y: 'Көрдөһөбүн',          ru: 'пожалуйста' },
        { y: 'Бырастыы гыныҥ',      ru: 'извините' },
        { y: 'Хас?',                ru: 'сколько?' },
        { y: 'Бу',                  ru: 'это' },
        { y: 'Уу',                  ru: 'вода' },
        { y: 'Дьиэ',                ru: 'дом' }
      ],
      build: {
        letters: [
          { prompt: 'Хорошо', hint: 'Начинается на «Ү», 6 букв', answer: 'Үчүгэй' },
          { prompt: 'Дом', hint: 'Начинается на «Д», 4 буквы', answer: 'Дьиэ' }
        ],
        words: [
          { prompt: 'Это вода', answer: 'Бу уу', chips: ['Бу', 'уу', 'дьиэ', 'ас'] },
          { prompt: 'Извините', answer: 'Бырастыы гыныҥ', chips: ['Бырастыы', 'гыныҥ', 'баһыыба', 'көрдөһөбүн'] }
        ]
      }
    },
    3: {
      title: 'Мини-диалоги',
      sub: 'Готовые фразы для разговора при встрече',
      words: [
        { y: 'Дорообо!',                ru: 'привет!' },
        { y: 'Аатыҥ кимий?',            ru: 'как тебя зовут?' },
        { y: 'Мин аатым Айсен',         ru: 'меня зовут Айсен' },
        { y: 'Хайдах олороҕут?',        ru: 'как поживаете?' },
        { y: 'Үчүгэй, баһыыба',        ru: 'хорошо, спасибо' },
        { y: 'Көрсүһүөххэ диэри!',      ru: 'до свидания!' },
        { y: 'Үөрүстүм!',               ru: 'рад познакомиться!' }
      ],
      build: {
        letters: [
          { prompt: 'Привет!', hint: 'Начинается на «Д», 7 букв', answer: 'Дорообо' },
          { prompt: 'Спасибо', hint: 'Начинается на «Б», 7 букв', answer: 'Баһыыба' }
        ],
        words: [
          { prompt: 'Как тебя зовут?', answer: 'Аатыҥ кимий', chips: ['Аатыҥ', 'кимий', 'олороҕут', 'Хайдах'] },
          { prompt: 'Хорошо, спасибо', answer: 'Үчүгэй, баһыыба', chips: ['Үчүгэй,', 'баһыыба', 'куһаҕан', 'дорообо'] }
        ]
      }
    }
  };

  /* ------------------------- урок 4: предложения ------------------------- */
  CONTENT[4] = {
    title: 'Предложения',
    sub: 'Собираем первые фразы: кто, что делает, куда идёт',
    words: [
      { y: 'саха тыла',   ru: 'якутский язык' },
      { y: 'үөрэтэбин', ru: 'я изучаю' },
      { y: 'дьиэҕэ',      ru: 'к дому, в дом' },
      { y: 'барабын',     ru: 'я иду' },
      { y: 'үлэлиир',     ru: 'работает' },
      { y: 'күн',         ru: 'день, солнце' },
      { y: 'биһиги',      ru: 'мы' },
      { y: 'саҥарабыз',   ru: 'мы говорим' }
    ],
    build: {
      words: [
        { prompt: 'Я изучаю якутский язык', answer: 'Мин саха тылын үөрэтэбин',
          chips: ['Мин', 'саха', 'тылын', 'үөрэтэбин', 'дьиэҕэ', 'барабын'],
          hint: 'Начни с «Мин» — «я»' },
        { prompt: 'Это книга', answer: 'Бу кинигэ',
          chips: ['Бу', 'кинигэ', 'күн', 'үлэлиир'],
          hint: '«Бу» — это' },
        { prompt: 'Мы говорим по-якутски', answer: 'Биһиги сахалыы саҥарабыз',
          chips: ['Биһиги', 'сахалыы', 'саҥарабыз', 'үөрэтэбит'],
          hint: 'Начни с «Биһиги» — «мы»' }
      ],
      letters: []
    },
    sentences: [
      { y: 'Мин саха тылын үөрэтэбин', ru: 'Я изучаю якутский язык' },
      { y: 'Бу кинигэ',               ru: 'Это книга' },
      { y: 'Биһиги сахалыы саҥарабыз', ru: 'Мы говорим по-якутски' }
    ]
  };

  /* ------------------------- урок 5: заверши диалог ------------------------- */
  CONTENT[5] = {
    title: 'Заверши диалог',
    sub: 'Слушаешь реплику — и отвечаешь по смыслу',
    words: [
      { y: 'сөп',      ru: 'ладно, хорошо' },
      { y: 'кырдьык',  ru: 'верно, правда' },
      { y: 'бүгүн',    ru: 'сегодня' },
      { y: 'сарсын',   ru: 'завтра' },
      { y: 'билигин',  ru: 'сейчас' },
      { y: 'кэлин',    ru: 'потом' },
      { y: 'эмиэ',     ru: 'тоже, снова' },
      { y: 'аны',      ru: 'теперь' }
    ],
    build: { words: [], letters: [] },
    dialogues: [
      {
        lines: [ { who: 'b', y: 'Дорообо!', ru: 'Привет!' } ],
        question: 'Как поздороваешься в ответ?',
        options: [
          { y: 'Дорообо!', ru: 'Привет!' },
          { y: 'Сарсын', ru: 'Завтра' },
          { y: 'Кырдьык', ru: 'Верно' }
        ],
        answer: 0
      },
      {
        lines: [ { who: 'b', y: 'Аатыҥ кимий?', ru: 'Как тебя зовут?' } ],
        question: 'Что ответишь?',
        options: [
          { y: 'Бүгүн', ru: 'Сегодня' },
          { y: 'Мин аатым Айсен', ru: 'Меня зовут Айсен' },
          { y: 'Кэлин', ru: 'Потом' }
        ],
        answer: 1
      },
      {
        lines: [ { who: 'b', y: 'Хайдах олороҕут?', ru: 'Как поживаете?' } ],
        question: 'Как вежливо ответить?',
        options: [
          { y: 'Үчүгэй, баһыыба', ru: 'Хорошо, спасибо' },
          { y: 'Билигин', ru: 'Сейчас' },
          { y: 'Аатыҥ кимий?', ru: 'Как тебя зовут?' }
        ],
        answer: 0
      },
      {
        lines: [
          { who: 'b', y: 'Сөп, мин барабын.', ru: 'Ладно, я пойду.' },
          { who: 'b', y: 'Көрсүһүөххэ диэри!', ru: 'До свидания!' }
        ],
        question: 'Чем попрощаешься?',
        options: [
          { y: 'Эмиэ', ru: 'Тоже' },
          { y: 'Көрсүһүөххэ диэри!', ru: 'До свидания!' },
          { y: 'Аны', ru: 'Теперь' }
        ],
        answer: 1
      }
    ]
  };

  /* ------------------------- урок 6: еда и традиции ------------------------- */
  CONTENT[6] = {
    title: 'Еда и традиции',
    sub: 'Ас, кымыс и праздник ыһыах',
    words: [
      { y: 'Ас',      ru: 'еда, пища' },
      { y: 'Эт',      ru: 'мясо' },
      { y: 'Балык',   ru: 'рыба' },
      { y: 'Үүт',     ru: 'молоко' },
      { y: 'Чэй',     ru: 'чай' },
      { y: 'Кымыс',   ru: 'кумыс' },
      { y: 'Саламат', ru: 'саламат, каша на сметане' },
      { y: 'Ыһыах',   ru: 'ысыах, праздник лета' }
    ],
    build: {
      letters: [
        { prompt: 'Рыба', hint: 'Начинается на «Б», 5 букв', answer: 'Балык' },
        { prompt: 'Чай', hint: 'Начинается на «Ч», 3 буквы', answer: 'Чэй' }
      ],
      words: [
        { prompt: 'Я пью чай', answer: 'Мин чэй иһэбин',
          chips: ['Мин', 'чэй', 'иһэбин', 'балык', 'үүт'],
          hint: 'Начни с «Мин» — «я»' },
        { prompt: 'Это мясо', answer: 'Бу эт',
          chips: ['Бу', 'эт', 'ас', 'балык'],
          hint: '«Бу» — это' },
        { prompt: 'Молоко вкусное', answer: 'Үүт амтаннаах',
          chips: ['Үүт', 'амтаннаах', 'куһаҕан', 'чэй'],
          hint: '«амтаннаах» — вкусный' }
      ]
    },
    sentences: [
      { y: 'Мин чэй иһэбин', ru: 'Я пью чай' },
      { y: 'Бу эт',          ru: 'Это мясо' },
      { y: 'Үүт амтаннаах',  ru: 'Молоко вкусное' }
    ],
    dialogues: [
      {
        lines: [ { who: 'b', y: 'Аһааҥ, көрдөһөбүн.', ru: 'Кушайте, пожалуйста.' } ],
        question: 'Что ответишь хозяину?',
        options: [
          { y: 'Баһыыба!', ru: 'Спасибо!' },
          { y: 'Көрсүһүөххэ диэри!', ru: 'До свидания!' },
          { y: 'Куһаҕан.', ru: 'Плохо.' }
        ],
        answer: 0
      },
      {
        lines: [ { who: 'b', y: 'Бу туох?', ru: 'Что это?' } ],
        question: 'Перед тобой рыба. Как скажешь?',
        options: [
          { y: 'Бу үүт.', ru: 'Это молоко.' },
          { y: 'Бу балык.', ru: 'Это рыба.' },
          { y: 'Мин барабын.', ru: 'Я иду.' }
        ],
        answer: 1
      },
      {
        lines: [ { who: 'b', y: 'Чэй иһиҥ, көрдөһөбүн.', ru: 'Выпейте чаю, пожалуйста.' } ],
        question: 'Как вежливо согласиться?',
        options: [
          { y: 'Баһыыба, иһэбин.', ru: 'Спасибо, выпью.' },
          { y: 'Бу ыһыах.', ru: 'Это ысыах.' },
          { y: 'Куһаҕан.', ru: 'Плохо.' }
        ],
        answer: 0
      },
      {
        lines: [ { who: 'b', y: 'Ыһыахха кэлиэҥ дуо?', ru: 'Придёшь на ысыах?' } ],
        question: 'Ответь, что придёшь.',
        options: [
          { y: 'Кэлиэм!', ru: 'Приду!' },
          { y: 'Балык.', ru: 'Рыба.' },
          { y: 'Бүгүн.', ru: 'Сегодня.' }
        ],
        answer: 0
      }
    ]
  };

  var STAGES = [
    { n: 1, title: 'Выбирать',       hint: 'Выбери правильный перевод' },
    { n: 2, title: 'Соотносить',     hint: 'Соедини слово и перевод' },
    { n: 3, title: 'Конструировать', hint: 'Собери слово или фразу' },
    { n: 4, title: 'Проверка себя',  hint: 'Отметь, что уже знаешь' }
  ];

  /* ------------------------- состояние ------------------------- */
  function freshState() {
    return { age: null, group: null, ageLabel: null, xp: 0, xpToday: 0, day: todayStr(), days: [todayStr()], streak: 0,
             completed: {}, known: {}, stageStats: {}, xpByDay: {}, fav: {}, voiceRate: 0.9, voiceURI: '', ttsLang: 'auto', sound: true };
  }
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || freshState(); } catch (e) { S = freshState(); }
  if (!S.days || !S.days.length) S.days = [todayStr()];
  if (!S.completed) S.completed = {};
  if (!S.known) S.known = {};
  if (!S.stageStats) S.stageStats = {};
  if (!S.xpByDay) S.xpByDay = {};
  if (!S.fav) S.fav = {};
  if (S.day !== todayStr()) { S.day = todayStr(); S.xpToday = 0; }
  if (S.days.indexOf(todayStr()) === -1) S.days.push(todayStr());
  S.streak = calcStreak(S.days);

  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function calcStreak(days) {
    var set = {}, i;
    for (i = 0; i < days.length; i++) set[days[i]] = 1;
    var n = 0, d = new Date();
    if (!set[iso(d)]) d.setDate(d.getDate() - 1); // streak можно продолжить до вчера
    while (set[iso(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function iso(d) {
    var m = ('0' + (d.getMonth() + 1)).slice(-2), dd = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + m + '-' + dd;
  }
  function group() { return GROUPS[S.group] || GROUPS.teen; }
  function doneCount() { return Object.keys(S.completed).length; }
  function avgScore() {
    var k = Object.keys(S.completed); if (!k.length) return 0;
    var sum = 0; k.forEach(function (id) { sum += S.completed[id]; });
    return Math.round(sum / k.length);
  }
  function lessonTotal() { return Object.keys(CONTENT).length; }
  function coursePercent() { return Math.round(doneCount() / lessonTotal() * 100); }
  function stagePercent(i) {
    var st = S.stageStats[i] || { c: 0, t: 0 };
    return st.t ? Math.round(st.c / st.t * 100) : 0;
  }
  function allLessonIds() {
    return Object.keys(CONTENT).map(Number).sort(function (a, b) { return a - b; });
  }
  function firstUndone() {
    var ids = allLessonIds();
    for (var i = 0; i < ids.length; i++) if (!S.completed[ids[i]]) return ids[i];
    return ids[0] || 1;
  }

  /* ------------------------- достижения ------------------------- */
  var ACHS = [
    { id: 'first',  title: 'Первые уроки',      desc: 'Пройди первый урок',            icon: 'i-book',      fill: false, back: '#e6eefc', color: '#4a6bb5',
      cond: function () { return doneCount() >= 1; }, prog: function () { return doneCount() + '/1'; } },
    { id: 'week',   title: 'Неделя обучения',   desc: 'Занимайся 7 дней',              icon: 'i-star-fill', fill: true,  back: '#fdf3e2', color: '#f0a93c',
      cond: function () { return S.days.length >= 7; }, prog: function () { return S.days.length + '/7 дней'; } },
    { id: 'streak', title: '5 дней подряд',     desc: 'Серия из 5 дней',               icon: 'i-flame',     fill: true,  back: '#fdeceb', color: '#ef7a4b',
      cond: function () { return S.streak >= 5; }, prog: function () { return S.streak + '/5'; } },
    { id: 'level',  title: 'Первый уровень',    desc: 'Пройди все уроки',          icon: 'i-crown',     fill: false, back: '#fdf7e3', color: '#e0ab2c',
      cond: function () { return doneCount() >= lessonTotal(); }, prog: function () { return doneCount() + '/' + lessonTotal(); } },
    { id: 'nature', title: 'Точность',          desc: 'Пройди урок без ошибок',        icon: 'i-leaf',      fill: false, back: '#edf6ef', color: '#5aa87a',
      cond: function () { return avgScore() === 100; }, prog: function () { return avgScore() + '%'; } },
    { id: 'listen', title: 'Слухач',            desc: 'Отметь 10 слов как «знаю»',     icon: 'i-headphones',fill: false, back: '#eef1fb', color: '#7986c4',
      cond: function () { return knownCount() >= 10; }, prog: function () { return knownCount() + '/10'; } },
    { id: 'dialog', title: 'Собеседник',        desc: 'Заверши урок «Мини-диалоги»',   icon: 'i-globe',     fill: false, back: '#eaf4fb', color: '#4f92b8',
      cond: function () { return !!S.completed[3]; }, prog: function () { return (S.completed[3] ? '1' : '0') + '/1'; } },
    { id: 'vocab',  title: 'Словарный запас',   desc: 'Отметь 24 слова как «знаю»',    icon: 'i-gem',       fill: false, back: '#f3eefb', color: '#8a6bc4',
      cond: function () { return knownCount() >= 24; }, prog: function () { return knownCount() + '/24'; } }
  ];
  function knownCount() {
    var n = 0; Object.keys(S.known).forEach(function (k) { if (S.known[k] === 'know') n++; });
    return n;
  }
  function unlockedIds() {
    return ACHS.filter(function (a) { return a.cond(); }).map(function (a) { return a.id; });
  }

  /* ------------------------- отрисовка прогресса ------------------------- */
  function authTint(a) {
    return 'background:' + a.back + ';color:' + a.color;
  }
  function svgIcon(a, size) {
    var st = a.fill
      ? 'fill:currentColor;stroke:none'
      : 'fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round';
    return '<svg style="width:' + (size || 27) + 'px;height:' + (size || 27) + 'px;' + st + '"><use href="#' + a.icon + '"/></svg>';
  }

  function renderHome() {
    var pct = coursePercent();
    var bar = $('#homeDonut');
    if (bar) { bar.setAttribute('data-value', pct); }
    var pctEl = $('#homePct'); if (pctEl) pctEl.textContent = pct + '%';
    var lvl = $('#homeLevel'); if (lvl) lvl.textContent = doneCount() === 0 ? 'Старт' : 'Уровень ' + Math.min(3, doneCount() + 1);
    var st = $('#homeStreak'); if (st) st.innerHTML = '<b>' + S.streak + ' ' + plural(S.streak, 'день', 'дня', 'дней') + '</b> подряд';
    var pts = $('#homePoints'); if (pts) pts.innerHTML = '<b>+' + S.xpToday + ' очков</b><br>за сегодня!';
    var xpTop = $('#xpTop'); if (xpTop) xpTop.textContent = S.xp;
    var pl = $('#progLevel'); if (pl) pl.textContent = doneCount() === 0 ? 'Старт' : 'Уровень ' + Math.min(3, doneCount() + 1);

    // плитки достижений на главной
    $$('[data-ach]').forEach(function (tile) {
      var a = ACHS.filter(function (x) { return x.id === tile.dataset.ach; })[0];
      if (!a) return;
      tile.classList.toggle('locked', !a.cond());
      tile.title = a.desc + ' · ' + a.prog();
    });

    var hero = $('#heroStart');
    if (hero) {
      var label = doneCount() === 0 ? 'Начать обучение' : (doneCount() >= lessonTotal() ? 'Повторить уроки' : 'Продолжить обучение');
      hero.innerHTML = label + ' <svg><use href="#i-arrow"/></svg>';
    }

    if (App.animateDonuts) App.animateDonuts();
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function renderAchievements() {
    var grid = $('#achGrid'); if (!grid) return;
    var list = ACHS.slice().sort(function (a, b) { return (a.cond() ? 0 : 1) - (b.cond() ? 0 : 1); });
    grid.innerHTML = list.map(function (a) {
      var open = a.cond();
      return '<div class="badge-tile' + (open ? '' : ' locked') + '" title="' + esc(a.desc) + '">' +
        '<div class="ico" style="' + authTint(a) + '">' + svgIcon(a) + '</div>' +
        '<b>' + a.title + '</b><small>' + (open ? 'Открыто' : a.prog() + ' · ' + a.desc) + '</small></div>';
    }).join('');
    var sub = $('#achSub');
    if (sub) sub.textContent = unlockedIds().length + ' из ' + ACHS.length + ' открыто';
  }

  function renderLessonCards() {
    $$('[data-lesson]').forEach(function (card) {
      var id = card.dataset.lesson, done = S.completed[id] || 0;
      var bar = $('.pbar i', card);
      if (bar) bar.style.width = done + '%';
      var mark = $('[data-mark]', card);
      if (mark) mark.textContent = done === 100 ? 'Пройден' : (done ? done + '%' : 'Не начат');
      card.classList.toggle('is-done', done > 0);
      var chip = $('.chip', card);
      if (chip && done === 100) chip.textContent = 'Урок ' + id + ' · ✓';
    });
  }

  function renderProgressPage() {
    var bar = $('#progDonut'); if (bar) bar.setAttribute('data-value', coursePercent());
    var pct = $('#progPct'); if (pct) pct.textContent = coursePercent() + '%';
    var txt = $('#progText'); if (txt) txt.textContent = 'Пройдено ' + doneCount() + ' из ' + lessonTotal() + ' уроков · точность ' + avgScore() + '%';
    var st = $('#progStreak'); if (st) st.innerHTML = S.streak + ' <svg class="flame"><use href="#i-flame"/></svg>';
    var pts = $('#progPoints'); if (pts) pts.textContent = '+' + S.xpToday;
    var badge = $('#progXp'); if (badge) badge.innerHTML = '<svg class="badge-ico"><use href="#i-star-fill"/></svg>' + S.xp + ' очков всего';

    var strip = $('#weekStrip');
    if (strip) {
      var names = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'], html = '';
      var d = new Date(); d.setDate(d.getDate() - 6);
      for (var i = 0; i < 7; i++) {
        var key = iso(d), active = S.days.indexOf(key) > -1, isToday = key === todayStr();
        html += '<div class="day ' + (isToday ? 'today' : (active ? 'done' : '')) + '">' + names[d.getDay()] + '</div>';
        d.setDate(d.getDate() + 1);
      }
      strip.innerHTML = html;
    }

    var skills = $('#skillList');
    if (skills) {
      var stageNames = ['Выбирать', 'Соотносить', 'Конструировать', 'Проверка себя'];
      var rows = stageNames.map(function (n, i) { return [n, stagePercent(i)]; });
      rows.push(['Словарный запас', Math.min(100, Math.round(knownCount() / 23 * 100))]);
      skills.innerHTML = rows.map(function (r) {
        return '<div class="skill"><b>' + r[0] + '</b><div class="pbar"><i style="width:' + r[1] + '%"></i></div><i>' + r[1] + '%</i></div>';
      }).join('');
    }

    var bars = $('#weekBars');
    if (bars) {
      var names = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      var d2 = new Date(); d2.setDate(d2.getDate() - 6);
      var vals = [], max = 1;
      for (var j = 0; j < 7; j++) {
        var k2 = iso(d2), v2 = (S.xpByDay[k2] || 0);
        vals.push([names[d2.getDay()], v2]);
        if (v2 > max) max = v2;
        d2.setDate(d2.getDate() + 1);
      }
      bars.innerHTML = vals.map(function (p) {
        var h = p[1] ? Math.max(12, Math.round(p[1] / max * 100)) : 6;
        return '<div class="' + (p[1] ? 'on' : '') + '" style="height:' + h + '%"><span>' + p[0] + '</span></div>';
      }).join('');
    }
    if (App.animateDonuts) App.animateDonuts();
  }

  /* ------------------------- словарь ------------------------- */
  var wordTab = 'all';
  function wordImg(w) {
    var m = window.SAKHA_IMG || {};
    return m[w.y] || null;
  }
  function learnedStats() {
    var total = 0, known = 0, per = {};
    Object.keys(CONTENT).forEach(function (id) {
      var c = CONTENT[id];
      per[id] = { k: 0, t: c.words.length };
      c.words.forEach(function (w) { if (S.known[id + ':' + w.y] === 'know') { per[id].k++; known++; } });
      total += c.words.length;
    });
    return { total: total, known: known, per: per };
  }
  function renderLearned() {
    var st = learnedStats(), pct = st.total ? Math.round(st.known / st.total * 100) : 0;
    var big = $('#knownBig'); if (big) big.textContent = st.known;
    var of = $('#knownOf'); if (of) of.textContent = st.known + ' из ' + st.total;
    var tab = $('#knownTab'); if (tab) tab.textContent = st.known;
    var donut = $('#knownDonut'); if (donut) donut.setAttribute('data-value', pct);
    var bars = $('#learnedBars');
    if (bars) bars.innerHTML = Object.keys(CONTENT).map(function (id) {
      var p = st.per[id], pc = p.t ? Math.round(p.k / p.t * 100) : 0;
      return '<div class="lbar">Урок ' + id + ' · <b>' + p.k + '/' + p.t + '</b>' +
        '<div class="pbar"><i style="width:' + pc + '%"></i></div>' + esc(CONTENT[id].title) + '</div>';
    }).join('');
    var cnt = $('#wordsCount');
    if (cnt) cnt.textContent = 'Всего ' + st.total + ' ' + plural(st.total, 'слово', 'слова', 'слов') +
      ' из ' + Object.keys(CONTENT).length + ' уроков · изучено ' + st.known;
    if (App.animateDonuts) App.animateDonuts();
  }
  function ensureWordEmpty() {
    if ($('#wordEmpty')) return;
    var d = document.createElement('div');
    d.id = 'wordEmpty'; d.className = 'empty'; d.style.display = 'none';
    d.innerHTML = '<svg class="em"><use href="#i-search"/></svg>Ничего не найдено';
    var bank = $('#wordBank'); if (bank && bank.parentNode) bank.parentNode.appendChild(d);
  }
  function applyWordFilters() {
    var q = $('#search') ? $('#search').value.toLowerCase().trim() : '';
    var shown = 0;
    $$('#wordBank .wgroup').forEach(function (g) {
      var lid = g.dataset.lid, any = false;
      $$('.wrow', g).forEach(function (r) {
        var okTab = wordTab === 'all' ? true
          : (wordTab === 'known' ? r.dataset.known === '1'
            : (wordTab === 'fav' ? r.dataset.isfav === '1' : lid === wordTab));
        var okQ = !q || (r.dataset.search || '').toLowerCase().indexOf(q) > -1;
        var show = okTab && okQ;
        r.style.display = show ? '' : 'none';
        if (show) any = true;
      });
      g.style.display = any ? '' : 'none';
      if (any) shown++;
    });
    var empty = $('#wordEmpty');
    if (empty) empty.style.display = shown ? 'none' : 'block';
  }
  function renderWords() {
    var bank = $('#wordBank'); if (!bank) return;
    var html = '';
    Object.keys(CONTENT).forEach(function (id) {
      var c = CONTENT[id];
      html += '<div class="wgroup" data-lid="' + id + '"><h4>Урок ' + id + ' · ' + esc(c.title) + '</h4>';
      c.words.forEach(function (w) {
        var key = id + ':' + w.y;
        var k = S.known[key] || '';
        var img = wordImg(w);
        var tag = k === 'know' ? '<span class="tag know">знаю</span>' : (k === 'repeat' ? '<span class="tag repeat">повторить</span>' : '<span class="tag">новое</span>');
        html += '<div class="wrow' + (img ? '' : ' no-img') + '" data-search="' + esc(w.y + ' ' + w.ru) + '"' +
          ' data-lid="' + id + '" data-known="' + (k === 'know' ? '1' : '0') + '" data-isfav="' + (S.fav[key] ? '1' : '0') + '">' +
          (img ? '<div class="wthumb"><img src="' + img + '" alt=""></div>' : '') +
          '<b data-say="' + esc(w.y) + '" data-tr="' + esc(w.ru) + '" data-lang="sah">' + esc(cap(w.y)) + '</b><em>' + esc(cap(w.ru)) + '</em>' + tag +
          '<div class="speak-pair">' +
            '<button class="speak" data-speak="' + esc(w.y) + '" data-lang="sah" aria-label="Послушать по-якутски"><svg><use href="#i-sound"/></svg></button>' +
            '<button class="speak ru" data-speak="' + esc(w.ru) + '" data-lang="ru" aria-label="Послушать по-русски">RU</button>' +
          '</div>' +
          '<button class="star-btn' + (S.fav[key] ? ' on' : '') + '" data-fav="' + esc(key) + '" aria-label="В избранное"><svg><use href="#i-star"/></svg></button>' +
          '</div>';
      });
      html += '</div>';
    });
    bank.innerHTML = html;
    ensureWordEmpty();
    renderLearned();
    applyWordFilters();
  }

  function renderFav() {
    var box = $('#favList'); if (!box) return;
    var keys = Object.keys(S.fav).filter(function (k) { return S.fav[k]; });
    if (!keys.length) {
      box.innerHTML = '<div class="empty"><svg class="em"><use href="#i-star"/></svg>' +
        'Пока пусто. Отмечай слова звёздочкой в разделе «Новые слова» — они появятся здесь.</div>';
      return;
    }
    box.innerHTML = '<div class="wgroup"><h4>Сохранённые слова</h4>' + keys.map(function (k) {
      var parts = k.split(':'), id = parts[0], y = parts.slice(1).join(':');
      var c = CONTENT[id], w = c && c.words.filter(function (x) { return x.y === y; })[0];
      if (!w) return '';
      return '<div class="wrow" data-search="' + esc(w.y + ' ' + w.ru) + '">' +
        '<b>' + esc(w.y) + '</b><em>' + esc(w.ru) + '</em>' +
        '<span class="tag">урок ' + id + '</span>' +
        '<button class="speak" data-speak="' + esc(w.y) + '" aria-label="Слушать"><svg><use href="#i-sound"/></svg></button>' +
        '<button class="star-btn on" data-fav="' + esc(k) + '" aria-label="Убрать"><svg><use href="#i-star"/></svg></button></div>';
    }).join('') + '</div>';
  }

  // клики по звёздочкам и плиткам достижений
  document.addEventListener('click', function (e) {
    var st = e.target.closest('[data-fav]');
    if (st) sfx('tap');
    if (st) {
      var k = st.dataset.fav;
      S.fav[k] = !S.fav[k]; save();
      st.classList.toggle('on', !!S.fav[k]);
      renderWords();
      App.toast(S.fav[k] ? 'Добавлено в избранное' : 'Убрано из избранного');
      return;
    }
    if (e.target.closest('[data-ach]')) { App.go('achieve'); }
  });

  /* ------------------------- озвучка ------------------------- */
  var FEMALE_HINTS = ['milena', 'milana', 'irina', 'anna', 'anastasia', 'alena', 'alyona',
    'katya', 'tatiana', 'tatyana', 'svetlana', 'elena', 'yandex', 'google', 'жен', 'female'];
  var cachedVoice = null;

  function voiceScore(v) {
    var n = (v.name || '').toLowerCase(), sc = 0, i;
    for (i = 0; i < FEMALE_HINTS.length; i++) if (n.indexOf(FEMALE_HINTS[i]) > -1) { sc += 6; break; }
    if (/^ru/i.test(v.lang)) sc += 4;
    if (v.localService) sc += 1;
    if (/^ru-RU$/i.test(v.lang)) sc += 1;
    return sc;
  }
  var VOICE_LANGS = [
    { code: 'ru', label: 'Русский' },
    { code: 'tr', label: 'Турецкий' },
    { code: 'az', label: 'Азербайджанский' },
    { code: 'kk', label: 'Казахский' },
    { code: 'tt', label: 'Татарский' },
    { code: 'ba', label: 'Башкирский' },
    { code: 'ky', label: 'Киргизский' },
    { code: 'uz', label: 'Узбекский' }
  ];
  function allVoices() {
    if (!('speechSynthesis' in window)) return [];
    return (speechSynthesis.getVoices() || []);
  }
  function voicesFor(code) {
    return allVoices().filter(function (v) { return new RegExp('^' + code, 'i').test(v.lang); });
  }
  function ruVoices() { return voicesFor('ru'); }
  // какой язык фонетики включён и есть ли под него голос
  function phonPref() {
    var pref = S.ttsLang || 'auto';
    return PHON_LANGS[pref] ? pref : 'auto';
  }
  function phonCodeFor(text) {
    var pref = phonPref();
    // если пользователь выбрал конкретный голос — подстраиваемся под него
    if (S.voiceURI) {
      var chosen = allVoices().filter(function (v) { return v.voiceURI === S.voiceURI; })[0];
      if (chosen) {
        var code = String(chosen.lang || '').slice(0, 2).toLowerCase();
        if (PHON_MAP[code]) return code;
      }
    }
    if (pref !== 'auto') return voicesFor(pref).length ? pref : 'ru';
    // авто: один и тот же голос для всех якутских слов — приложение говорит
    // ровно одним голосом, а не перескакивает между русским и тюркским.
    // Тюркские голоса читают якутские ө/ү/ҕ/һ/ҥ правильно, поэтому они первые.
    for (var i = 0; i < UNIFIED_ORDER.length; i++) {
      if (voicesFor(UNIFIED_ORDER[i]).length) return UNIFIED_ORDER[i];
    }
    return 'ru';
  }
  function pickVoice(code) {
    code = code || 'ru';
    if (S.voiceURI) {
      var chosen = allVoices().filter(function (v) { return v.voiceURI === S.voiceURI; })[0];
      if (chosen) return chosen;
    }
    if (cachedVoice && new RegExp('^' + code, 'i').test(cachedVoice.lang || '')) return cachedVoice;
    var list = voicesFor(code);
    if (!list.length) return null;
    list.sort(function (a, b) { return voiceScore(b) - voiceScore(a); });
    cachedVoice = list[0];
    return cachedVoice;
  }
  // lang: 'sah' — якутское слово, 'ru' — русский перевод
  /* записанная озвучка якутских слов (вшита в файл, один и тот же голос на всех устройствах) */
  var SAKHA_AUDIO = (typeof window !== 'undefined' && window.SAKHA_AUDIO) || {};
  var audioEl = null, lastAudio = '';
  function normKey(t) { return String(t || '').replace(/\s+/g, ' ').trim().replace(/[!?.,]+$/, '').toLowerCase(); }
  function recorded(text) {
    var k = normKey(text);
    return SAKHA_AUDIO['sah|' + k] || SAKHA_AUDIO['sah|' + String(text || '').trim()] || '';
  }
  function stopAudio() {
    if (audioEl) { try { audioEl.pause(); audioEl.currentTime = 0; } catch (e) {} }
    lastAudio = '';
    setTalking(false);
  }
  function playRecorded(src) {
    if (!audioEl) { audioEl = new Audio(); audioEl.preload = 'auto'; }
    stopAudio();
    lastAudio = src;
    audioEl.src = src;
    var r = parseFloat(S.voiceRate) || 0.9;
    audioEl.playbackRate = Math.max(0.6, Math.min(1.6, r / 0.9));
    var pr = audioEl.play();
    if (pr && pr.catch) pr.catch(function () {});
    setTalking(true);
    audioEl.onended = function () { setTalking(false); };
    audioEl.onerror = function () { setTalking(false); };
    return true;
  }

  /* ---------- якутское написание -> «русская» запись для синтезатора ----------
     Системный голос знает только русские буквы: ө/ү/ҕ/һ/ҥ он читал на русский
     манер (күн -> «кун», баһыыба -> «бахыыба» не получалось). Подменяем буквы на
     ближайшие русские, чтобы звучало похоже на якутский. Записи с диктором важнее —
     они играют первыми, эта функция нужна для слов без записи. */
  /* ---------------------------------------------------------------------
     Фонетика для системного синтезатора
     В якутском есть звуки, которых в русском нет: ө [ø], ү [y], ҕ [ɣ],
     һ [h], ҥ [ŋ]. Русский голос их не умеет, а вот тюркские языки — умеют:
     турецкий и азербайджанский читают ö, ü, ı, ğ, h ровно так, как нужно.
     Поэтому текст переписываем под тот язык, чей голос выбран.
     --------------------------------------------------------------------- */
  var PHON_LANGS = {
    ru: { label: 'русский (ё, ю, нг)', tag: 'ru' },
    tr: { label: 'турецкий (ö, ü, ı)', tag: 'tr' },
    az: { label: 'азербайджанский (ö, ü, x)', tag: 'az' },
    kk: { label: 'казахский (ө, ү, ң)', tag: 'kk' }
  };

  // --- русский: ё/ю передают мягкость, ө/ү в начале слова — без «й» ---
  // названия букв алфавита — под каждый язык синтезатора
  var LETTER_SAY = {
    ru: {
      'а': 'а', 'э': 'э', 'и': 'и', 'о': 'о', 'ө': 'ё', 'у': 'у', 'ү': 'ю', 'ы': 'ы',
      'аа': 'аа', 'ээ': 'ээ', 'ии': 'ии', 'оо': 'оо', 'өө': 'ёё', 'уу': 'уу', 'үү': 'юю', 'ыы': 'ыы',
      'ыа': 'ыа', 'иэ': 'иэ', 'уо': 'уо', 'үө': 'юё',
      'б': 'бэ', 'в': 'вэ', 'г': 'гэ', 'ҕ': 'га', 'д': 'дэ', 'дь': 'дьэ', 'ж': 'жэ', 'з': 'зэ',
      'й': 'й', 'к': 'ка', 'л': 'лэ', 'м': 'мэ', 'н': 'нэ', 'ҥ': 'нга', 'нь': 'ньэ',
      'п': 'пэ', 'р': 'рэ', 'с': 'сэ', 'һ': 'ха', 'т': 'тэ', 'ф': 'фэ', 'х': 'хэ',
      'ц': 'цэ', 'ч': 'чэ', 'ш': 'шэ', 'щ': 'щэ'
    },
    tr: {
      'а': 'a', 'э': 'e', 'и': 'i', 'о': 'o', 'ө': 'ö', 'у': 'u', 'ү': 'ü', 'ы': 'ı',
      'аа': 'aa', 'ээ': 'ee', 'ии': 'ii', 'оо': 'oo', 'өө': 'öö', 'уу': 'uu', 'үү': 'üü', 'ыы': 'ıı',
      'ыа': 'ıa', 'иэ': 'ie', 'уо': 'uo', 'үө': 'üö',
      'б': 'be', 'в': 've', 'г': 'ge', 'ҕ': 'ğa', 'д': 'de', 'дь': 'ce', 'ж': 'je', 'з': 'ze',
      'й': 'y', 'к': 'ke', 'л': 'le', 'м': 'me', 'н': 'ne', 'ҥ': 'nge', 'нь': 'nye',
      'п': 'pe', 'р': 're', 'с': 'se', 'һ': 'he', 'т': 'te', 'ф': 'fe', 'х': 'he',
      'ц': 'tse', 'ч': 'çe', 'ш': 'şe', 'щ': 'şçe'
    },
    az: {
      'а': 'a', 'э': 'e', 'и': 'i', 'о': 'o', 'ө': 'ö', 'у': 'u', 'ү': 'ü', 'ы': 'ı',
      'аа': 'aa', 'ээ': 'ee', 'ии': 'ii', 'оо': 'oo', 'өө': 'öö', 'уу': 'uu', 'үү': 'üü', 'ыы': 'ıı',
      'ыа': 'ıa', 'иэ': 'ie', 'уо': 'uo', 'үө': 'üö',
      'б': 'be', 'в': 've', 'г': 'ge', 'ҕ': 'ğa', 'д': 'de', 'дь': 'ce', 'ж': 'je', 'з': 'ze',
      'й': 'y', 'к': 'ke', 'л': 'le', 'м': 'me', 'н': 'ne', 'ҥ': 'nge', 'нь': 'nye',
      'п': 'pe', 'р': 're', 'с': 'se', 'һ': 'he', 'т': 'te', 'ф': 'fe', 'х': 'xe',
      'ц': 'tse', 'ч': 'çe', 'ш': 'şe', 'щ': 'şçe'
    },
    kk: {
      'а': 'а', 'э': 'э', 'и': 'и', 'о': 'о', 'ө': 'ө', 'у': 'у', 'ү': 'ү', 'ы': 'ы',
      'аа': 'аа', 'ээ': 'ээ', 'ии': 'ии', 'оо': 'оо', 'өө': 'өө', 'уу': 'уу', 'үү': 'үү', 'ыы': 'ыы',
      'ыа': 'ыа', 'иэ': 'иэ', 'уо': 'уо', 'үө': 'үө',
      'б': 'бэ', 'в': 'вэ', 'г': 'гэ', 'ҕ': 'ға', 'д': 'дэ', 'дь': 'дьэ', 'ж': 'жэ', 'з': 'зэ',
      'й': 'й', 'к': 'ка', 'л': 'лэ', 'м': 'мэ', 'н': 'нэ', 'ҥ': 'ңа', 'нь': 'ньэ',
      'п': 'пэ', 'р': 'рэ', 'с': 'сэ', 'һ': 'һа', 'т': 'тэ', 'ф': 'фэ', 'х': 'хэ',
      'ц': 'цэ', 'ч': 'чэ', 'ш': 'шэ', 'щ': 'щэ'
    }
  };

  var RU_CONS = 'бвгҕджзйклмнҥньпрсһтфхцчшщБВГҔДЖЗЙКЛМНҤНЬПРСҺТФХЦЧШЩ';

  function isCons(ch) { return !!ch && RU_CONS.indexOf(ch) > -1; }

  function toRussian(t) {
    function front(lower, soft, plain) {
      return function (m, off, str) {
        var prev = off > 0 ? str.charAt(off - 1) : '';
        return isCons(prev) ? soft : plain;
      };
    }
    return t
      .replace(/ө/g, front('ө', 'ё', 'о')).replace(/Ө/g, front('Ө', 'Ё', 'О'))
      .replace(/ү/g, front('ү', 'ю', 'у')).replace(/Ү/g, front('Ү', 'Ю', 'У'))
      .replace(/ҕ/g, 'г').replace(/Ҕ/g, 'Г')
      .replace(/ҥ/g, 'нг').replace(/Ҥ/g, 'Нг')
      .replace(/һ/g, 'х').replace(/Һ/g, 'Х');
  }

  // --- турецкий / азербайджанский: полная запись латиницей ---
  // в этих языках есть ровно те звуки, которых нет в русском: ö [ø], ü [y],
  // ı [ɯ], ğ [ɣ], h, ng. Поэтому якутский текст переписываем их алфавитом.
  var LAT_BASE = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'j', 'з': 'z',
    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
    'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'ц': 'ts', 'ч': 'ç', 'ш': 'ş',
    'щ': 'şç', 'ъ': '', 'ы': 'ı', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ё': 'yo',
    'ө': 'ö', 'ү': 'ü', 'һ': 'h', 'ҕ': 'ğ', 'ҥ': 'ng'
  };
  var LAT_MAP = {
    tr: Object.assign({}, LAT_BASE, { 'х': 'h' }),
    az: Object.assign({}, LAT_BASE, { 'х': 'x' })
  };
  var LAT_DIGRAPH = [['дь', 'c'], ['нь', 'ny']];

  function upperFirst(rep) { return rep ? rep.charAt(0).toUpperCase() + rep.slice(1) : ''; }

  function toLatin(t, lang) {
    var map = LAT_MAP[lang] || LAT_MAP.tr;
    LAT_DIGRAPH.forEach(function (pair) {
      t = t.replace(new RegExp(pair[0], 'g'), pair[1]).replace(new RegExp(pair[0].toUpperCase(), 'g'), upperFirst(pair[1]));
      t = t.replace(new RegExp(pair[0].charAt(0).toUpperCase() + pair[0].charAt(1), 'g'), upperFirst(pair[1]));
    });
    var out = '';
    for (var i = 0; i < t.length; i++) {
      var ch = t.charAt(i), low = ch.toLowerCase();
      if (!Object.prototype.hasOwnProperty.call(map, low)) { out += ch; continue; }
      out += (ch === low) ? map[low] : upperFirst(map[low]);
    }
    return out;
  }

  // --- казахский: буквы те же, меняются только ҕ → ғ и ҥ → ң ---
  var KK_MAP = { 'ҕ': 'ғ', 'Ҕ': 'Ғ', 'ҥ': 'ң', 'Ҥ': 'Ң' };

  function toKazakh(t) {
    var out = '';
    for (var i = 0; i < t.length; i++) {
      var ch = t.charAt(i);
      out += Object.prototype.hasOwnProperty.call(KK_MAP, ch) ? KK_MAP[ch] : ch;
    }
    return out;
  }

  var TRIGGER = /[өүҕһҥӨҮҔҺҤ]/;      // звуки, которых нет в русском
  var UNIFIED_ORDER = ['tr', 'az', 'kk', 'tt', 'ba', 'ky', 'uz', 'ru'];  // единый голос: первый доступный

  function respell(text, code) {
    var t = String(text || '').trim().replace(/[!?.;:"]/g, '').replace(/\s+/g, ' ').trim();
    var lang = PHON_LANGS[code] ? code : 'ru';
    var say = LETTER_SAY[lang];
    if (say && Object.prototype.hasOwnProperty.call(say, t.toLowerCase())) return say[t.toLowerCase()];
    if (lang === 'tr' || lang === 'az') return toLatin(t, lang);
    if (lang === 'kk') return toKazakh(t);
    return toRussian(t);
  }

  // обратная совместимость: sahPhon(text) — по-русски, sahPhon(text, 'tr') — по-турецки
  function sahPhon(text, code) { return respell(text, code || 'ru'); }

  function speak(text, lang) {
    if (lang === 'sah') {
      var src = recorded(text);
      if (src) {
        if ('speechSynthesis' in window) speechSynthesis.cancel();
        playRecorded(src);
        return;
      }
    } else {
      stopAudio();
    }
    if (!('speechSynthesis' in window)) { App.toast('Браузер не поддерживает озвучку'); return; }
    stopAudio();
    try {
      speechSynthesis.cancel();
      var code = lang === 'sah' ? phonCodeFor(text) : 'ru';
      var clean = lang === 'sah'
        ? respell(text, code)
        : String(text || '').replace(/[?!.,]$/g, '').replace(/,/g, ', ');
      var u = new SpeechSynthesisUtterance(clean);
      var rate = parseFloat(S.voiceRate) || 0.9;
      u.rate = lang === 'sah' ? Math.max(0.6, rate - 0.05) : rate;
      u.pitch = 1.04;
      u.volume = 1;
      var v = pickVoice(code);
      if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = code === 'ru' ? 'ru-RU' : code; }
      speechSynthesis.speak(u);
      setTalking(true, Math.min(5000, 500 + clean.length * 75));
      u.onend = function () { setTalking(false); };
    } catch (e) { App.toast('Озвучка недоступна'); }
  }
  function fillVoiceSelect() {
    var sel = $('#voiceSelect'); if (!sel) return;
    var groups = VOICE_LANGS.map(function (l) {
      var vs = voicesFor(l.code);
      if (!vs.length) return '';
      return '<optgroup label="' + l.label + '">' + vs.map(function (v) {
        return '<option value="' + esc(v.voiceURI) + '">' + esc(v.name) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
    sel.innerHTML = '<option value="">системный женский</option>' + groups;
    sel.value = S.voiceURI || '';
  }
  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = function () { cachedVoice = null; fillVoiceSelect(); };
  }

  /* ---------- маскот рядом со словом: анимация рта во время озвучки ---------- */
  var mpEl = null, talkTimer = null, hideTimer = null;
  function mascotImg(kind) {
    var map = window.SAKHA_IMG || {};
    return map[kind] || '';
  }
  function mascotEl() {
    if (mpEl) return mpEl;
    mpEl = document.createElement('div');
    mpEl.className = 'mascot-pop';
    mpEl.id = 'mascotPop';
    mpEl.innerHTML =
      '<div class="mp-face">' +
        '<img class="closed" src="' + mascotImg('face') + '" alt="Кыыс Куо">' +
        '<img class="open" src="' + mascotImg('faceOpen') + '" alt="">' +
      '</div>' +
      '<div class="mp-bubble">' +
        '<div class="mp-line"><b class="mp-word"></b><span class="mp-tr"></span></div>' +
        '<small class="mp-hint"></small>' +
      '</div>';
    document.body.appendChild(mpEl);
    return mpEl;
  }
  function setTalking(on, ms) {
    var el = mascotEl();
    clearTimeout(talkTimer);
    el.classList.toggle('talking', !!on);
    if (on && ms) talkTimer = setTimeout(function () { el.classList.remove('talking'); }, ms);
  }
  function showMascot(word, tr) {
    var el = mascotEl();
    $('.mp-word', el).textContent = cap(word || '');
    var trEl = $('.mp-tr', el), hintEl = $('.mp-hint', el);
    trEl.textContent = tr ? cap(tr) : '';
    trEl.style.display = tr ? 'inline' : 'none';
    hintEl.textContent = tr ? '' : 'Слушай и повторяй';
    hintEl.style.display = tr ? 'none' : 'block';
    el.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { el.classList.remove('show'); }, 5000);
  }
  function hideMascot() {
    if (mpEl) mpEl.classList.remove('show');
    clearTimeout(hideTimer);
  }

  document.addEventListener('click', function (e) {
    // кнопка-динамик
    var b = e.target.closest('[data-speak]');
    if (b && b.dataset.speak) {
      e.preventDefault(); e.stopPropagation();
      var bLang = b.dataset.lang || 'sah';
      speak(b.dataset.speak, bLang);
      // символ появляется и при нажатии на кнопку-динамик
      var bTr = b.dataset.tr || '';
      if (!bTr) { var bHolder = b.closest('[data-tr]'); if (bHolder) bTr = bHolder.dataset.tr || ''; }
      if (!bTr) {
        var bBox = b.closest('.wrow, .self-card, .chat, .abc-tile, .q-media, .card');
        var bSrc = bBox && bBox.querySelector('[data-tr]');
        if (bSrc) bTr = bSrc.dataset.tr || '';
      }
      showMascot(b.dataset.speak, bLang === 'sah' ? bTr : '');
      b.animate && b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
      return;
    }
    // само слово — озвучиваем и показываем подсказку
    var w = e.target.closest('[data-say]');
    if (!w || !w.dataset.say) return;
    e.preventDefault(); e.stopPropagation();
    var lang = w.dataset.lang || 'sah';
    speak(w.dataset.say, lang);
    showMascot(w.dataset.say, lang === 'sah' ? (w.dataset.tr || '') : '');
  });

  /* =====================================================================
     ПЛЕЕР УРОКА
     ===================================================================== */
  var flow = null;

  function startLesson(id) {
    var c = CONTENT[id];
    if (!c) { App.toast('Этот урок появится позже'); return; }
    restoreFoot();
    var g = group();
    var words = c.words.slice();

    var steps = [];
    shuffle(words).slice(0, g.tasks).forEach(function (w) {
      var others = shuffle(words.filter(function (x) { return x.ru !== w.ru; })).slice(0, g.options - 1);
      steps.push({ type: 'choice', stage: 0, word: w, options: shuffle([w.ru].concat(others.map(function (x) { return x.ru; }))) });
    });
    steps.push({ type: 'match', stage: 1, pairs: words.slice(0, g.pairs) });
    if (c.dialogues) {
      c.dialogues.forEach(function (d) {
        steps.push({ type: 'chat', stage: 2, lines: d.lines, options: d.options, answer: d.answer, question: d.question });
      });
    }
    var bMode = (c.build[g.build] && c.build[g.build].length) ? g.build : 'words';
    (c.build[bMode] || []).forEach(function (b) {
      steps.push({ type: 'build', stage: 2, mode: bMode, prompt: b.prompt, answer: b.answer, chips: b.chips || null, hint: g.hint ? b.hint : null });
    });
    steps.push({ type: 'selfcheck', stage: 3, words: words.slice(0, 6) });

    flow = { id: id, steps: steps, i: 0, answered: 0, correct: 0, gained: 0, achBefore: unlockedIds(),
             tally: [{ c: 0, t: 0 }, { c: 0, t: 0 }, { c: 0, t: 0 }, { c: 0, t: 0 }] };

    var title = $('#lesTitle'); if (title) title.textContent = 'Урок ' + id + ' · ' + c.title;
    var sub = $('#lesSub'); if (sub) sub.textContent = c.sub;
    var mode = $('#modeChip'); if (mode) mode.innerHTML = 'Режим: ' + g.name;

    App.go('lesson');
    $$('.nav-item').forEach(function (n) { n.classList.toggle('active', n.dataset.go === 'lessons'); });
    renderStep();
  }

  function renderStepsUI() {
    var st = flow.steps[flow.i];
    var done = {};
    flow.steps.slice(0, flow.i).forEach(function (s) { done[s.stage] = 1; });
    $('#stageSteps').innerHTML = STAGES.map(function (s, idx) {
      var cls = idx === st.stage ? 'active' : (done[idx] || idx < st.stage ? 'done' : '');
      return '<div class="step ' + cls + '"><i>' + (done[idx] || idx < st.stage ? '✓' : s.n) + '</i>' + s.title + '</div>';
    }).join('');
    $('#stageBar').firstElementChild.style.width = Math.round(flow.i / Math.max(1, flow.steps.length - 1) * 100) + '%';
    var stageTitle = st.type === 'chat' ? 'Заверши диалог' : STAGES[st.stage].title;
    $('#stageCount').textContent = 'Шаг ' + (flow.i + 1) + ' из ' + flow.steps.length + ' · ' + stageTitle;
  }

  function setFooter(primaryLabel, primaryDisabled, showBack) {
    var next = $('#btnNext'), back = $('#btnBack');
    next.textContent = primaryLabel;
    next.disabled = !!primaryDisabled;
    back.style.visibility = showBack === false ? 'hidden' : 'visible';
  }

  function feedback(kind, text, img) {
    var fb = $('#feedback');
    if (!fb) return;
    fb.className = 'feedback show ' + kind;
    fb.textContent = text;
    if (img) {
      var d = document.createElement('div');
      d.className = 'fb-pic';
      d.innerHTML = '<img src="' + img + '" alt="">';
      fb.appendChild(d);
    }
  }
  function clearFeedback() {
    var fb = $('#feedback');
    if (fb) { fb.className = 'feedback'; fb.textContent = ''; }
  }

  function renderStep() {
    if (!flow) return;
    if (flow.i >= flow.steps.length) { finishLesson(); return; }
    var st = flow.steps[flow.i];
    renderStepsUI();
    clearFeedback();
    hideMascot();
    var card = $('#stageCard');
    card.innerHTML = '<div id="stageBody" style="display:flex;flex-direction:column;flex:1"></div><div class="feedback" id="feedback"></div>';
    var body = $('#stageBody');

    if (st.type === 'choice') renderChoice(st, body);
    else if (st.type === 'match') renderMatch(st, body);
    else if (st.type === 'build') renderBuild(st, body);
    else if (st.type === 'selfcheck') renderSelfcheck(st, body);
    else if (st.type === 'chat') renderChat(st, body);
  }

  /* ---------- этап 1: выбирать ---------- */
  function renderChoice(st, body) {
    st.state = { selected: null, checked: false };
    body.innerHTML =
      '<div class="q-label">' + STAGES[0].hint + '</div>' +
      '<div class="q-media">' +
        '<div class="q-word" data-say="' + esc(st.word.y) + '" data-lang="sah">' + esc(cap(st.word.y)) +
          '<button class="speak" data-speak="' + esc(st.word.y) + '" aria-label="Слушать"><svg><use href="#i-sound"/></svg></button></div>' +
        (wordImg(st.word)
          ? '<div class="q-pic" data-say="' + esc(st.word.y) + '" data-lang="sah" title="Нажми, чтобы услышать слово">' +
              '<img src="' + wordImg(st.word) + '" alt="' + esc(st.word.y) + '"></div>'
          : '') +
      '</div>' +
      '<p class="q-sub">Что это значит по-русски?</p>' +
      '<div class="opts">' + st.options.map(function (o) {
        return '<button class="opt" data-opt="' + esc(o) + '">' + esc(cap(o)) + '</button>';
      }).join('') + '</div>';

    $$('.opt', body).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (st.state.checked) return;
        st.state.selected = btn.dataset.opt;
        $$('.opt', body).forEach(function (b) { b.classList.remove('sel'); });
        btn.classList.add('sel');
        sfx('tap');
        setFooter('Проверить', false);
      });
    });
    setFooter('Проверить', true, flow.i > 0);

    $('#btnNext').onclick = function () {
      if (!st.state.checked) {
        if (!st.state.selected) return;
        st.state.checked = true;
        flow.answered++;
        var ok = st.state.selected === st.word.ru;
        flow.tally[0].t++; if (ok) flow.tally[0].c++;
        if (ok) { flow.correct++; flow.gained += 10; }
        $$('.opt', body).forEach(function (b) {
          b.classList.remove('sel');
          if (b.dataset.opt === st.word.ru) b.classList.add('ok');
          else if (b.dataset.opt === st.state.selected) b.classList.add('bad');
        });
        sfx(ok ? 'ok' : 'bad');
        var qw = $('.q-word', body); if (qw) qw.dataset.tr = st.word.ru;
        feedback(ok ? 'ok' : 'bad', ok ? 'Верно! ' + cap(st.word.y) + ' — ' + cap(st.word.ru) + '. +10 XP' : 'Правильно: ' + cap(st.word.y) + ' — ' + cap(st.word.ru));
        setFooter(flow.i === flow.steps.length - 1 ? 'Завершить' : 'Дальше', false, flow.i > 0);
        if (ok) { S.known[flow.id + ':' + st.word.y] = 'know'; save(); }
      } else { flow.i++; renderStep(); }
    };
  }

  /* ---------- этап 2: соотносить ---------- */
  function renderMatch(st, body) {
    var left = shuffle(st.pairs), right = shuffle(st.pairs);
    st.state = { sel: null, matched: 0, total: st.pairs.length };
    body.innerHTML =
      '<div class="q-label">' + STAGES[1].hint + '</div>' +
      '<p class="q-sub" style="margin-bottom:16px">Нажми слово слева, затем его перевод справа.</p>' +
      '<div class="match">' +
        '<div class="mcol">' + left.map(function (p, i) {
          return '<button class="mitem" data-side="l" data-key="' + i + '" data-val="' + esc(p.y) + '" data-say="' + esc(p.y) + '" data-lang="sah">' + esc(cap(p.y)) + '</button>';
        }).join('') + '</div>' +
        '<div class="mcol">' + right.map(function (p, i) {
          return '<button class="mitem" data-side="r" data-key="' + i + '" data-val="' + esc(p.ru) + '">' + esc(cap(p.ru)) + '</button>';
        }).join('') + '</div>' +
      '</div>';

    setFooter('Дальше', true, flow.i > 0);

    $$('.mitem', body).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.classList.contains('done')) return;
        var side = btn.dataset.side;
        if (!st.state.sel) {
          st.state.sel = btn; btn.classList.add('sel');
          sfx('tap');
          return;
        }
        var first = st.state.sel;
        if (first === btn) { first.classList.remove('sel'); st.state.sel = null; return; }
        if (first.dataset.side === side) { // переключение внутри колонки
          first.classList.remove('sel'); st.state.sel = btn; btn.classList.add('sel'); return;
        }
        var yVal = side === 'l' ? btn.dataset.val : first.dataset.val;
        var ruVal = side === 'r' ? btn.dataset.val : first.dataset.val;
        var pair = st.pairs.filter(function (p) { return p.y === yVal; })[0];
        var okPair = pair && pair.ru === ruVal;
        first.classList.remove('sel'); st.state.sel = null;
        if (okPair) {
          var yBtn = $$('.mitem[data-side="l"]', body).filter(function (b) { return b.dataset.val === yVal; })[0];
          var rBtn = $$('.mitem[data-side="r"]', body).filter(function (b) { return b.dataset.val === ruVal; })[0];
          yBtn.classList.add('done'); rBtn.classList.add('done');
          yBtn.dataset.tr = ruVal; speak(yVal, 'sah'); showMascot(cap(yVal), cap(ruVal));
          sfx('ok');
          st.state.matched++; flow.correct++; flow.gained += 5;
          flow.tally[1].c++; flow.tally[1].t++;
          S.known[flow.id + ':' + yVal] = 'know'; save();
          if (st.state.matched === st.state.total) {
            feedback('ok', 'Все пары собраны! +5 XP за каждую.');
            flow.answered += st.state.total;
            setFooter('Дальше', false, flow.i > 0);
            App.toast('Соотнесено ' + st.state.total + ' из ' + st.state.total);
          }
        } else {
          btn.classList.add('bad');
          sfx('bad');
          var bad = btn;
          setTimeout(function () { bad.classList.remove('bad'); }, 450);
          feedback('bad', 'Не совпало — попробуй ещё раз.');
        }
      });
    });
  }

  /* ---------- этап 3: конструировать ---------- */
  function renderBuild(st, body) {
    var isLetters = st.mode === 'letters';
    var tokens = isLetters ? st.answer.split('') : st.chips.slice();
    st.state = { picked: [], checked: false, bank: shuffle(tokens.map(function (t, i) { return { t: t, id: i }; })) };

    body.innerHTML =
      '<div class="q-label">' + STAGES[2].hint + '</div>' +
      '<p class="build-prompt" data-say="' + esc(st.prompt) + '" data-lang="ru">' + esc(cap(st.prompt)) + '</p>' +
      (st.hint ? '<p class="build-hint">Подсказка: ' + esc(st.hint) + '</p>' : '<p class="build-hint">Собери ' + (isLetters ? 'слово по буквам' : 'фразу из слов') + '</p>') +
      '<div class="slots' + '' + '" id="slots"><span class="ph">' + (isLetters ? 'Буквы появятся здесь' : 'Слова появятся здесь') + '</span></div>' +
      '<div class="bank" id="bank">' + st.state.bank.map(function (c) {
        return '<button class="tile' + (isLetters ? ' ltr' : '') + '" data-tile="' + c.id + '"' +
          (isLetters ? '' : ' data-say="' + esc(c.t) + '" data-lang="sah"') + '>' + esc(c.t) + '</button>';
      }).join('') + '</div>';

    setFooter('Проверить', true, flow.i > 0);

    function paint() {
      var slots = $('#slots');
      slots.innerHTML = st.state.picked.length
        ? st.state.picked.map(function (c, idx) {
            return '<button class="tile in-slot' + (isLetters ? ' ltr' : '') + '" data-slot="' + idx + '">' + esc(c.t) + '</button>';
          }).join('')
        : '<span class="ph">' + (isLetters ? 'Буквы появятся здесь' : 'Слова появятся здесь') + '</span>';
      slots.classList.toggle('full', !!st.state.picked.length);
      $$('[data-tile]').forEach(function (b) {
        var id = +b.dataset.tile;
        b.classList.toggle('used', st.state.picked.some(function (c) { return c.id === id; }));
      });
      if (!st.state.checked) setFooter('Проверить', st.state.picked.length === 0, flow.i > 0);
      $$('[data-slot]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (st.state.checked) return;
          st.state.picked.splice(+b.dataset.slot, 1); paint();
        });
      });
    }

    $$('[data-tile]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (st.state.checked) return;
        var id = +b.dataset.tile;
        var chip = st.state.bank.filter(function (c) { return c.id === id; })[0];
        st.state.picked.push(chip); sfx('tap'); paint();
      });
    });

    $('#btnNext').onclick = function () {
      if (!st.state.checked) {
        if (!st.state.picked.length) return;
        st.state.checked = true;
        flow.answered++;
        var made = st.state.picked.map(function (c) { return c.t; }).join(isLetters ? '' : ' ');
        var ok = norm(made) === norm(st.answer);
        flow.tally[2].t++; if (ok) flow.tally[2].c++;
        if (ok) { flow.correct++; flow.gained += 15; }
        sfx(ok ? 'ok' : 'bad');
        feedback(ok ? 'ok' : 'bad', ok ? 'Собрано верно! +15 XP' : 'Правильный вариант: ' + cap(st.answer));
        setFooter('Дальше', false, flow.i > 0);
      } else { flow.i++; renderStep(); }
    };
  }

  /* ---------- этап 3 (диалог): заверши реплику по смыслу ---------- */
  function renderChat(st, body) {
    st.state = { selected: null, checked: false };
    var ava = (window.SAKHA_IMG && window.SAKHA_IMG.face) || '';
    body.innerHTML =
      '<div class="q-label">Заверши диалог по смыслу</div>' +
      '<div class="chat">' +
        st.lines.map(function (l) {
          return '<div class="bubble' + (l.who === 'me' ? ' me' : '') + '">' +
            '<div class="ava">' + (l.who === 'me' ? '<svg><use href="#i-user"/></svg>' : '<img src="' + ava + '" alt="Кыыс Куо">') + '</div>' +
            '<div class="txt"><span class="y" data-say="' + esc(l.y) + '" data-tr="' + esc(l.ru) + '" data-lang="sah">' + esc(cap(l.y)) + '</span>' +
            '<span class="ru">' + esc(cap(l.ru)) + '</span></div></div>';
        }).join('') +
      '</div>' +
      '<p class="q-sub">' + esc(st.question) + '</p>' +
      '<div class="chat-opts">' + st.options.map(function (o, i) {
        return '<button class="opt chat-opt" data-opt="' + esc(o.y) + '" data-say="' + esc(o.y) + '" data-tr="' + esc(o.ru) + '" data-lang="sah">' +
          '<b>' + esc(cap(o.y)) + '</b><small>' + esc(cap(o.ru)) + '</small></button>';
      }).join('') + '</div>';

    setFooter('Проверить', true, flow.i > 0);

    $$('.chat-opt', body).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (st.state.checked) return;
        st.state.selected = btn.dataset.opt;
        $$('.chat-opt', body).forEach(function (b) { b.classList.remove('sel'); });
        btn.classList.add('sel');
        sfx('tap');
        setFooter('Проверить', false);
      });
    });

    $('#btnNext').onclick = function () {
      if (!st.state.checked) {
        if (!st.state.selected) return;
        st.state.checked = true;
        flow.answered++;
        var right = st.options[st.answer];
        var ok = st.state.selected === right.y;
        flow.tally[2].t++; if (ok) flow.tally[2].c++;
        if (ok) { flow.correct++; flow.gained += 10; }
        $$('.chat-opt', body).forEach(function (b) {
          b.classList.remove('sel');
          if (b.dataset.opt === right.y) b.classList.add('ok');
          else if (b.dataset.opt === st.state.selected) b.classList.add('bad');
        });
        sfx(ok ? 'ok' : 'bad');
        feedback(ok ? 'ok' : 'bad', ok ? 'Точно по смыслу! +10 XP' : 'Логичнее ответить: ' + cap(right.y) + ' — ' + cap(right.ru));
        setFooter(flow.i === flow.steps.length - 1 ? 'Завершить' : 'Дальше', false, flow.i > 0);
      } else { flow.i++; renderStep(); }
    };
  }

  /* ---------- этап 4: проверка себя ---------- */
  function renderSelfcheck(st, body) {
    var rated = {};
    body.innerHTML =
      '<div class="q-label">' + STAGES[3].hint + '</div>' +
      '<p class="q-sub" style="margin-bottom:14px">Нажми на перевод, чтобы проверить себя. Отметь честно: знаю или ещё повторю.</p>' +
      '<div class="self-list">' + st.words.map(function (w, i) {
        var img = wordImg(w);
        return '<div class="self-card" data-i="' + i + '">' +
          (img ? '<div class="wthumb"><img src="' + img + '" alt=""></div>' : '') +
          '<div><div class="y" data-say="' + esc(w.y) + '" data-tr="' + esc(w.ru) + '" data-lang="sah">' + esc(cap(w.y)) +
            '<button class="speak" data-speak="' + esc(w.y) + '" data-lang="sah" aria-label="Послушать по-якутски"><svg><use href="#i-sound"/></svg></button>' +
          '</div><div class="ru" data-reveal="' + i + '">' + esc(cap(w.ru)) + '</div></div>' +
          '<div class="self-actions">' +
            '<button class="pill-btn ok" data-rate="know" data-i="' + i + '">Знаю</button>' +
            '<button class="pill-btn rep" data-rate="repeat" data-i="' + i + '">Повторить</button>' +
          '</div></div>';
      }).join('') + '</div>';

    setFooter('Завершить урок', true, flow.i > 0);

    $$('[data-reveal]', body).forEach(function (el) {
      el.addEventListener('click', function () { el.classList.toggle('open'); });
    });
    $$('[data-rate]', body).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = btn.dataset.i;
        var card = $('.self-card[data-i="' + i + '"]', body);
        $$('.pill-btn', card).forEach(function (b) { b.classList.remove('sel'); });
        btn.classList.add('sel');
        $('[data-reveal="' + i + '"]', body).classList.add('open');
        rated[i] = btn.dataset.rate;
        sfx('tap');
        S.known[flow.id + ':' + st.words[i].y] = btn.dataset.rate;
        save();
        var all = Object.keys(rated).length === st.words.length;
        setFooter('Завершить урок', !all, flow.i > 0);
        if (all) {
          var kn = st.words.filter(function (w, idx) { return rated[idx] === 'know'; }).length;
          flow.answered += st.words.length;
          flow.correct += kn;
          flow.tally[3].t = st.words.length; flow.tally[3].c = kn;
          feedback('ok', 'Готово! Можно завершать урок.');
        }
      });
    });

    $('#btnNext').onclick = function () { flow.i++; finishLesson(); };
  }

  /* ---------- итоги ---------- */
  function finishLesson() {
    var gain = flow.gained + 30;
    S.xp += gain; S.xpToday += gain;
    S.xpByDay[todayStr()] = (S.xpByDay[todayStr()] || 0) + gain;
    var score = Math.round(flow.correct / Math.max(1, flow.answered) * 100);
    S.completed[flow.id] = Math.max(S.completed[flow.id] || 0, score);
    for (var t = 0; t < 4; t++) {
      if (!S.stageStats[t]) S.stageStats[t] = { c: 0, t: 0 };
      S.stageStats[t].c += flow.tally[t].c;
      S.stageStats[t].t += flow.tally[t].t;
    }
    save();

    sfx('win');

    var before = flow.achBefore || [];
    renderAll();
    var after = unlockedIds();
    var fresh = after.filter(function (id) { return before.indexOf(id) === -1; });

    $('#stageSteps').innerHTML = STAGES.map(function (s) {
      return '<div class="step done"><i>✓</i>' + s.title + '</div>';
    }).join('');
    $('#stageSteps').style.display = 'none';
    $('#stageBar').firstElementChild.style.width = '100%';
    $('#stageCount').textContent = 'Урок пройден';

    var c = CONTENT[flow.id];
    $('#stageCard').innerHTML =
      '<div class="result">' +
        '<div class="result-ico"><svg><use href="#i-trophy"/></svg></div>' +
        '<div class="result-mascot"><img src="' + (window.SAKHA_IMG && window.SAKHA_IMG.face || '') + '" alt="Кыыс Куо">' +
          '<span>Кыыс Куо гордится тобой!</span></div>' +
        '<h3>Урок пройден!</h3>' +
        '<p>«' + esc(c.title) + '» · ' + esc(group().name) + '</p>' +
        '<div class="result-stats">' +
          '<div><b>' + score + '%</b><span>точность</span></div>' +
          '<div><b>+' + gain + '</b><span>XP</span></div>' +
          '<div><b>' + doneCount() + '/' + lessonTotal() + '</b><span>уроков</span></div>' +
        '</div>' +
        '<div class="result-actions">' +
          '<button class="btn" id="resNext">' + (doneCount() < 3 ? 'Следующий урок →' : 'К урокам →') + '</button>' +
          '<button class="ghost" id="resAgain">Пройти заново</button>' +
        '</div>' +
      '</div>';

    setFooter('Дальше', false, true);
    $('#btnNext').disabled = true;
    $('#btnNext').style.display = 'none';
    $('#btnBack').style.display = 'none';

    $('#resAgain').onclick = function () { $('#btnNext').style.display = ''; $('#btnBack').style.display = ''; startLesson(flow.id); };
    $('#resNext').onclick = function () {
      var nextId = allLessonIds().filter(function (id) { return id > flow.id; })[0];
      if (doneCount() < 3 && nextId) startLesson(nextId);
      else { restoreFoot(); App.go('lessons'); }
    };

    fresh.forEach(function (id, i) {
      var a = ACHS.filter(function (x) { return x.id === id; })[0];
      setTimeout(function () { App.toast('Новое достижение: ' + a.title); sfx('ach'); }, 600 + i * 1200);
    });
    if (!fresh.length) setTimeout(function () { App.toast('+' + gain + ' XP · прогресс сохранён'); }, 400);
  }

  function restoreFoot() {
    $('#btnNext').style.display = '';
    $('#btnBack').style.display = '';
  }

  $('#btnBack').onclick = function () {
    if (flow && flow.i > 0 && flow.i < flow.steps.length) { flow.i--; restoreFoot(); renderStep(); }
    else { restoreFoot(); App.go('lessons'); }
  };

  document.addEventListener('click', function (e) {
    var card = e.target.closest('.lesson[data-lesson]');
    if (card) { e.preventDefault(); startLesson(+card.dataset.lesson); }
    var hero = e.target.closest('#heroStart');
    if (hero) { e.preventDefault(); startLesson(firstUndone()); }
  });

  /* ------------------------- онбординг ------------------------- */
  function showOnboard() {
    var m = $('#onboard'); if (!m) return;
    m.classList.add('show');
    var opts = $$('.age-opt', m), go = $('#ageGo'), chosen = null;
    opts.forEach(function (o) {
      o.addEventListener('click', function () {
        opts.forEach(function (x) { x.classList.remove('sel'); });
        o.classList.add('sel'); chosen = o; go.disabled = false;
      });
    });
    go.onclick = function () {
      if (!chosen) return;
      S.group = chosen.dataset.group; S.ageLabel = chosen.dataset.label; S.age = 1;
      save(); m.classList.remove('show'); renderAll();
      App.toast('Задания подстроены: ' + group().name);
    };
  }

  /* ------------------------- демо-прогресс / сброс ------------------------- */
  function seedDemo() {
    var d = new Date(), days = [];
    for (var i = 4; i >= 0; i--) { var x = new Date(d); x.setDate(d.getDate() - i); days.push(iso(x)); }
    S.days = days; S.streak = calcStreak(days);
    S.xp = 350; S.xpToday = 50;
    S.completed = { 1: 100, 2: 80 };
    S.xpByDay = {}; days.forEach(function (d, i) { S.xpByDay[d] = [40, 55, 30, 70, 50][i] || 30; });
    S.stageStats = { 0: { c: 22, t: 25 }, 1: { c: 17, t: 18 }, 2: { c: 9, t: 12 }, 3: { c: 14, t: 18 } };
    S.known = S.known || {};
    CONTENT[1].words.forEach(function (w) { S.known['1:' + w.y] = 'know'; });
    CONTENT[2].words.slice(0, 4).forEach(function (w) { S.known['2:' + w.y] = 'know'; });
    save(); renderAll();
    App.toast('Демо-прогресс заполнен: серия 5 дней, 2 урока');
  }
  function resetAll() {
    S = freshState(); S.streak = calcStreak(S.days); save(); renderAll();
    App.toast('Прогресс сброшен');
  }

  /* ===================== виджет слова ===================== */
  var WW = [];
  Object.keys(CONTENT).forEach(function (id) {
    CONTENT[id].words.forEach(function (w) { WW.push({ y: w.y, ru: w.ru, l: +id }); });
  });
  var SLOT = 2 * 60 * 60 * 1000;   // слово меняется каждые 2 часа
  var wOffset = 0, wSlot = Math.floor(Date.now() / SLOT);

  function slotIndex() { return Math.floor(Date.now() / SLOT) % WW.length; }
  function currentWord() { return WW[(slotIndex() + wOffset) % WW.length]; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function widgetCard(w) {
    return '<div class="widget-card">' +
      '<div class="widget-brand">Саха тыл</div>' +
      '<div class="widget-word">' + esc(w.y) + '</div>' +
      '<div class="widget-tr">' + esc(w.ru) + '</div>' +
      '<div class="widget-line"></div>' +
      '<div class="widget-foot"><small>меняется каждые 2 часа</small>' +
        '<button class="widget-sound" data-speak="' + esc(w.y) + '" data-lang="sah" aria-label="Слушать"><svg><use href="#i-sound"/></svg></button>' +
      '</div></div>';
  }
  function widgetMini(w, wide) {
    return '<div class="widget-brand">Саха тыл</div>' +
      '<div class="widget-word">' + esc(w.y) + '</div>' +
      '<div class="widget-line"></div>' +
      '<div class="widget-tr">' + esc(w.ru) + '</div>' +
      '<div class="widget-foot"><small>' + (wide ? 'меняется каждые 2 часа' : '2 ч') + '</small>' +
        '<button class="widget-sound" data-speak="' + esc(w.y) + '" data-lang="sah" aria-label="Слушать"><svg><use href="#i-sound"/></svg></button>' +
      '</div>';
  }

  function renderWidget() {
    var w = currentWord(); if (!w) return;
    var p = $('#widgetPreview'); if (p) p.innerHTML = widgetCard(w);
    var sm = $('#widgetSmall'); if (sm) sm.innerHTML = widgetMini(w, false);
    var wd = $('#widgetWide'); if (wd) wd.innerHTML = widgetMini(w, true);
    var nw = $('#nowWord'); if (nw) nw.textContent = w.y;
    var nt = $('#nowTr'); if (nt) nt.textContent = w.ru;
    var tag = $('#wLessonTag'); if (tag) tag.textContent = 'Урок ' + w.l;
    var row = $('.speak-row');
    if (row) {
      var sah = row.querySelector('[data-lang="sah"]'), ru = row.querySelector('[data-lang="ru"]');
      if (sah) sah.dataset.speak = w.y;
      if (ru) ru.dataset.speak = w.ru;
    }
    updateCountdown();
  }

  function updateCountdown() {
    var ms = SLOT - (Date.now() % SLOT);
    var h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s2 = Math.floor((ms % 60000) / 1000);
    var el = $('#wCountdown');
    if (el) el.textContent = 'до смены ' + (h ? h + ':' : '') + pad2(m) + ':' + pad2(s2);
    var slot = Math.floor(Date.now() / SLOT);
    if (slot !== wSlot) { wSlot = slot; wOffset = 0; renderWidget(); }
  }

  function roundRect(x, px, py, w2, h2, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w2, py, px + w2, py + h2, r);
    x.arcTo(px + w2, py + h2, px, py + h2, r);
    x.arcTo(px, py + h2, px, py, r);
    x.arcTo(px, py, px + w2, py, r);
    x.closePath();
  }

  function downloadWidget() {
    var w = currentWord(); if (!w) return;
    var size = 1080, cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    var x = cv.getContext('2d');
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';

    function draw() {
      x.fillStyle = dark ? '#151c2d' : '#f7f8fb';
      x.fillRect(0, 0, size, size);
      roundRect(x, 44, 44, size - 88, size - 88, 64);
      x.strokeStyle = dark ? 'rgba(255,255,255,.09)' : 'rgba(40,60,110,.09)';
      x.lineWidth = 3; x.stroke();

      x.textAlign = 'center';
      x.fillStyle = dark ? '#8d9ab7' : '#8b94aa';
      x.font = '700 26px Montserrat, sans-serif';
      x.fillText('С А Х А   Т Ы Л', size / 2, 318);

      var wordSize = w.y.length > 14 ? 62 : (w.y.length > 10 ? 76 : 96);
      x.fillStyle = dark ? '#e9eefb' : '#1f2b47';
      x.font = '600 ' + wordSize + 'px Montserrat, sans-serif';
      x.fillText(w.y, size / 2, 580);

      x.fillStyle = dark ? '#9aa7c2' : '#7b87a3';
      x.font = '500 40px Montserrat, sans-serif';
      x.fillText(w.ru, size / 2, 656);

      x.strokeStyle = dark ? 'rgba(255,255,255,.14)' : 'rgba(40,60,110,.14)';
      x.lineWidth = 2;
      x.beginPath(); x.moveTo(size / 2 - 120, 720); x.lineTo(size / 2 + 120, 720); x.stroke();

      x.fillStyle = dark ? '#7b87a3' : '#9aa3b8';
      x.font = '500 26px Montserrat, sans-serif';
      x.fillText('меняется каждые 2 часа', size / 2, 780);

      var a = document.createElement('a');
      a.download = 'sakha-widget.png';
      a.href = cv.toDataURL('image/png');
      a.click();
      App.toast('Картинка виджета сохранена');
    }

    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(draw); } else { draw(); }
  }

  /* ------------------------- общий рендер ------------------------- */
  function renderAll() {
    renderHome(); renderAchievements(); renderLessonCards(); renderProgressPage(); renderWords(); renderFav(); renderWidget(); renderAlphabet();
  }

  /* перерисовка содержимого страницы при каждом переходе */
  window.__afterGo = function (name) {
    if (name === 'home') renderHome();
    else if (name === 'lessons') renderLessonCards();
    else if (name === 'progress') renderProgressPage();
    else if (name === 'achieve') renderAchievements();
    else if (name === 'words') renderWords();
    else if (name === 'widget') renderWidget();
    else if (name === 'alphabet') renderAlphabet();
    hideMascot();
    App.animateDonuts();
  };


  /* ------------------------- алфавит ------------------------- */
  var LOAN = { 'в': 1, 'ж': 1, 'з': 1, 'ф': 1, 'ц': 1, 'ш': 1, 'щ': 1 };
  var ALPHABET = [
    { key: 'vowels', title: 'Гласные · 8', note: 'Поются, преграды для воздуха нет. Долгота меняет смысл слова.', items: [
      { b: 'А', s: 'а', hint: 'как «а» в «мама»' },
      { b: 'Э', s: 'э', hint: 'как «э» в «это»' },
      { b: 'И', s: 'и', hint: 'как «и» в «ива»' },
      { b: 'О', s: 'о', hint: 'как «о» в «он»' },
      { b: 'Ө', s: 'ө', hint: '«о» с губами как при «у» — нем. ö' },
      { b: 'У', s: 'у', hint: 'как «у» в «утро»' },
      { b: 'Ү', s: 'ү', hint: '«у» с губами как при «и» — нем. ü' },
      { b: 'Ы', s: 'ы', hint: 'как «ы» в «сын»' }
    ] },
    { key: 'long', title: 'Долгие гласные · 8', note: 'На письме — удвоение. Звучат вдвое дольше: кыс «строгать» — кыыс «девушка».', items: [
      { b: 'Аа', s: 'аа', hint: 'долгое «а»: аат — имя' },
      { b: 'Ээ', s: 'ээ', hint: 'долгое «э»: ээ, сөп' },
      { b: 'Ии', s: 'ии', hint: 'долгое «и»: ийэ — мать' },
      { b: 'Оо', s: 'оо', hint: 'долгое «о»: оонньуу — игра' },
      { b: 'Өө', s: 'өө', hint: 'долгое «ө»: күөл — озеро' },
      { b: 'Уу', s: 'уу', hint: 'долгое «у»: уу — вода' },
      { b: 'Үү', s: 'үү', hint: 'долгое «ү»: үүн — расти' },
      { b: 'Ыы', s: 'ыы', hint: 'долгое «ы»: кыыс — девушка' }
    ] },
    { key: 'diph', title: 'Дифтонги · 4', note: 'Слитное произношение двух гласных в одном слоге. Отдельными буквами не считаются.', items: [
      { b: 'Ыа', s: 'ыа', hint: '«ы» + краткое «а»: ыас — роса' },
      { b: 'Иэ', s: 'иэ', hint: 'похоже на «э» в «мел», но с отчётливым «и»' },
      { b: 'Уо', s: 'уо', hint: '«у» + «о»: уол — мальчик' },
      { b: 'Үө', s: 'үө', hint: 'похоже на «ё» в «лёд»: күөл — озеро' }
    ] },
    { key: 'cons', title: 'Согласные · 26', note: 'Произносятся отрывисто: воздух встречает преграду.', items: [
      { b: 'Б', s: 'б', hint: 'как «б»' },
      { b: 'В', s: 'в', hint: 'только в заимствованиях' },
      { b: 'Г', s: 'г', hint: 'как «г»' },
      { b: 'Ҕ', s: 'ҕ', hint: 'фрикативное «г» — с придыханием, мягче' },
      { b: 'Д', s: 'д', hint: 'как «д»' },
      { b: 'Дь', s: 'дь', hint: 'сверхмягкое «дь»' },
      { b: 'Ж', s: 'ж', hint: 'только в заимствованиях' },
      { b: 'З', s: 'з', hint: 'только в заимствованиях' },
      { b: 'Й', s: 'й', hint: 'как «й» в «йод»' },
      { b: 'К', s: 'к', hint: 'как «к»' },
      { b: 'Л', s: 'л', hint: 'как «л»' },
      { b: 'М', s: 'м', hint: 'как «м»' },
      { b: 'Н', s: 'н', hint: 'как «н»' },
      { b: 'Ҥ', s: 'ҥ', hint: 'заднеязычное «н», как «нг» в «ринг»' },
      { b: 'Нь', s: 'нь', hint: 'сверхмягкое «нь»' },
      { b: 'П', s: 'п', hint: 'как «п»' },
      { b: 'Р', s: 'р', hint: 'как «р»' },
      { b: 'С', s: 'с', hint: 'как «с»' },
      { b: 'Һ', s: 'һ', hint: 'лёгкий выдох, как англ. h' },
      { b: 'Т', s: 'т', hint: 'как «т»' },
      { b: 'Ф', s: 'ф', hint: 'только в заимствованиях' },
      { b: 'Х', s: 'х', hint: 'как «х»' },
      { b: 'Ц', s: 'ц', hint: 'только в заимствованиях' },
      { b: 'Ч', s: 'ч', hint: 'как «ч»' },
      { b: 'Ш', s: 'ш', hint: 'только в заимствованиях' },
      { b: 'Щ', s: 'щ', hint: 'только в заимствованиях' }
    ] },
    { key: 'signs', title: 'Знаки · 2', note: 'Звука не дают, показывают твёрдость и мягкость.', items: [
      { b: 'Ъ', s: 'ъ', hint: 'твёрдый знак' },
      { b: 'Ь', s: 'ь', hint: 'мягкий знак' }
    ] }
  ];
  var abcFilter = 'all';
  function renderAlphabet() {
    var box = $('#alphabetBody'); if (!box) return;
    var groups = ALPHABET.filter(function (g) {
      if (abcFilter === 'all') return true;
      if (abcFilter === 'vowels') return g.key === 'vowels';
      if (abcFilter === 'long') return g.key === 'long';
      if (abcFilter === 'diph') return g.key === 'diph';
      if (abcFilter === 'cons') return g.key === 'cons' || g.key === 'signs';
      return true;
    });
    box.innerHTML = groups.map(function (g) {
      return '<div class="card abc-card">' +
        '<div class="abc-head"><h3>' + esc(g.title) + '</h3><span>' + esc(g.note) + '</span></div>' +
        '<div class="abc-grid">' + g.items.map(function (it) {
          return '<button class="abc-tile' + (LOAN[it.s] ? ' loan' : '') + '"' +
            ' data-say="' + esc(it.s) + '" data-tr="' + esc(it.hint) + '" data-lang="sah"' +
            ' title="' + esc(it.hint) + '">' +
            '<svg class="tile-snd"><use href="#i-sound"/></svg>' +
            '<b>' + esc(it.b) + '</b><small>' + esc(it.s) + '</small></button>';
        }).join('') + '</div></div>';
    }).join('');
  }
  $$('#abcFilters [data-abc]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      abcFilter = btn.dataset.abc;
      $$('#abcFilters [data-abc]').forEach(function (b) { b.classList.toggle('active', b === btn); });
      renderAlphabet();
      sfx('tap');
    });
  });

  /* ------------------------- инициализация ------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    // выставляем иконки текущей группы
    renderAll();

    var sel = $('#ageSelect');
    if (sel) {
      sel.value = S.group || 'teen';
      sel.addEventListener('change', function () {
        S.group = sel.value;
        S.ageLabel = GROUPS[sel.value].label;
        S.age = 1; save(); renderAll();
        App.toast('Режим: ' + group().name);
      });
    }
    var snd = $('#soundToggle');
    if (snd) {
      snd.classList.toggle('on', S.sound !== false);
      snd.addEventListener('click', function () {
        S.sound = snd.classList.contains('on');
        save();
        if (S.sound) sfx('ok');
      });
    }
    fillVoiceSelect();
    window.__sakha = { S: S, stats: learnedStats, knownCount: knownCount, speak: speak, recorded: recorded, audio: function () { return audioEl; },
                    phon: respell, phonCode: phonCodeFor, voices: voicesFor };
    var rateSel = $('#rateSelect');
    if (rateSel) {
      rateSel.value = String(S.voiceRate || 0.9);
      rateSel.addEventListener('change', function () {
        S.voiceRate = parseFloat(rateSel.value) || 0.9; save();
        speak('Үтүө күн', 'sah');
        App.toast('Скорость озвучки: ' + (S.voiceRate < 0.8 ? 'медленно' : (S.voiceRate > 1 ? 'быстро' : 'средне')));
      });
    }
    var ttsSel = $('#ttsSelect');
    if (ttsSel) {
      ttsSel.value = phonPref() === 'auto' ? 'auto' : phonPref();
      ttsSel.addEventListener('change', function () {
        S.ttsLang = ttsSel.value; cachedVoice = null; save();
        var code = phonCodeFor('Үтүө күн');
        speak('Үтүө күн', 'sah');
        App.toast('Звуки якутского: ' + (PHON_LANGS[code] ? PHON_LANGS[code].label : 'русский голос'));
      });
    }
    var voiceSel = $('#voiceSelect');
    if (voiceSel) {
      voiceSel.addEventListener('change', function () {
        S.voiceURI = voiceSel.value; cachedVoice = null; save();
        speak('Үтүө күн', 'sah');
      });
    }
    var wNext = $('#wNext');
    if (wNext) wNext.onclick = function () { wOffset = (wOffset + 1) % WW.length; renderWidget(); };
    var wDown = $('#wDownload');
    if (wDown) wDown.onclick = downloadWidget;
    setInterval(updateCountdown, 1000);

    var demo = $('#demoBtn'); if (demo) demo.onclick = seedDemo;
    var reset = $('#resetBtn'); if (reset) reset.onclick = resetAll;
    var change = $('#changeAge'); if (change) change.onclick = showOnboard;

    if (!S.age) setTimeout(showOnboard, 500);
  });

  /* фильтры словаря по урокам */
  /* факты о Якутии: фильтр по категориям */
  var ff = $('#factFilters');
  if (ff) {
    $$('.filter', ff).forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.filter', ff).forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var cat = btn.dataset.fcat;
        $$('#factGrid .fact-card').forEach(function (c) {
          c.style.display = (cat === 'all' || c.dataset.cat === cat) ? '' : 'none';
        });
      });
    });
  }

  /* словарь русский → якутский: поиск и категории */
  function renderDictFilters() {
    var box = $('#dictFilters'); if (!box) return;
    var cats = $$('#dictList .dgroup').map(function (g) { return $('h4', g).textContent; });
    box.innerHTML = ['Все'].concat(cats).map(function (c, i) {
      return '<button class="filter' + (i === 0 ? ' active' : '') + '" data-dcat="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
  }
  var dictCat = 'Все';
  function applyDict() {
    var box = $('#dictList'); if (!box) return;
    var q = ($('#dictQuery') && $('#dictQuery').value || '').toLowerCase().trim();
    var shownRows = 0;
    $$('.dgroup', box).forEach(function (g) {
      var title = $('h4', g).textContent;
      var catOk = dictCat === 'Все' || dictCat === title;
      var any = false;
      $$('.drow', g).forEach(function (r) {
        var hay = (r.dataset.search || '').toLowerCase();
        var ok = catOk && (!q || hay.indexOf(q) > -1);
        r.style.display = ok ? '' : 'none';
        if (ok) { any = true; shownRows++; }
      });
      g.style.display = any ? '' : 'none';
    });
    var cnt = $('#dictCount');
    if (cnt) cnt.textContent = q || dictCat !== 'Все'
      ? 'Найдено ' + shownRows + ' из ' + $$('#dictList .drow').length + ' слов'
      : 'Русский → якутский · ' + $$('#dictList .drow').length + ' слов с озвучкой';
    var empty = $('#dictEmpty'); if (empty) empty.style.display = shownRows ? 'none' : 'block';
  }
  renderDictFilters();
  var dictBox = $('#dictFilters');
  if (dictBox) {
    dictBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dcat]'); if (!b) return;
      $$('.filter', dictBox).forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      dictCat = b.dataset.dcat;
      applyDict();
    });
  }
  var dictQ = $('#dictQuery');
  if (dictQ) dictQ.addEventListener('input', applyDict);
  var dictClear = $('#dictClear');
  if (dictClear) dictClear.addEventListener('click', function () {
    if (dictQ) dictQ.value = '';
    dictCat = 'Все';
    $$('#dictFilters .filter').forEach(function (x, i) { x.classList.toggle('active', i === 0); });
    applyDict();
  });
  applyDict();

  var wf = $('#wordFilters');
  if (wf) {
    $$('.filter', wf).forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.filter', wf).forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        wordTab = btn.dataset.l;
        applyWordFilters();
      });
    });
  }

  /* поиск по словарю */
  var q = $('#search');
  if (q) {
    q.addEventListener('input', function () { applyWordFilters(); });
  }

  // экспорт для отладки
  window.Sakha = { state: function () { return S; }, startLesson: startLesson, renderAll: renderAll };
})();
