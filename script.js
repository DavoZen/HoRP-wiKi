// HoRP-wiKi - Повністю автоматична система з GitHub API
class WikiEngine {
    constructor() {
        this.repoOwner = 'pisdukblaty';
        this.repoName = 'HoRP-wiKi';
        this.branch = 'main';
        this.baseUrl = `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/${this.branch}`;
        this.apiBaseUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents`;
        this.pages = [];
        this.structure = {};
        this.lastScan = null;
        
        // Ініціалізація
        this.init();
    }

    async init() {
        // Лічильник відвідувачів
        this.updateVisitCounter();
        
        // Спроба завантажити з кешу
        if (this.loadFromCache()) {
            this.buildNavigation();
            this.updateQuickStats();
            this.updateLastScanTime();
        }

        // Автоматичне сканування репозиторію
        await this.scanRepository();

        // Обробка початкового URL
        this.handleInitialUrl();
        
        // Налаштування пошукових підказок
        this.setupSearchSuggestions();
    }

    updateVisitCounter() {
        if (!localStorage.visitCount) localStorage.visitCount = 0;
        localStorage.visitCount++;
        document.getElementById('pageCounter').textContent = 
            `Відвідувачів: ${localStorage.visitCount}`;
    }

    // Автоматичне сканування GitHub репозиторію
    async scanRepository() {
        this.showLoading('navMenu', '🔄 Сканування структури GitHub...');
        
        try {
            // Отримуємо вміст папки pages
            const pagesData = await this.fetchGitHubContents('pages');
            this.structure = await this.buildStructure(pagesData, 'pages');
            this.pages = this.extractPagesFromStructure(this.structure);
            
            this.buildNavigation();
            this.updateQuickStats();
            this.lastScan = new Date();
            this.updateLastScanTime();
            
            // Кешуємо дані
            this.cacheData();
            
            this.showSuccess('navMenu', '✅ Структура оновлена!');
            
        } catch (error) {
            console.error('Помилка сканування:', error);
            this.showError('navMenu', '❌ Помилка сканування GitHub');
        }
    }

    // Отримання вмісту папки з GitHub API
    async fetchGitHubContents(path) {
        const response = await fetch(`${this.apiBaseUrl}/${path}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    }

    // Рекурсивна побудова структури
    async buildStructure(contents, currentPath) {
        const node = {
            name: currentPath.split('/').pop() || 'pages',
            path: currentPath,
            type: 'folder',
            children: []
        };

        for (const item of contents) {
            if (item.type === 'dir') {
                // Рекурсивно обробляємо підпапку
                const subContents = await this.fetchGitHubContents(item.path);
                const subNode = await this.buildStructure(subContents, item.path);
                node.children.push(subNode);
            } else if (item.type === 'file' && item.name.endsWith('.md')) {
                // Додаємо Markdown файл
                node.children.push({
                    name: item.name.replace('.md', ''),
                    path: item.path,
                    type: 'file',
                    url: item.download_url,
                    size: item.size
                });
            }
        }

        return node;
    }

    // Вилучення всіх сторінок з структури
    extractPagesFromStructure(structure) {
        const pages = [];
        
        function traverse(node) {
            if (node.type === 'file') {
                pages.push({
                    title: node.name,
                    path: node.path.replace('pages/', '').replace('.md', ''),
                    url: node.url,
                    size: node.size
                });
            } else if (node.children) {
                node.children.forEach(traverse);
            }
        }
        
        traverse(structure);
        return pages;
    }

    // Побудова навігації
    buildNavigation() {
        const navElement = document.getElementById('navMenu');
        navElement.innerHTML = this.buildNavigationHTML(this.structure);
    }

