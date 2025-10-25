// HoRP-wiKi - Автоматична система з GitHub API
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
        this.isInitialized = false;
        
        console.log('WikiEngine ініціалізовано для репозиторію:', this.repoOwner + '/' + this.repoName);
    }

    async init() {
        console.log('Початок ініціалізації WikiEngine...');
        
        if (this.isInitialized) {
            console.log('WikiEngine вже ініціалізовано');
            return;
        }
        
        // Лічильник відвідувачів
        this.updateVisitCounter();
        
        // Спроба завантажити з кешу
        if (this.loadFromCache()) {
            console.log('Дані завантажено з кешу. Сторінок:', this.pages.length);
            this.buildNavigation();
            this.updateQuickStats();
            this.updateLastScanTime();
        }

        // АВТОМАТИЧНЕ СКАНУВАННЯ ПРИ ЗАВАНТАЖЕННІ
        console.log('Запуск автоматичного сканування...');
        await this.scanRepository();

        // Обробка початкового URL
        this.handleInitialUrl();
        
        this.isInitialized = true;
        console.log('Ініціалізація завершена. Доступно сторінок:', this.pages.length);
    }

    updateVisitCounter() {
        if (!localStorage.visitCount) localStorage.visitCount = 0;
        localStorage.visitCount++;
        const counter = document.getElementById('pageCounter');
        if (counter) {
            counter.textContent = `Відвідувачів: ${localStorage.visitCount}`;
        }
    }

    // Автоматичне сканування GitHub репозиторію
    async scanRepository() {
        console.log('🔍 Початок сканування репозиторію...');
        this.showLoading('navMenu', 'Сканування структури GitHub...');
        
        try {
            // Отримуємо вміст папки pages
            console.log('Отримання вмісту папки pages...');
            const pagesData = await this.fetchGitHubContents('pages');
            console.log('Отримано дані з GitHub:', pagesData);
            
            if (!pagesData || pagesData.length === 0) {
                console.log('Папка pages порожня, спроба отримати кореневі файли...');
                // Спробуємо отримати файли з кореня pages
                const rootFiles = await this.fetchGitHubContents('');
                const mdFiles = rootFiles.filter(item => 
                    item.type === 'file' && item.name.endsWith('.md') && item.name !== 'README.md'
                );
                
                if (mdFiles.length > 0) {
                    console.log('Знайдено .md файли в корені:', mdFiles);
                    this.pages = mdFiles.map(file => ({
                        title: file.name.replace('.md', ''),
                        path: file.name.replace('.md', ''),
                        url: file.download_url,
                        size: file.size
                    }));
                    
                    this.structure = {
                        name: 'pages',
                        path: 'pages',
                        type: 'folder',
                        children: mdFiles.map(file => ({
                            name: file.name.replace('.md', ''),
                            path: file.path,
                            type: 'file',
                            url: file.download_url,
                            size: file.size
                        }))
                    };
                } else {
                    throw new Error('Не знайдено жодного .md файлу в репозиторії');
                }
            } else {
                this.structure = await this.buildStructure(pagesData, 'pages');
                this.pages = this.extractPagesFromStructure(this.structure);
            }
            
            console.log('Структура побудована. Знайдено сторінок:', this.pages.length);
            console.log('Сторінки:', this.pages);
            
            this.buildNavigation();
            this.updateQuickStats();
            this.lastScan = new Date();
            this.updateLastScanTime();
            
            // Кешуємо дані
            this.cacheData();
            
            console.log('✅ Сканування завершено успішно!');
            
        } catch (error) {
            console.error('❌ Помилка сканування:', error);
            this.showError('navMenu', `Помилка: ${error.message}`);
            
            // Спробуємо завантажити тестові дані для демонстрації
            this.loadFallbackData();
        }
    }

    // Отримання вмісту папки з GitHub API
    async fetchGitHubContents(path) {
        const url = `${this.apiBaseUrl}/${path}`;
        console.log(`📡 Запит до GitHub API: ${url}`);
        
        try {
            const response = await fetch(url);
            console.log(`📊 Статус відповіді: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Доступ заборонено. Можливо, перевищено ліміт запитів до GitHub API');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Перевіряємо, чи це масив (вміст папки) або об'єкт (один файл)
            if (Array.isArray(data)) {
                console.log(`✅ Отримано елементів: ${data.length}`);
                return data;
            } else {
                console.log(`✅ Отримано файл: ${data.name}`);
                return [data];
            }
            
        } catch (error) {
            console.error('❌ Помилка отримання даних з GitHub:', error);
            throw error;
        }
    }

    // Рекурсивна побудова структури
    async buildStructure(contents, currentPath) {
        console.log(`📁 Обробка папки: ${currentPath}, елементів: ${contents.length}`);
        
        const node = {
            name: currentPath.split('/').pop() || 'pages',
            path: currentPath,
            type: 'folder',
            children: []
        };

        for (const item of contents) {
            console.log(`📄 Обробка елемента: ${item.name} (${item.type})`);
            
            if (item.type === 'dir') {
                // Рекурсивно обробляємо підпапку
                console.log(`📂 Сканування підпапки: ${item.path}`);
                try {
                    const subContents = await this.fetchGitHubContents(item.path);
                    const subNode = await this.buildStructure(subContents, item.path);
                    node.children.push(subNode);
                } catch (error) {
                    console.error(`❌ Помилка сканування підпапки ${item.path}:`, error);
                }
            } else if (item.type === 'file' && item.name.endsWith('.md')) {
                // Додаємо Markdown файл
                console.log(`✅ Знайдено Markdown файл: ${item.name}`);
                node.children.push({
                    name: item.name.replace('.md', ''),
                    path: item.path,
                    type: 'file',
                    url: item.download_url,
                    size: item.size
                });
            } else if (item.type === 'file') {
                console.log(`📄 Ігноруємо файл: ${item.name} (не .md)`);
            }
        }

        return node;
    }

    // Вилучення всіх сторінок з структури
    extractPagesFromStructure(structure) {
        console.log('📋 Витягнення сторінок зі структури...');
        const pages = [];
        
        function traverse(node) {
            if (node.type === 'file') {
                const pagePath = node.path.replace('pages/', '').replace('.md', '');
                console.log(`📖 Додано сторінку: ${node.name} -> ${pagePath}`);
                pages.push({
                    title: node.name,
                    path: pagePath,
                    url: node.url,
                    size: node.size
                });
            } else if (node.children) {
                node.children.forEach(traverse);
            }
        }
        
        traverse(structure);
        console.log(`📚 Всього витягнуто сторінок: ${pages.length}`);
        return pages;
    }

    // Завантаження тестових даних для демонстрації
    loadFallbackData() {
        console.log('🔄 Завантаження тестових даних...');
        this.pages = [
            {
                title: 'Головна',
                path: 'home',
                url: `${this.baseUrl}/pages/home.md`,
                size: 1024
            },
            {
                title: 'Python',
                path: 'programming/python',
                url: `${this.baseUrl}/pages/programming/python.md`,
                size: 2048
            },
            {
                title: 'Фізика',
                path: 'science/physics',
                url: `${this.baseUrl}/pages/science/physics.md`,
                size: 1536
            }
        ];
        
        this.structure = {
            name: 'pages',
            path: 'pages',
            type: 'folder',
            children: [
                {
                    name: 'home',
                    path: 'pages/home.md',
                    type: 'file',
                    url: `${this.baseUrl}/pages/home.md`,
                    size: 1024
                },
                {
                    name: 'programming',
                    path: 'pages/programming',
                    type: 'folder',
                    children: [
                        {
                            name: 'python',
                            path: 'pages/programming/python.md',
                            type: 'file',
                            url: `${this.baseUrl}/pages/programming/python.md`,
                            size: 2048
                        }
                    ]
                },
                {
                    name: 'science',
                    path: 'pages/science',
                    type: 'folder',
                    children: [
                        {
                            name: 'physics',
                            path: 'pages/science/physics.md',
                            type: 'file',
                            url: `${this.baseUrl}/pages/science/physics.md`,
                            size: 1536
                        }
                    ]
                }
            ]
        };
        
        this.buildNavigation();
        this.updateQuickStats();
        this.lastScan = new Date();
        this.updateLastScanTime();
        
        console.log('✅ Тестові дані завантажено');
        this.showError('navMenu', 'Використовуються тестові дані. Перевірте консоль для деталей.');
    }

    // Побудова навігації
    buildNavigation() {
        const navElement = document.getElementById('navMenu');
        if (!navElement) {
            console.error('❌ Елемент navMenu не знайдено в DOM');
            return;
        }
        
        console.log('🧭 Побудова навігації...');
        let html = '<font face="Arial" size="2" color="#CCCCCC">';
        
        if (this.pages.length === 0) {
            html += 'Не знайдено жодної сторінки';
        } else {
            html += '<div style="max-height: 400px; overflow-y: auto; padding: 5px;">';
            html += this.buildNavigationHTML(this.structure);
            html += '</div>';
        }
        
        html += '</font>';
        navElement.innerHTML = html;
        console.log('✅ Навігація побудована');
    }

    buildNavigationHTML(node, level = 0) {
        let html = '';
        const indent = '&nbsp;'.repeat(level * 4);

        if (node.type === 'file') {
            html += `${indent}<a href="#" onclick="wiki.loadPage('${node.path.replace('pages/', '').replace('.md', '')}')" style="color:#4A90E2; text-decoration:none; display:block; padding: 2px 0;">📄 ${node.name}</a>`;
        } else if (node.type === 'folder') {
            // Показуємо папку тільки якщо вона не порожня
            const hasVisibleChildren = node.children && node.children.some(child => 
                child.type === 'file' || (child.type === 'folder' && child.children && child.children.length > 0)
            );

            if (hasVisibleChildren) {
                if (level > 0) {
                    html += `${indent}<div style="color:#CCCCCC; font-weight:bold; margin: 5px 0;">📁 ${node.name}</div>`;
                }
                
                if (node.children) {
                    node.children.forEach(child => {
                        html += this.buildNavigationHTML(child, level + 1);
                    });
                }
            }
        }

        return html;
    }

    // Завантаження сторінки
    async loadPage(pagePath) {
        console.log(`📖 Завантаження сторінки: ${pagePath}`);
        this.showMainContent('articleContent');
        this.showLoading('articleContent', `Завантаження сторінки: ${pagePath}...`);

        try {
            const page = this.pages.find(p => p.path === pagePath);
            if (!page) {
                throw new Error(`Сторінку "${pagePath}" не знайдено в списку доступних сторінок`);
            }

            console.log(`📡 Завантаження контенту з: ${page.url}`);
            const response = await fetch(page.url);
            
            if (!response.ok) {
                throw new Error(`Не вдалося завантажити сторінку: ${response.status} ${response.statusText}`);
            }

            const markdown = await response.text();
            console.log(`✅ Контент отримано, довжина: ${markdown.length} символів`);

            const html = this.convertMarkdownToHtml(markdown);

            document.getElementById('articleContent').innerHTML = `
                <table width="100%" cellspacing="0" cellpadding="10" border="0">
                    <tr>
                        <td bgcolor="#2A2A2A">
                            <font face="Arial" size="2" color="#CCCCCC">
                                <a href="#" onclick="wiki.showMainPage()" style="color:#4A90E2;">Головна</a> &gt; 
                                ${this.generateBreadcrumbs(pagePath)}
                            </font>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div class="article-content">
                                ${html}
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td bgcolor="#2A2A2A">
                            <font face="Arial" size="1" color="#888888">
                                Останнє оновлення: ${new Date().toLocaleDateString('uk-UA')}
                            </font>
                        </td>
                    </tr>
                </table>
            `;

            this.updateUrl(`?page=${pagePath}`);
            this.highlightSearchTerms();
            console.log(`✅ Сторінка "${pagePath}" успішно завантажена`);

        } catch (error) {
            console.error(`❌ Помилка завантаження сторінки "${pagePath}":`, error);
            document.getElementById('articleContent').innerHTML = `
                <table width="100%" cellspacing="0" cellpadding="20" border="0">
                    <tr>
                        <td align="center">
                            <font face="Arial" size="4" color="#FF6B6B">
                                <b>Помилка завантаження</b>
                            </font>
                            <br><br>
                            <font face="Arial" size="2" color="#CCCCCC">
                                Не вдалося завантажити сторінку: "<b>${pagePath}</b>"
                                <br><br>
                                <b>Деталі помилки:</b> ${error.message}
                                <br><br>
                                <a href="#" onclick="wiki.showMainPage()" style="color:#4A90E2;">Повернутися на головну</a>
                                <br><br>
                                <small>Перевірте консоль браузера для додаткової інформації</small>
                            </font>
                        </td>
                    </tr>
                </table>
            `;
        }
    }

    // Конвертація Markdown в HTML
    convertMarkdownToHtml(markdown) {
        console.log('🔄 Конвертація Markdown в HTML...');
        let html = markdown;

        // Заголовки
        html = html.replace(/^### (.*$)/gim, '<font face="Arial" size="4" color="#4A90E2"><b>$1</b></font><br>');
        html = html.replace(/^## (.*$)/gim, '<font face="Arial" size="5" color="#4A90E2"><b>$1</b></font><br>');
        html = html.replace(/^# (.*$)/gim, '<font face="Arial" size="6" color="#4A90E2"><b>$1</b></font><br>');
        
        // Жирний текст
        html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        
        // Курсив
        html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
        
        // Код
        html = html.replace(/`(.*?)`/g, '<code style="background:#2A2A2A; padding:2px 4px; border-radius:3px; font-family:monospace;">$1</code>');
        
        // Блоки коду
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre style="background:#2A2A2A; padding:10px; border-radius:5px; overflow-x:auto; font-family:monospace; font-size:12px;">$2</pre>');
        
        // Зображення
        html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
            const fullSrc = src.startsWith('http') ? src : `${this.baseUrl}/${src}`;
            console.log(`🖼️ Додавання зображення: ${fullSrc}`);
            return `<img src="${fullSrc}" alt="${alt}" style="max-width:100%; border:1px solid #444; border-radius:5px; margin:10px 0;">`;
        });
        
        // Зовнішні посилання
        html = html.replace(/\[(.*?)\]\((http.*?)\)/g, '<a href="$2" target="_blank" style="color:#4A90E2;">$1</a>');
        
        // Внутрішні посилання (вікі-синтаксис)
        html = html.replace(/\[\[(.*?)\]\]/g, (match, pageName) => {
            const foundPage = this.pages.find(p => p.title === pageName || p.path === pageName);
            return foundPage ? 
                `<a href="#" onclick="wiki.loadPage('${foundPage.path}')" style="color:#4A90E2;">${pageName}</a>` :
                `<span style="color:#888;" title="Сторінка не знайдена">${pageName}</span>`;
        });
        
        // Горизонтальна лінія
        html = html.replace(/^-{3,}$/gim, '<hr style="border:1px solid #444; margin:20px 0;">');
        
        // Списки
        html = html.replace(/^- (.*$)/gim, '<li style="margin:5px 0;">$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul style="margin:10px 0; padding-left:20px;">$1</ul>');
        
        // Абзаци
        html = html.replace(/\n\n/g, '</p><p style="margin:10px 0;">');
        html = html.replace(/\n/g, '<br>');
        html = '<p style="margin:10px 0;">' + html + '</p>';

        console.log('✅ Конвертація Markdown завершена');
        return html;
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
                breadcrumbs += `<b>${part}</b>`;
            } else {
                breadcrumbs += `<a href="#" onclick="wiki.loadPage('${currentPath}')" style="color:#4A90E2;">${part}</a> / `;
            }
        });

        return breadcrumbs;
    }

    // Пошук
    async performSearch() {
        const query = document.getElementById('searchBox')?.value || 
                     document.getElementById('mainSearchBox')?.value;

        if (!query || !query.trim()) {
            this.showMainPage();
            return;
        }

        console.log(`🔍 Виконання пошуку: "${query}"`);
        this.showMainContent('searchResults');
        this.showLoading('searchResults', `Пошук: "${query}"...`);

        await new Promise(resolve => setTimeout(resolve, 500));

        const results = await this.searchPages(query);
        this.displaySearchResults(results, query);
    }

    async searchPages(query) {
        console.log(`🔍 Пошук сторінок за запитом: "${query}"`);
        const results = [];
        const lowerQuery = query.toLowerCase();

        // Шукаємо в назвах сторінок
        const titleResults = this.pages.filter(page => 
            page.title.toLowerCase().includes(lowerQuery)
        );

        console.log(`📌 Знайдено в назвах: ${titleResults.length} сторінок`);

        // Шукаємо в контенті сторінок (обмежено кількістю)
        const contentResults = [];
        const pagesToSearch = this.pages.slice(0, 5); // Обмежуємо для продуктивності
        
        for (const page of pagesToSearch) {
            try {
                console.log(`📖 Пошук в контенті: ${page.title}`);
                const response = await fetch(page.url);
                const content = await response.text();
                
                if (content.toLowerCase().includes(lowerQuery)) {
                    contentResults.push({
                        ...page,
                        excerpt: this.generateExcerpt(content, query),
                        matchType: 'content'
                    });
                    console.log(`✅ Знайдено в контенті: ${page.title}`);
                }
            } catch (error) {
                console.error(`❌ Помилка пошуку в сторінці "${page.title}":`, error);
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

        console.log(`📊 Всього результатів пошуку: ${results.length}`);
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
        excerpt = excerpt.replace(regex, '<span style="background:rgba(255,107,53,0.3); padding:1px 2px; border-radius:2px;">$1</span>');
        
        return (start > 0 ? '...' : '') + excerpt + (end < content.length ? '...' : '');
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Допоміжні методи
    showMainPage() {
        this.showMainContent('mainSearch');
        this.updateUrl('?');
    }

    showMainContent(contentId) {
        // Ховаємо всі контентні області
        const contents = ['mainSearch', 'articleContent', 'searchResults', 'allPages'];
        contents.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });
        
        // Показуємо потрібну область
        const targetElement = document.getElementById(contentId);
        if (targetElement) {
            targetElement.style.display = 'block';
        }
    }

    showLoading(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <table width="100%" height="200" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td align="center" valign="middle">
                            <font face="Arial" size="2" color="#CCCCCC">
                                ${message}
                            </font>
                        </td>
                    </tr>
                </table>
            `;
        }
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <font face="Arial" size="2" color="#FF6B6B">
                    ${message}
                </font>
            `;
        }
    }

    updateQuickStats() {
        const element = document.getElementById('quickStats');
        if (element) {
            element.innerHTML = `
                <font face="Arial" size="2" color="#CCCCCC">
                    <b>${this.pages.length}</b> сторінок у <b>${this.countCategories()}</b> категоріях<br>
                    <small>Оновлено: ${this.lastScan ? this.lastScan.toLocaleTimeString('uk-UA') : 'щойно'}</small>
                </font>
            `;
        }
    }

    updateLastScanTime() {
        const element = document.getElementById('lastUpdate');
        if (element) {
            element.textContent = `Останнє оновлення: ${this.lastScan ? this.lastScan.toLocaleString('uk-UA') : '-'}`;
        }
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
        console.log('💾 Дані збережено в кеш');
    }

    loadFromCache() {
        const cached = localStorage.getItem('wikiCache');
        if (cached) {
            try {
                const cache = JSON.parse(cached);
                this.pages = cache.pages || [];
                this.structure = cache.structure || {};
                this.lastScan = cache.lastScan ? new Date(cache.lastScan) : null;
                console.log('📂 Дані завантажено з кешу');
                return true;
            } catch (error) {
                console.error('❌ Помилка завантаження з кешу:', error);
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
            const searchBox = document.getElementById('mainSearchBox');
            if (searchBox) searchBox.value = search;
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
                    el.innerHTML = el.innerHTML.replace(regex, '<span style="background:rgba(255,107,53,0.3); padding:1px 2px; border-radius:2px;">$1</span>');
                });
            }, 100);
        }
    }
}

// Глобальний екземпляр
const wiki = new WikiEngine();

// Ініціалізація при завантаженні
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM завантажено, ініціалізація WikiEngine...');
    wiki.init();
});

// Глобальні функції для HTML
function performSearch() { 
    console.log('🔍 Виклик пошуку...');
    wiki.performSearch(); 
}
function scanRepository() { 
    console.log('🔄 Виклик повторного сканування...');
    wiki.scanRepository(); 
}
function showMainPage() { 
    console.log('🏠 Перехід на головну...');
    wiki.showMainPage(); 
}
function showAllPages() { 
    console.log('📚 Показати всі сторінки...');
    wiki.showAllPages(); 
}
function showRandomPage() { 
    console.log('🎲 Випадкова сторінка...');
    wiki.showRandomPage(); 
}
function showStatistics() { 
    console.log('📊 Статистика...');
    wiki.showStatistics(); 
}

// Додаємо обробники подій для форм
document.addEventListener('DOMContentLoaded', function() {
    // Обробка форми пошуку в бічній панелі
    const searchForm = document.querySelector('#sidebar form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            performSearch();
        });
    }

    // Обробка головної форми пошуку
    const mainSearchForm = document.querySelector('#mainSearch form');
    if (mainSearchForm) {
        mainSearchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            performSearch();
        });
    }

    console.log('✅ Обробники подій ініціалізовані');
});
