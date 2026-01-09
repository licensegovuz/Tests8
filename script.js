// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let user = null;
const savedUser = localStorage.getItem('tgUser');
if (savedUser) user = JSON.parse(savedUser);

// ===== ОПРЕДЕЛЕНИЕ СТРАНИЦЫ =====
// Если на странице есть блок с ID "question", значит мы в test.html
const isTestPage = !!document.getElementById('question'); 
// Если есть блок "app", значит мы в index.html
const app = document.getElementById('app');

// ===== HELPERS (Чтение настроек) =====
function getTimerValue() {
    const custom = parseInt(document.getElementById('custom-timer')?.value);
    const preset = parseInt(document.getElementById('preset-timer')?.value);
    return custom || preset || 30;
}

function getQuestionsCount() {
    const custom = parseInt(document.getElementById('custom-count')?.value);
    const preset = parseInt(document.getElementById('preset-count')?.value);
    return custom || preset || 15;
}

function getSelectedTheme() {
    // Получаем value из выпадающего списка тем (имя файла)
    return document.getElementById('theme-select')?.value || 'tests.json';
}

// ==========================================
// ЛОГИКА ДЛЯ МЕНЮ (INDEX.HTML)
// ==========================================

if (!isTestPage && app) {
    // ===== RENDER LOGIN / MENU =====
    if (user) renderLogged(user); else renderLogin();
}

function renderLogged(user) {
    app.innerHTML = `
<div class="card">
    <h2>Добро пожаловать 👋</h2>
    <p><b>${user.first_name}</b></p>

    <label>📚 Выберите тему</label>
    <div class="row">
        <select id="theme-select">
            <option value="tests1.json">Тема 1</option>
            <option value="tests2.json">Тема 2</option>
            <option value="tests34.json">Темы 3-4</option>
            <option value="tests5.json">Тема 5</option>
            <option value="tests6.json">Тема 6</option>
            <option value="tests7.json">Тема 7</option>
            <option value="tests8.json">Тема 8</option>
            <option value="tests.json" selected>Все темы (Микс)</option>
        </select>
    </div>

    <label>⏱ Время на вопрос (сек)</label>  
    <div class="row">  
        <select id="preset-timer">  
            <option value="10">10</option>  
            <option value="20">20</option>  
            <option value="30" selected>30</option>  
            <option value="60">60</option>  
        </select>  
        <input id="custom-timer" type="number" min="5" placeholder="своё">  
    </div>  

    <label>📝 Количество вопросов</label>  
    <div class="row">  
        <select id="preset-count">
            <option value="1000000000" selected>Все вопросы</option>
            <option value="15">15</option>  
            <option value="25">25</option>  
            <option value="30">30</option>  
            <option value="35">35</option>  
            <option value="50">50</option>  
        </select>  
        <input id="custom-count" type="number" min="1" placeholder="своё">  
    </div>  

    <button class="main" id="startBtn">Начать тест</button>  
</div>`;

    document.getElementById('startBtn').onclick = () => {
        // 1. Сохраняем все настройки
        localStorage.setItem('timer', getTimerValue());
        localStorage.setItem('qCount', getQuestionsCount());
        localStorage.setItem('currentThemeFile', getSelectedTheme()); // Сохраняем имя файла!

        // 2. Переходим на страницу теста
        window.location.href = 'test.html';
    };
}

function renderLogin() {
    app.innerHTML = `
<div class="card">
    <h2>Вход в тест</h2>
    
    <label>📚 Выберите тему</label>
    <div class="row">
        <select id="theme-select">
            <option value="tests1.json">Тема 1</option>
            <option value="tests2.json">Тема 2</option>
            <option value="tests34.json">Темы 3-4</option>
            <option value="tests5.json">Тема 5</option>
            <option value="tests6.json">Тема 6</option>
            <option value="tests7.json">Тема 7</option>
            <option value="tests8.json">Тема 8</option>
            <option value="tests.json" selected>Все темы</option>
        </select>
    </div>

    <label>⏱ Время на вопрос (сек)</label>
    <div class="row">
        <select id="preset-timer">
             <option value="30">30</option>
        </select>
        <input id="custom-timer" placeholder="своё" disabled>
    </div>

    <p class="muted">Авторизация через Telegram</p>  
    <div id="tg-widget"></div>  
</div>`;

    window.onTelegramAuth = function(u) {
        user = { id: u.id, first_name: u.first_name, username: u.username || '' };
        localStorage.setItem('tgUser', JSON.stringify(user));
        // При логине тоже сохраняем текущие выборы, если пользователь их тыкал
        localStorage.setItem('currentThemeFile', getSelectedTheme());
        renderLogged(user);
    };

    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    s.setAttribute('data-telegram-login', 'ChecklistforI0324_bot');
    s.setAttribute('data-size', 'medium');
    s.setAttribute('data-userpic', 'false');
    s.setAttribute('data-request-access', 'write');
    s.setAttribute('data-onauth', 'onTelegramAuth(user)');
    document.getElementById('tg-widget').appendChild(s);
}