    buildNavigationHTML(node, level = 0) {
        if (node.type === 'file') {
            return `
                <div class="nav-item nav-page" style="margin-left: ${level * 15}px">
                    <a href="#" onclick="wiki.loadPage('${node.path.replace('pages/', '').replace('.md', '')}')">
                        ${node.name}
                    </a>
                </div>
            `;
        }

        let html = '';
        const displayName = node.name === 'pages' ? '📂 Корінь' : `📁 ${node.name}`;
        
        if (level === 0) {
            // Коренева папка
            html += `<div class="nav-folder">${displayName}</div>`;
            if (node.children && node.children.length > 0) {
                html += `<div class="folder-contents">`;
                node.children.forEach(child => {
                    html += this.buildNavigationHTML(child, level + 1);
                });
                html += `</div>`;
            }
        } else {
            // Вкладені папки
            html += `
                <div class="nav-item nav-folder" style="margin-left: ${(level - 1) * 15}px">
                    ${displayName}
                </div>
            `;
            if (node.children && node.children.length > 0) {
                html += `<div class="folder-contents">`;
                node.children.forEach(child => {
                    html += this.buildNavigationHTML(child, level + 1);
                });
                html += `</div>`;
            }
        }

        return html;
    }

    // Завантаження сторінки
    async loadPage(pagePath) {
        this.showMainContent('articleContent');
        this.showLoading('articleContent', '📖 Завантаження сторінки...');

        try {
            const page = this.pages.find(p => p.path === pagePath);
            if (!page) throw new Error('Сторінку не знайдено');

            const response = await fetch(page.url);
            if (!response.ok) throw new Error('Помилка завантаження');

            const markdown = await response.text();
            const html = this.convertMarkdownToHtml(markdown);

            document.getElementById('articleContent').innerHTML = `
                <div class="article-nav">
                    🏠 <a href="#" onclick="wiki.showMainPage()">Головна</a> › 
                    ${this.generateBreadcrumbs(pagePath)}
                </div>
                <div class="article-content">
                    ${html}
                </div>
                <div class="article-nav">
                    <small>📝 Останнє оновлення: ${new Date().toLocaleDateString('uk-UA')}</small>
                </div>
            `;

            this.updateUrl(`?page=${pagePath}`);
            this.highlightSearchTerms();

        } catch (error) {
            document.getElementById('articleContent').innerHTML = `
                <div class="article-content">
                    <h1>❌ Помилка 404</h1>
                    <p>Статтю "<b>${pagePath}</b>" не знайдено в репозиторії.</p>
                    <p>🔍 <a href="#" onclick="wiki.showAllPages()">Переглянути всі доступні сторінки</a></p>
                </div>
            `;
        }
    }

