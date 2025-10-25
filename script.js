// HoRP-wiKi - Автоматична система для табличної верстки
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
    }

    updateVisitCounter() {
        if (!localStorage.visitCount) localStorage.visitCount = 0;
        localStorage.visitCount++;
        document.getElementById('pageCounter').textContent = `Відвідувачів: ${localStorage.visitCount}`;
    }

    // Автоматичне сканування GitHub репозиторію
    async scanRepository() {
        this.showLoading('navMenu', 'Сканування структури GitHub...');
        
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
            
        } catch (error) {
            console.error('Помилка сканування:', error);
            this.showError('navMenu', 'Помилка сканування GitHub');
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

    // Побудова навігації для табличної верстки
    buildNavigation() {
        const navElement = document.getElementById('navMenu');
        let html = '<font face="Arial" size="2" color="#CCCCCC">';
        html += this.buildNavigationHTML(this.structure);
        html += '</font>';
        navElement.innerHTML = html;
    }

    buildNavigationHTML(node, level = 0) {
        if (node.type === 'file') {
            const indent = '&nbsp;'.repeat(level * 4);
            return `${indent}<a href="#" onclick="wiki.loadPage('${node.path.replace('pages/', '').replace('.md', '')}')" style="color:#4A90E2; text-decoration:none;">${node.name}</a><br>`;
        }

        let html = '';
        if (level > 0) {
            const indent = '&nbsp;'.repeat((level - 1) * 4);
            html += `${indent}<b style="color:#CCCCCC;">${node.name}</b><br>`;
        }

        if (node.children) {
            node.children.forEach(child => {
                html += this.buildNavigationHTML(child, level + 1);
            });
        }

        return html;
    }

    // Завантаження сторінки
    async loadPage(pagePath) {
        this.showMainContent('articleContent');
        this.showLoading('articleContent', 'Завантаження сторінки...');

        try {
            const page = this.pages.find(p => p.path === pagePath);
            if (!page) throw new Error('Сторінку не знайдено');

            const response = await fetch(page.url);
            if (!response.ok) throw new Error('Помилка завантаження');

            const markdown = await response.text();
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

        } catch (error) {
            document.getElementById('articleContent').innerHTML = `
                <table width="100%" cellspacing="0" cellpadding="20" border="0">
                    <tr>
                        <td align="center">
                            <font face="Arial" size="4" color="#FF6B6B">
                                <b>Помилка 404</b>
                            </font>
                            <br><br>
                            <font face="Arial" size="2" color="#CCCCCC">
                                Статтю "<b>${pagePath}</b>" не знайдено в репозиторії.
                                <br><br>
                                <a href="#" onclick="wiki.showMainPage()" style="color:#4A90E2;">Повернутися на головну</a>
                            </font>
                        </td>
                    </tr>
                </table>
            `;
        }
    }

    // Конвертація Markdown в HTML
    convertMarkdownToHtml(markdown) {
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
        const query = document.getElementById('searchBox').value || 
                     document.getElementById('mainSearchBox').value;

        if (!query.trim()) {
            this.showMainPage();
            return;
        }

        this.showMainContent('searchResults');
        this.showLoading('searchResults', 'Пошук...');

        // Невелика затримка для анімації
        await new Promise(resolve => setTimeout(resolve, 500));

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
        for (const page of this.pages.slice(0, 10)) {
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

    displaySearchResults(results, query) {
        let html = `
            <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td>
                        <font face="Arial" size="5" color="#4A90E2">
                            <b>Результати пошуку</b>
                        </font>
                        <br><br>
                        <font face="Arial" size="2" color="#CCCCCC">
                            Запит: "<b>${query}</b>"
                            <br>
                            Знайдено: <b>${results.length}</b> результатів
                        </font>
                    </td>
                </tr>
        `;

        if (results.length === 0) {
            html += `
                <tr>
                    <td style="padding:20px 0;">
                        <table width="100%" cellspacing="0" cellpadding="15" border="0" bgcolor="#2A2A2A" style="border-radius:5px;">
                            <tr>
                                <td>
                                    <font face="Arial" size="2" color="#CCCCCC">
                                        <b>Нічого не знайдено</b>
                                        <br><br>
                                        Спробуйте:
                                        <ul>
                                            <li>Перевірити правопис</li>
                                            <li>Використовувати інші ключові слова</li>
                                            <li><a href="#" onclick="wiki.showAllPages()" style="color:#4A90E2;">Переглянути всі сторінки</a></li>
                                        </ul>
                                    </font>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            `;
        } else {
            results.forEach(result => {
                html += `
                    <tr>
                        <td style="padding:10px 0;">
                            <table width="100%" cellspacing="0" cellpadding="15" border="0" bgcolor="#2A2A2A" style="border-radius:5px; cursor:pointer; border:1px solid #333;" 
                                   onclick="wiki.loadPage('${result.path}')" 
                                   onmouseover="this.style.borderColor='#4A90E2'; this.style.backgroundColor='#333';" 
                                   onmouseout="this.style.borderColor='#333'; this.style.backgroundColor='#2A2A2A';">
                                <tr>
                                    <td>
                                        <font face="Arial" size="3" color="#4A90E2">
                                            <b>${result.title}</b>
                                        </font>
                                        ${result.excerpt ? `
                                        <br>
                                        <font face="Arial" size="2" color="#888888">
                                            ${result.excerpt}
                                        </font>
                                        ` : ''}
                                        <br>
                                        <font face="Arial" size="1" color="#666666">
                                            Шлях: ${result.path}
                                        </font>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                `;
            });
        }

        html += '</table>';
        document.getElementById('searchResults').innerHTML = html;
        
        this.updateUrl(`?search=${encodeURIComponent(query)}`);
    }

    // Всі сторінки
    showAllPages() {
        this.showMainContent('allPages');
        
        let html = `
            <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td>
                        <font face="Arial" size="5" color="#4A90E2">
                            <b>Всі сторінки (${this.pages.length})</b>
                        </font>
                    </td>
                </tr>
                <tr>
                    <td style="padding:20px 0;">
                        <table width="100%" cellspacing="10" cellpadding="0" border="0">
                            <tr>
                                <td width="33%" valign="top">
                                    <table width="100%" cellspacing="0" cellpadding="15" border="0" bgcolor="#2A2A2A" style="border-radius:5px; text-align:center;">
                                        <tr>
                                            <td>
                                                <font face="Arial" size="6" color="#4A90E2">
                                                    <b>${this.pages.length}</b>
                                                </font>
                                                <br>
                                                <font face="Arial" size="2" color="#CCCCCC">
                                                    Всього сторінок
                                                </font>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                                <td width="33%" valign="top">
                                    <table width="100%" cellspacing="0" cellpadding="15" border="0" bgcolor="#2A2A2A" style="border-radius:5px; text-align:center;">
                                        <tr>
                                            <td>
                                                <font face="Arial" size="6" color="#4A90E2">
                                                    <b>${this.countFolders(this.structure)}</b>
                                                </font>
                                                <br>
                                                <font face="Arial" size="2" color="#CCCCCC">
                                                    Категорій
                                                </font>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                                <td width="33%" valign="top">
                                    <table width="100%" cellspacing="0" cellpadding="15" border="0" bgcolor="#2A2A2A" style="border-radius:5px; text-align:center;">
                                        <tr>
                                            <td>
                                                <font face="Arial" size="6" color="#4A90E2">
                                                    <b>${this.lastScan ? this.lastScan.toLocaleDateString('uk-UA') : '-'}</b>
                                                </font>
                                                <br>
                                                <font face="Arial" size="2" color="#CCCCCC">
                                                    Останнє сканування
                                                </font>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
        `;

        this.pages.forEach(page => {
            html += `
                <tr>
                    <td style="padding:5px 0;">
                        <table width="100%" cellspacing="0" cellpadding="10" border="0" bgcolor="#2A2A2A" style="border-radius:5px; cursor:pointer; border:1px solid #333;" 
                               onclick="wiki.loadPage('${page.path}')" 
                               onmouseover="this.style.borderColor='#4A90E2'; this.style.backgroundColor='#333';" 
                               onmouseout="this.style.borderColor='#333'; this.style.backgroundColor='#2A2A2A';">
                            <tr>
                                <td>
                                    <font face="Arial" size="3" color="#4A90E2">
                                        <b>${page.title}</b>
                                    </font>
                                    <br>
                                    <font face="Arial" size="1" color="#666666">
                                        Шлях: ${page.path} | Розмір: ${Math.ceil(page.size / 1024)} КБ
                                    </font>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            `;
        });

        html += '</table>';
        document.getElementById('allPages').innerHTML = html;
    }

    // Статистика
    showStatistics() {
        this.showMainContent('searchResults');
        
        const totalSize = this.calculateTotalSize();
        const categories = this.countCategories();
        
        const html = `
            <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td>
                        <font face="Arial" size="5" color="#4A90E2">
                            <b>Статистика HoRP-wiKi</b>
                        </font>
                    </td>
                </tr>
                <tr>
                    <td style="padding:20px 0;">
                        <table width="100%" cellspacing="10" cellpadding="0" border="0">
                            <tr>
                                <td width="25%" valign="top">
                                    <table width="100%" cellspacing="0" cellpadding="20" border="0" bgcolor="#2A2A2A" style="border-radius:5px; text-align:center;">
                                        <tr>
                                            <td>
                                                <font face="Arial" size="8" color="#4A90E2">
                                                    <b>${this.pages.length}</b>
                                                </font>
                                                <br>
                                                <font face="Arial" size="2" color="#CCCCCC">
                                                    Сторінок
                                                </font>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                                <td width="25%" valign="top">
                                    <table width="100%" cellspacing="0" cellpadding="20" border="0" bgcolor="#2A2A2A" style="border-radius:5px; text-align:center;">
                                        <tr>
                                            <td>
                                                <font face="Arial" size="8" color="#4A90E2">
                                                    <b>${categories}</b>
                                                </font>
                                                <br>
                                                <font face="Arial" size="2" color="#CCCCCC">
                                                    Категорій
                                                </font>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                                <td width="25%" valign="top">
                                    <table width="100%" cellspacing="0" cellpadding="20" border="0" bgcolor="#2A2A2A" style="border-radius:5px; text-align:center;">
                                        <tr>
                                            <td>
                                                <font face="Arial" size="8" color="#4A90E2">
                                                    <b>${totalSize}</b>
                                                </font>
                                                <br>
                                                <font face="Arial" size="2" color="#CCCCCC">
                                                    КБ контенту
                                                </font>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                                <td width="25%" valign="top">
                                    <table width="100%" cellspacing="0" cellpadding="20" border="0" bgcolor="#2A2A2A" style="border-radius:5px; text-align:center;">
                                        <tr>
                                            <td>
                                                <font face="Arial" size="8" color="#4A90E2">
                                                    <b>${localStorage.visitCount || 0}</b>
                                                </font>
                                                <br>
                                                <font face="Arial" size="2" color="#CCCCCC">
                                                    Відвідувачів
                                                </font>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td>
                        <table width="100%" cellspacing="0" cellpadding="15" border="0" bgcolor="#2A2A2A" style="border-radius:5px;">
                            <tr>
                                <td>
                                    <font face="Arial" size="3" color="#4A90E2">
                                        <b>Інформація про систему</b>
                                    </font>
                                    <br><br>
                                    <font face="Arial" size="2" color="#CCCCCC">
                                        <b>Репозиторій:</b> ${this.repoOwner}/${this.repoName}
                                        <br>
                                        <b>Гілка:</b> ${this.branch}
                                        <br>
                                        <b>Автоматичне сканування:</b> Увімкнено
                                        <br>
                                        <b>Останнє оновлення:</b> ${this.lastScan ? this.lastScan.toLocaleString('uk-UA') : '-'}
                                        <br><br>
                                        <a href="https://github.com/${this.repoOwner}/${this.repoName}" target="_blank" style="color:#4A90E2;">Редагувати на GitHub</a>
                                    </font>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        `;
        
        document.getElementById('searchResults').innerHTML = html;
    }

    // Допоміжні методи
    calculateTotalSize() {
        return Math.ceil(this.pages.reduce((sum, page) => sum + (page.size || 0), 0) / 1024);
    }

    countFolders(node) {
        if (node.type !== 'folder') return 0;
        let count = 1;
        if (node.children) {
            node.children.forEach(child => {
                if (child.type === 'folder') {
                    count += this.countFolders(child);
                }
            });
        }
        return count;
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
        // Ховаємо всі контентні області
        document.getElementById('mainSearch').style.display = 'none';
        document.getElementById('articleContent').style.display = 'none';
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('allPages').style.display = 'none';
        
        // Показуємо потрібну область
        document.getElementById(contentId).style.display = 'block';
    }

    showLoading(elementId, message) {
        document.getElementById(elementId).innerHTML = `
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

    showError(elementId, message) {
        document.getElementById(elementId).innerHTML = `
            <font face="Arial" size="2" color="#FF6B6B">
                ${message}
            </font>
        `;
    }

    updateQuickStats() {
        document.getElementById('quickStats').innerHTML = `
            <font face="Arial" size="2" color="#CCCCCC">
                <b>${this.pages.length}</b> сторінок у <b>${this.countCategories()}</b> категоріях<br>
                <small>Оновлено: ${this.lastScan ? this.lastScan.toLocaleTimeString('uk-UA') : 'щойно'}</small>
            </font>
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
    wiki.init();
});

// Глобальні функції для HTML
function performSearch() { wiki.performSearch(); }
function scanRepository() { wiki.scanRepository(); }
function showMainPage() { wiki.showMainPage(); }
function showAllPages() { wiki.showAllPages(); }
function showRandomPage() { wiki.showRandomPage(); }
function showStatistics() { wiki.showStatistics(); }