// ==========================================
// ЛОГИКА ДЛЯ ТЕСТА (TEST.HTML)
// ==========================================

// Переменные теста
let timeLimit = 30;
let session = null;
let tests = [];
let timer = null;
let timeLeft = 0;
let selected = null;

if (isTestPage) {
    // Если мы на странице test.html, сразу запускаем тест
    startTest();
}

function startTest() {
    // Читаем сохраненные настройки
    timeLimit = parseInt(localStorage.getItem('timer')) || 30;
    const countLimit = parseInt(localStorage.getItem('qCount')) || 15;
    const themeFile = localStorage.getItem('currentThemeFile') || 'tests.json'; // Какой файл грузить

    session = {
        id: `TEST-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        start: Date.now(),
        index: 0,
        score: 0,
        review: false,
        sent: false,
        answers: []
    };

    // Загружаем именно тот файл, который выбрал пользователь
    fetch(themeFile)
        .then(r => {
            if (!r.ok) throw new Error("Файл темы не найден");
            return r.json();
        })
        .then(data => {
            let shuffledQuestions = data.sort(() => Math.random() - 0.5).slice(0, countLimit);

            tests = shuffledQuestions.map(q => {
                const correctText = q.options[q.answer];
                const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
                const newAnswerIndex = shuffledOptions.indexOf(correctText);
                return { ...q, options: shuffledOptions, answer: newAnswerIndex };
            });

            showQuestion();
        })
        .catch(err => {
            alert("Ошибка загрузки теста: " + err.message + "\nПроверьте, существуют ли файлы tests1.json и tests2.json");
            window.location.href = 'index.html';
        });
}

function showQuestion() {
    clearInterval(timer);
    selected = null;

    const q = tests[session.index];
    if (!q) return finish();

    const state = session.answers[session.index] || { selected: null, answered: false, timeout: false };
    selected = state.selected;

    // Рендерим в существующие блоки в test.html
    const qContainer = document.getElementById('question');
    const optionsEl = document.getElementById('options');
    const timerEl = document.getElementById('timer');

    if(!qContainer || !optionsEl) return; // Защита

    qContainer.innerHTML = `
        <div class="progress">
            ${session.review ? `Просмотр ${session.index+1} / ${tests.length}` : `Вопрос ${session.index+1} из ${tests.length}`}
        </div>
        <div>${q.question}</div>
    `;

    optionsEl.innerHTML = '';
    let confirmBtn = null;

    q.options.forEach((text, i) => {
        const btn = document.createElement('button');
        btn.className = 'option';
        btn.textContent = text;

        if (state.answered || state.timeout || session.review) {
            btn.disabled = true;
            if (i === q.answer) btn.classList.add('correct');
            if (state.selected !== null && i === state.selected && i !== q.answer)
                btn.classList.add('wrong');
        } else {
            btn.onclick = () => {
                selected = i;
                optionsEl.querySelectorAll('.option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                if (confirmBtn) confirmBtn.disabled = false;
            };
            if (i === selected) btn.classList.add('selected');
        }
        optionsEl.appendChild(btn);
    });

    if (!state.answered && !state.timeout && !session.review) {
        confirmBtn = document.createElement('button');
        confirmBtn.className = 'main';
        confirmBtn.textContent = 'Ответить';
        confirmBtn.disabled = selected === null;
        confirmBtn.onclick = () => confirmAnswer(false);
        optionsEl.appendChild(confirmBtn);
        startTimer();
    }
    renderNavButtons();
}

function startTimer() {
    timeLeft = timeLimit;
    const t = document.getElementById('timer');
    t.textContent = `⏱ ${timeLeft}`;
    t.className = 'timer';
    t.classList.remove('warning');

    timer = setInterval(() => {
        timeLeft--;
        t.textContent = `⏱ ${timeLeft}`;
        if (timeLeft <= 5) t.classList.add('warning');
        if (timeLeft <= 0) {
            clearInterval(timer);
            confirmAnswer(true);
        }
    }, 1000);
}

function confirmAnswer(fromTimer) {
    clearInterval(timer);
    const q = tests[session.index];
    session.answers[session.index] = {
        selected: fromTimer ? null : selected,
        answered: !fromTimer,
        timeout: fromTimer
    };
    if (!fromTimer && selected === q.answer) session.score++;
    showQuestion();
}

function renderNavButtons() {
    const optionsEl = document.getElementById('options');
    let nav = document.querySelector('.nav-buttons');
    if (!nav) {
        nav = document.createElement('div');
        nav.className = 'nav-buttons';
        optionsEl.appendChild(nav);
    }
    nav.innerHTML = '';
    const state = session.answers[session.index];
    const isLast = session.index === tests.length - 1;

    if (session.index > 0 && (state.answered || state.timeout || session.review)) {
        const prev = document.createElement('button');
        prev.textContent = '←';
        prev.onclick = () => { session.index--; showQuestion(); };
        nav.appendChild(prev);
    }

    if (state && !isLast) {
        const next = document.createElement('button');
        next.textContent = '→';
        next.onclick = () => { session.index++; showQuestion(); };
        nav.appendChild(next);
    }

    if (state && isLast && !session.review) {
        const finishBtn = document.createElement('button');
        finishBtn.className = 'main';
        finishBtn.textContent = 'Завершить тест';
        finishBtn.onclick = finish;
        nav.appendChild(finishBtn);
    }
}

function finish() {
    if (!session.sent) {
        session.sent = true;
        sendStats(Math.floor((Date.now() - session.start) / 1000));
    }
    
    // В test.html мы меняем содержимое карточки
    const card = document.querySelector('.card');
    card.innerHTML = `
        <h2>Тест завершён</h2>
        <p>👤 ${user ? user.first_name : 'Гость'}</p>
        <p>✅ ${session.score}/${tests.length}</p>
        <button class="main" onclick="startReview()">📋 Просмотреть ответы</button>
        <button class="main" onclick="window.location.href='index.html'">🏠 В главное меню</button>
    `;
}

function startReview() {
    session.review = true;
    session.index = 0;
    // Восстанавливаем структуру для просмотра
    const card = document.querySelector('.card');
    card.innerHTML = `<div id="timer"></div><div id="question"></div><div id="options"></div>`;
    showQuestion();
}

function sendStats(totalTime) {
    if(!user) return; // Если не залогинен, не отправляем
    const BOT_TOKEN = '8525833406:AAH5Y-_wIlEY4SZA_sJTvmjrrZJBPY6igvo';
    const ADMIN_ID = '6610925597';

    const answersText = session.answers.map((a, i) => {
        const q = tests[i];
        return `${i+1}. ${q.question}\n✅ ${q.options[q.answer]}\n📝 ${a.selected !== null ? q.options[a.selected] : '—'}`;
    }).join('\n\n');

    const message = `📊 ТЕСТ ЗАВЕРШЁН\n🆔 ${session.id}\n👤 ${user.first_name}\n📂 Файл: ${localStorage.getItem('currentThemeFile')}\n✅ ${session.score}/${tests.length}\n⏱ ${totalTime} сек\n\n${answersText}`;

    function send(fetchUrl, body) {
        fetch(fetchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(r => {
            if (!r.ok) setTimeout(() => send(fetchUrl, body), 1000);
        }).catch(() => setTimeout(() => send(fetchUrl, body), 1000));
    }

    send(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { chat_id: user.id, text: message });
    send(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { chat_id: ADMIN_ID, text: '👑 АДМИН-КОПИЯ\n\n' + message });
}