    // Конвертація Markdown в HTML
    convertMarkdownToHtml(markdown) {
        return markdown
            // Заголовки
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Жирний текст
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Курсив
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Код
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Блоки коду
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre>$2</pre>')
            // Зображення
            .replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
                const fullSrc = src.startsWith('http') ? src : `${this.baseUrl}/${src}`;
                return `<img src="${fullSrc}" alt="${alt}" style="max-width:100%">`;
            })
            // Зовнішні посилання
            .replace(/\[(.*?)\]\((http.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
            // Внутрішні посилання (вікі-синтаксис)
            .replace(/\[\[(.*?)\]\]/g, (match, pageName) => {
                const foundPage = this.pages.find(p => 
                    p.title === pageName || p.path === pageName
                );
                return foundPage ? 
                    `<a href="#" onclick="wiki.loadPage('${foundPage.path}')" class="wiki-link">${pageName}</a>` :
                    `<span class="broken-link" title="Сторінка не знайдена">${pageName}</span>`;
            })
            // Горизонтальна лінія
            .replace(/^-{3,}$/gim, '<hr>')
            // Списки
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            // Абзаци
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
    }

    // Генерація хлібних крихт
    generateBreadcrumbs(pagePath) {
        const parts = pagePath.split('/');
        let breadcrumbs = '';
        let currentPath = '';

        parts.forEach((part, index) => {
            currentPath += (currentPath ? '/' : '') + part;
            const isLast = index === parts.length - 1;

            if (isLast) {
                breadcrumbs += `<strong>${part}</strong>`;
            } else {
                breadcrumbs += `<a href="#" onclick="wiki.loadPage('${currentPath}')">${part}</a> › `;
            }
        });

        return breadcrumbs;
    }

    // Пошук
    async performSearch() {
        const query = document.getElementById('searchBox').value || 
                     document.getElementById('mainSearchBox').value;

        if (!query.trim()) {
            this.showMainPage();
            return;
        }

        this.showMainContent('searchResults');
        this.showLoading('searchResults', '🔍 Пошук...');

        // Невелика затримка для анімації
        await new Promise(resolve => setTimeout(resolve, 600));

        const results = await this.searchPages(query);
        this.displaySearchResults(results, query);
    }

    async searchPages(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        // Шукаємо в назвах сторінок
        const titleResults = this.pages.filter(page => 
            page.title.toLowerCase().includes(lowerQuery)
        );

        // Шукаємо в контенті сторінок (обмежено кількістю)
        const contentResults = [];
        for (const page of this.pages.slice(0, 20)) { // Обмежуємо для продуктивності
            try {
                const response = await fetch(page.url);
                const content = await response.text();
                
                if (content.toLowerCase().includes(lowerQuery)) {
                    contentResults.push({
                        ...page,
                        excerpt: this.generateExcerpt(content, query),
                        matchType: 'content'
                    });
                }
            } catch (error) {
                console.error('Помилка пошуку в сторінці:', page.title);
            }
        }

        // Об'єднуємо результати
        results.push(...titleResults.map(p => ({...p, matchType: 'title', excerpt: ''})));
        
        // Додаємо контент результати, яких ще немає
        contentResults.forEach(contentResult => {
            if (!results.some(r => r.path === contentResult.path)) {
                results.push(contentResult);
            }
        });

        // Сортуємо: спочатку збіг у назві, потім у контенті
        return results.sort((a, b) => {
            if (a.matchType === 'title' && b.matchType !== 'title') return -1;
            if (a.matchType !== 'title' && b.matchType === 'title') return 1;
            return 0;
        });
    }

    generateExcerpt(content, query) {
        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerContent.indexOf(lowerQuery);
        
        if (index === -1) return content.substring(0, 150) + '...';
        
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + 100);
        let excerpt = content.substring(start, end);
        
        // Підсвічування
        const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
        excerpt = excerpt.replace(regex, '<span class="highlight">$1</span>');
        
        return (start > 0 ? '...' : '') + excerpt + (end < content.length ? '...' : '');
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    displaySearchResults(results, query) {
        let html = `
            <div class="article-content">
                <h1>🔍 Результати пошуку</h1>
                <p>Запит: "<strong>${query}</strong>"</p>
                <p>Знайдено: <strong>${results.length}</strong> результатів</p>
        `;

        if (results.length === 0) {
            html += `
                <div class="search-result">
                    <h3>😔 Нічого не знайдено</h3>
                    <p>Спробуйте:</p>
                    <ul>
                        <li>Перевірити правопис</li>
                        <li>Використовувати інші ключові слова</li>
                        <li><a href="#" onclick="wiki.showAllPages()">Переглянути всі сторінки</a></li>
                    </ul>
                </div>
            `;
        } else {
            results.forEach(result => {
                const icon = result.matchType === 'title' ? '📌' : '📄';
                html += `
                    <div class="search-result" onclick="wiki.loadPage('${result.path}')">
                        <h3>${icon} ${result.title}</h3>
                        ${result.excerpt ? `<div class="excerpt">${result.excerpt}</div>` : ''}
                        <small>📍 Шлях: ${result.path}</small>
                    </div>
                `;
            });
        }

        html += '</div>';
        document.getElementById('searchResults').innerHTML = html;
        
        this.updateUrl(`?search=${encodeURIComponent(query)}`);
    }

    // Всі сторінки
    showAllPages() {
        this.showMainContent('allPages');
        
        let html = `
            <div class="article-content">
                <h1>📚 Всі сторінки</h1>
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-number">${this.pages.length}</span>
                        <span class="stat-label">Всього сторінок</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${this.calculateTotalSize()}</span>
                        <span class="stat-label">КБ контенту</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${this.lastScan ? this.lastScan.toLocaleDateString('uk-UA') : '-'}</span>
                        <span class="stat-label">Останнє сканування</span>
                    </div>
                </div>
                <div class="pages-list">
        `;

        this.pages.forEach(page => {
            html += `
                <div class="search-result" onclick="wiki.loadPage('${page.path}')">
                    <h3>📄 ${page.title}</h3>
                    <small>📍 Шлях: ${page.path} | 📏 Розмір: ${Math.ceil(page.size / 1024)} КБ</small>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
        
        document.getElementById('allPages').innerHTML = html;
    }

    // Статистика
    showStatistics() {
        this.showMainContent('searchResults');
        
        const totalSize = this.calculateTotalSize();
        const categories = this.countCategories();
        
        const html = `
            <div class="article-content">
                <h1>📊 Статистика HoRP-wiKi</h1>
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-number">${this.pages.length}</span>
                        <span class="stat-label">Сторінок</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${categories}</span>
                        <span class="stat-label">Категорій</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${totalSize}</span>
                        <span class="stat-label">КБ контенту</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${localStorage.visitCount || 0}</span>
                        <span class="stat-label">Відвідувачів</span>
                    </div>
                </div>
                <div class="article-nav">
                    <h3>📋 Інформація про систему</h3>
                    <p><strong>Репозиторій:</strong> ${this.repoOwner}/${this.repoName}</p>
                    <p><strong>Гілка:</strong> ${this.branch}</p>
                    <p><strong>Автоматичне сканування:</strong> ✅ Увімкнено</p>
                    <p><strong>Останнє оновлення:</strong> ${this.lastScan ? this.lastScan.toLocaleString('uk-UA') : '-'}</p>
                    <p><a href="https://github.com/${this.repoOwner}/${this.repoName}" target="_blank">📝 Редагувати на GitHub</a></p>
                </div>
            </div>
        `;
        
        document.getElementById('searchResults').innerHTML = html;
    }

    // Допоміжні методи
    calculateTotalSize() {
        return Math.ceil(this.pages.reduce((sum, page) => sum + (page.size || 0), 0) / 1024);
    }

    countCategories() {
        const categories = new Set();
        this.pages.forEach(page => {
            const parts = page.path.split('/');
            if (parts.length > 1) {
                categories.add(parts[0]);
            }
        });
        return categories.size;
    }

    showMainPage() {
        this.showMainContent('mainSearch');
        this.updateUrl('?');
    }

    showMainContent(contentId) {
        document.querySelectorAll('.main-content').forEach(el => {
            el.classList.add('hidden');
        });
        document.getElementById(contentId).classList.remove('hidden');
    }

    showLoading(elementId, message) {
        document.getElementById(elementId).innerHTML = `
            <div class="loading">
                ${message}
            </div>
        `;
    }

    showSuccess(elementId, message) {
        const element = document.getElementById(elementId);
        element.innerHTML = `<div style="color: green; text-align: center;">${message}</div>`;
        setTimeout(() => this.buildNavigation(), 2000);
    }

    showError(elementId, message) {
        document.getElementById(elementId).innerHTML = `
            <div style="color: red; text-align: center;">
                ${message}
            </div>
        `;
    }

    updateQuickStats() {
        document.getElementById('quickStats').innerHTML = `
            📊 <strong>${this.pages.length}</strong> сторінок у <strong>${this.countCategories()}</strong> категоріях<br>
            <small>🕐 Оновлено: ${this.lastScan ? this.lastScan.toLocaleTimeString('uk-UA') : 'щойно'}</small>
        `;
    }

    updateLastScanTime() {
        document.getElementById('lastUpdate').textContent = 
            `Останнє оновлення: ${this.lastScan ? this.lastScan.toLocaleString('uk-UA') : '-'}`;
    }

    // Випадкова сторінка
    showRandomPage() {
        if (this.pages.length > 0) {
            const randomPage = this.pages[Math.floor(Math.random() * this.pages.length)];
            this.loadPage(randomPage.path);
        } else {
            alert('Спочатку потрібно завантажити структуру!');
        }
    }

    // Кешування
    cacheData() {
        const cache = {
            pages: this.pages,
            structure: this.structure,
            lastScan: this.lastScan
        };
        localStorage.setItem('wikiCache', JSON.stringify(cache));
    }

    loadFromCache() {
        const cached = localStorage.getItem('wikiCache');
        if (cached) {
            try {
                const cache = JSON.parse(cached);
                this.pages = cache.pages || [];
                this.structure = cache.structure || {};
                this.lastScan = cache.lastScan ? new Date(cache.lastScan) : null;
                return true;
            } catch (error) {
                console.error('Помилка завантаження з кешу:', error);
            }
        }
        return false;
    }

    // URL management
    updateUrl(params) {
        history.pushState({}, '', params);
    }

    handleInitialUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page');
        const search = urlParams.get('search');

        if (search) {
            document.getElementById('mainSearchBox').value = search;
            setTimeout(() => this.performSearch(), 800);
        } else if (page) {
            this.loadPage(page);
        }
    }

    // Підсвічування пошукових термінів
    highlightSearchTerms() {
        const urlParams = new URLSearchParams(window.location.search);
        const search = urlParams.get('search');
        if (search) {
            setTimeout(() => {
                const elements = document.querySelectorAll('.article-content');
                elements.forEach(el => {
                    const regex = new RegExp(`(${this.escapeRegExp(search)})`, 'gi');
                    el.innerHTML = el.innerHTML.replace(regex, '<span class="highlight">$1</span>');
                });
            }, 100);
        }
    }

    // Підказки пошуку
    setupSearchSuggestions() {
        const searchBox = document.getElementById('searchBox');
        const mainSearchBox = document.getElementById('mainSearchBox');
        const suggestions = document.getElementById('searchSuggestions');

        const setupBox = (box) => {
            box.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                if (query.length < 2) {
                    suggestions.style.display = 'none';
                    return;
                }

                const matchedPages = this.pages
                    .filter(page => page.title.toLowerCase().includes(query))
                    .slice(0, 5);

                if (matchedPages.length > 0) {
                    suggestions.innerHTML = matchedPages.map(page => 
                        `<div class="suggestion-item" onclick="wiki.selectSuggestion('${page.path}')">
                            ${page.title}
                        </div>`
                    ).join('');
                    suggestions.style.display = 'block';
                } else {
                    suggestions.style.display = 'none';
                }
            });

            box.addEventListener('blur', () => {
                setTimeout(() => {
                    suggestions.style.display = 'none';
                }, 200);
            });
        };

        setupBox(searchBox);
        setupBox(mainSearchBox);
    }

    selectSuggestion(path) {
        this.loadPage(path);
        document.getElementById('searchSuggestions').style.display = 'none';
        document.getElementById('searchBox').value = '';
        document.getElementById('mainSearchBox').value = '';
    }
}

// Глобальний екземпляр
const wiki = new WikiEngine();

// Глобальні функції для HTML
function performSearch() { wiki.performSearch(); }
function scanRepository() { wiki.scanRepository(); }
function showMainPage() { wiki.showMainPage(); }
function showAllPages() { wiki.showAllPages(); }
function showRandomPage() { wiki.showRandomPage(); }
function showStatistics() { wiki.showStatistics(); }
