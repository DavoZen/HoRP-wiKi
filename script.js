// Конфігурація
const PAGES_BASE_URL = 'pages';
const IMAGES_BASE_URL = 'images';
const FILES_BASE_URL = 'files';

// Завантаження сторінки
async function loadPage(pagePath) {
    try {
        showLoading();
        
        const response = await fetch(`${PAGES_BASE_URL}/${pagePath}.md`);
        if (!response.ok) throw new Error('Сторінку не знайдено');
        
        const markdown = await response.text();
        const html = await convertMarkdownToHtml(markdown);
        
        document.getElementById('contentArea').innerHTML = `
            <div class="article-content">${html}</div>
        `;
        
        // Оновлюємо URL без перезавантаження сторінки
        history.pushState({page: pagePath}, null, `?page=${pagePath}`);
        
        // Прокручуємо до верху
        window.scrollTo(0, 0);
        
    } catch (error) {
        document.getElementById('contentArea').innerHTML = `
            <div class="error">
                <h1>Помилка 404</h1>
                <p>Сторінку "${pagePath}" не знайдено.</p>
                <p><a href="#" onclick="loadPage('home')">Повернутися на головну</a></p>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

// Конвертація Markdown в HTML (спрощена версія)
async function convertMarkdownToHtml(markdown) {
    let html = markdown;
    
    // Заголовки
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Жирний текст
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Курсив
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Код
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Блоки коду
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    
    // Зображення
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, `<img src="${IMAGES_BASE_URL}/$2" alt="$1">`);
    
    // Посилання
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Внутрішні посилання
    html = html.replace(/\[\[(.*?)\]\]/g, '<a href="#" onclick="loadPage(\'$1\')">$1</a>');
    
    // Списки
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Абзаци
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';
    
    return html;
}

// Пошук
let allPages = [];

async function initSearch() {
    try {
        const response = await fetch(`${PAGES_BASE_URL}/index.json`);
        allPages = await response.json();
    } catch (error) {
        console.error('Помилка завантаження індексу пошуку:', error);
    }
}

function searchPages(query) {
    if (!query.trim()) {
        hideSearchResults();
        return;
    }
    
    const results = allPages.filter(page => 
        page.title.toLowerCase().includes(query.toLowerCase()) ||
        page.content.toLowerCase().includes(query.toLowerCase())
    );
    
    showSearchResults(results);
}

function showSearchResults(results) {
    const container = document.getElementById('searchResults');
    container.innerHTML = '';
    
    if (results.length === 0) {
        container.innerHTML = '<div class="search-result-item">Нічого не знайдено</div>';
    } else {
        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.textContent = result.title;
            item.onclick = () => {
                loadPage(result.path);
                hideSearchResults();
                document.getElementById('searchInput').value = '';
            };
            container.appendChild(item);
        });
    }
    
    container.style.display = 'block';
}

function hideSearchResults() {
    document.getElementById('searchResults').style.display = 'none';
}

// Допоміжні функції
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('contentArea').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('contentArea').style.display = 'block';
}

// Обробка історії браузера
window.onpopstate = function(event) {
    if (event.state && event.state.page) {
        loadPage(event.state.page);
    } else {
        loadPage('home');
    }
};

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    // Завантажуємо індекс для пошуку
    initSearch();
    
    // Обробка пошуку
    document.getElementById('searchInput').addEventListener('input', function(e) {
        searchPages(e.target.value);
    });
    
    // Сховати результати пошуку при кліку поза ними
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-box')) {
            hideSearchResults();
        }
    });
    
    // Завантажити сторінку з URL параметра або головну
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 'home';
    loadPage(page);
});
