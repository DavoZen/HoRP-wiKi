/* HoRP-wiKi - Темна тема з розширеними анімаціями */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body.dark-theme {
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
    color: #e0e0e0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    min-height: 100vh;
}

@keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

/* Хедер з анімаціями */
#header {
    border-bottom: 3px solid #0066CC;
    position: relative;
    overflow: hidden;
}

#header::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(0, 102, 204, 0.1), transparent);
    animation: headerShine 6s ease-in-out infinite;
}

@keyframes headerShine {
    0% { left: -100%; }
    100% { left: 100%; }
}

.logo-container {
    padding: 10px;
    text-align: center;
    animation: logoFloat 4s ease-in-out infinite;
}

@keyframes logoFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
}

.logo {
    max-width: 120px;
    height: auto;
    border: 2px solid #333;
    border-radius: 8px;
    transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    filter: brightness(0.9) contrast(1.1);
}

.logo:hover {
    transform: scale(1.1) rotate(2deg);
    border-color: #0066CC;
    box-shadow: 0 0 20px rgba(0, 102, 204, 0.4);
    filter: brightness(1.1) contrast(1.2);
}

/* Навігаційна панель з анімаціями */
#navbar {
    background-color: #333333;
    border-bottom: 1px solid #444;
    border-top: 1px solid #444;
    position: relative;
}

#navbar::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, #0066CC, #0099CC, #0066CC);
    background-size: 200% 100%;
    animation: navGlow 3s linear infinite;
}

@keyframes navGlow {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

#navbar a {
    color: #CCCCCC;
    text-decoration: none;
    padding: 2px 8px;
    border-radius: 4px;
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    position: relative;
    overflow: hidden;
}

#navbar a::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(0, 102, 204, 0.3), transparent);
    transition: left 0.6s ease;
}

#navbar a:hover {
    color: #ffffff;
    background-color: rgba(0, 102, 204, 0.2);
    transform: translateY(-2px);
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

#navbar a:hover::before {
    left: 100%;
}

/* Бічна панель з покращеними анімаціями */
#sidebar {
    background-color: #1E1E1E;
    border-right: 1px solid #333;
    min-height: calc(100vh - 140px);
    animation: sidebarSlideIn 0.8s ease-out;
}

@keyframes sidebarSlideIn {
    from { 
        opacity: 0;
        transform: translateX(-30px);
    }
    to { 
        opacity: 1;
        transform: translateX(0);
    }
}

#sidebar td {
    border-bottom: 1px solid #2a2a2a;
    transition: background-color 0.3s ease;
}

#sidebar td:hover {
    background-color: rgba(255, 255, 255, 0.05);
}

#sidebar font {
    transition: color 0.3s ease, text-shadow 0.3s ease;
}

#sidebar a {
    color: #4A90E2;
    text-decoration: none;
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    display: inline-block;
    padding: 2px 4px;
    border-radius: 3px;
}

#sidebar a:hover {
    color: #6BB5FF;
    background-color: rgba(74, 144, 226, 0.1);
    transform: translateX(5px);
    text-shadow: 0 0 8px rgba(74, 144, 226, 0.5);
}

/* Форми та інпути з анімаціями */
input[type="text"], input[type="submit"] {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    border: 1px solid #444;
    background-color: #2a2a2a;
    color: #e0e0e0;
    padding: 6px 8px;
    border-radius: 4px;
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    outline: none;
}

input[type="text"] {
    width: 100%;
    margin-bottom: 5px;
    animation: inputPulse 2s ease-in-out infinite;
}

@keyframes inputPulse {
    0%, 100% { box-shadow: 0 0 0 rgba(74, 144, 226, 0); }
    50% { box-shadow: 0 0 5px rgba(74, 144, 226, 0.3); }
}

input[type="text"]:focus {
    border-color: #4A90E2;
    background-color: #333;
    box-shadow: 0 0 10px rgba(74, 144, 226, 0.4);
    transform: scale(1.02);
}

input[type="submit"] {
    background: linear-gradient(135deg, #4A90E2, #357ABD);
    color: white;
    cursor: pointer;
    border: none;
    font-weight: bold;
    position: relative;
    overflow: hidden;
}

input[type="submit"]::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
}

input[type="submit"]:hover {
    background: linear-gradient(135deg, #5BA0FF, #4688D6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
}

input[type="submit"]:hover::before {
    left: 100%;
}

input[type="submit"]:active {
    transform: translateY(0);
    transition: transform 0.1s ease;
}

/* Контентна область */
#content {
    animation: contentFadeIn 1s ease-out;
}

@keyframes contentFadeIn {
    from { 
        opacity: 0;
        transform: translateY(20px);
    }
    to { 
        opacity: 1;
        transform: translateY(0);
    }
}

.main-content {
    background-color: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    margin: 10px;
    padding: 25px;
    animation: contentScaleIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes contentScaleIn {
    from { 
        opacity: 0;
        transform: scale(0.95) translateY(10px);
    }
    to { 
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.hidden {
    display: none;
}

/* Головна сторінка з анімаціями */
.welcome-message {
    text-align: center;
    padding: 40px 20px;
    animation: welcomeEntrance 1.2s ease-out;
}

@keyframes welcomeEntrance {
    0% {
        opacity: 0;
        transform: translateY(30px) scale(0.9);
    }
    60% {
        opacity: 1;
        transform: translateY(-10px) scale(1.02);
    }
    100% {
        transform: translateY(0) scale(1);
    }
}

.welcome-message font {
    display: block;
    margin-bottom: 20px;
    text-shadow: 0 2px 10px rgba(74, 144, 226, 0.3);
    animation: titleGlow 3s ease-in-out infinite;
}

@keyframes titleGlow {
    0%, 100% { 
        text-shadow: 0 2px 10px rgba(74, 144, 226, 0.3);
        transform: scale(1);
    }
    50% { 
        text-shadow: 0 2px 20px rgba(74, 144, 226, 0.6);
        transform: scale(1.01);
    }
}

.search-container {
    margin: 30px 0;
    animation: searchSlideUp 0.8s ease-out 0.3s both;
}

@keyframes searchSlideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.search-container input[type="text"] {
    font-size: 14px;
    padding: 10px 15px;
    width: 400px;
    max-width: 80%;
    margin-right: 10px;
    animation: searchInputFocus 3s ease-in-out infinite;
}

@keyframes searchInputFocus {
    0%, 100% { 
        border-color: #444;
        box-shadow: 0 0 0 rgba(74, 144, 226, 0);
    }
    50% { 
        border-color: #4A90E2;
        box-shadow: 0 0 8px rgba(74, 144, 226, 0.3);
    }
}

.search-container input[type="submit"] {
    font-size: 14px;
    padding: 10px 25px;
    animation: buttonPulse 2s ease-in-out infinite;
}

@keyframes buttonPulse {
    0%, 100% { 
        transform: scale(1);
        box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
    }
    50% { 
        transform: scale(1.05);
        box-shadow: 0 4px 15px rgba(74, 144, 226, 0.5);
    }
}

.quick-stats {
    background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(53, 122, 189, 0.05));
    border: 1px solid #333;
    padding: 20px;
    border-radius: 8px;
    display: inline-block;
    margin-top: 20px;
    animation: statsFloat 4s ease-in-out infinite;
    backdrop-filter: blur(5px);
}

@keyframes statsFloat {
    0%, 100% { 
        transform: translateY(0px) rotate(0deg);
    }
    33% { 
        transform: translateY(-3px) rotate(0.5deg);
    }
    66% { 
        transform: translateY(2px) rotate(-0.5deg);
    }
}

/* Контент статті з послідовними анімаціями */
.article-content {
    font-family: Arial, Helvetica, sans-serif;
    line-height: 1.6;
    animation: articleReveal 0.8s ease-out;
}

@keyframes articleReveal {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.article-content h1 {
    color: #4A90E2;
    border-bottom: 2px solid #333;
    padding-bottom: 10px;
    margin-bottom: 25px;
    font-size: 28px;
    animation: titleSlideIn 0.6s ease-out;
}

@keyframes titleSlideIn {
    from {
        opacity: 0;
        transform: translateX(-50px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.article-content h2 {
    color: #5BA0FF;
    margin: 25px 0 15px 0;
    border-left: 4px solid #4A90E2;
    padding-left: 15px;
    animation: h2SlideIn 0.6s ease-out 0.2s both;
}

@keyframes h2SlideIn {
    from {
        opacity: 0;
        transform: translateX(-30px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.article-content h3 {
    color: #6BB5FF;
    margin: 20px 0 12px 0;
    animation: h3SlideIn 0.6s ease-out 0.4s both;
}

@keyframes h3SlideIn {
    from {
        opacity: 0;
        transform: translateY(15px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.article-content p {
    margin: 16px 0;
    text-align: justify;
    animation: paragraphFadeIn 0.6s ease-out 0.6s both;
}

@keyframes paragraphFadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.article-content ul, .article-content ol {
    margin: 16px 0 16px 30px;
    animation: listSlideIn 0.6s ease-out 0.8s both;
}

@keyframes listSlideIn {
    from {
        opacity: 0;
        transform: translateX(-20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.article-content li {
    margin: 8px 0;
    animation: listItemBounce 0.5s ease-out both;
}

.article-content li:nth-child(1) { animation-delay: 0.9s; }
.article-content li:nth-child(2) { animation-delay: 1.0s; }
.article-content li:nth-child(3) { animation-delay: 1.1s; }
.article-content li:nth-child(4) { animation-delay: 1.2s; }
.article-content li:nth-child(5) { animation-delay: 1.3s; }

@keyframes listItemBounce {
    0% {
        opacity: 0;
        transform: translateX(-20px) scale(0.8);
    }
    70% {
        opacity: 1;
        transform: translateX(5px) scale(1.05);
    }
    100% {
        transform: translateX(0) scale(1);
    }
}

.article-content code {
    background: rgba(74, 144, 226, 0.15);
    padding: 3px 6px;
    border-radius: 3px;
    font-family: "Courier New", monospace;
    border: 1px solid rgba(74, 144, 226, 0.3);
    color: #8BC2FF;
    animation: codeGlow 2s ease-in-out infinite;
}

@keyframes codeGlow {
    0%, 100% { 
        background: rgba(74, 144, 226, 0.15);
        box-shadow: 0 0 0 rgba(74, 144, 226, 0);
    }
    50% { 
        background: rgba(74, 144, 226, 0.25);
        box-shadow: 0 0 5px rgba(74, 144, 226, 0.3);
    }
}

.article-content pre {
    background: rgba(74, 144, 226, 0.1);
    border: 1px solid rgba(74, 144, 226, 0.3);
    border-radius: 6px;
    padding: 15px;
    overflow-x: auto;
    margin: 15px 0;
    font-family: "Courier New", monospace;
    font-size: 12px;
    animation: preExpand 0.5s ease-out;
}

@keyframes preExpand {
    from {
        opacity: 0;
        transform: scale(0.95);
        max-height: 0;
    }
    to {
        opacity: 1;
        transform: scale(1);
        max-height: 500px;
    }
}

.article-content img {
    max-width: 100%;
    height: auto;
    border: 1px solid #333;
    border-radius: 6px;
    margin: 15px 0;
    transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    animation: imageZoomIn 0.6s ease-out;
}

@keyframes imageZoomIn {
    from {
        opacity: 0;
        transform: scale(0.8) rotate(-2deg);
    }
    to {
        opacity: 1;
        transform: scale(1) rotate(0);
    }
}

.article-content img:hover {
    transform: scale(1.03) rotate(0.5deg);
    border-color: #4A90E2;
    box-shadow: 0 8px 25px rgba(74, 144, 226, 0.3);
}

/* Навігація статті */
.article-nav {
    background: rgba(74, 144, 226, 0.1);
    border: 1px solid #333;
    border-radius: 6px;
    padding: 15px;
    margin: 20px 0;
    animation: navSlideUp 0.5s ease-out;
    backdrop-filter: blur(5px);
}

@keyframes navSlideUp {
    from {
        opacity: 0;
        transform: translateY(15px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Результати пошуку */
.search-result {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #333;
    border-radius: 6px;
    padding: 20px;
    margin: 15px 0;
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    cursor: pointer;
    animation: searchResultAppear 0.6s ease-out;
    position: relative;
    overflow: hidden;
}

@keyframes searchResultAppear {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.search-result::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(74, 144, 226, 0.1), transparent);
    transition: left 0.6s ease;
}

.search-result:hover {
    background: rgba(74, 144, 226, 0.15);
    border-color: #4A90E2;
    transform: translateX(10px) translateY(-3px);
    box-shadow: 0 6px 20px rgba(74, 144, 226, 0.2);
}

.search-result:hover::before {
    left: 100%;
}

.search-result h3 {
    color: #5BA0FF;
    margin-bottom: 8px;
    font-size: 18px;
}

.search-result .excerpt {
    color: #b0b0b0;
    font-size: 13px;
    line-height: 1.4;
}

/* Статистика */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin: 20px 0;
}

.stat-card {
    background: rgba(74, 144, 226, 0.1);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    animation: statCardPop 0.6s ease-out;
    backdrop-filter: blur(5px);
}

@keyframes statCardPop {
    0% {
        opacity: 0;
        transform: scale(0.8) translateY(20px);
    }
    70% {
        opacity: 1;
        transform: scale(1.05) translateY(-5px);
    }
    100% {
        transform: scale(1) translateY(0);
    }
}

.stat-card:hover {
    background: rgba(74, 144, 226, 0.2);
    border-color: #4A90E2;
    transform: translateY(-5px) scale(1.02);
    box-shadow: 0 8px 25px rgba(74, 144, 226, 0.2);
}

.stat-number {
    font-size: 32px;
    font-weight: bold;
    color: #4A90E2;
    display: block;
    margin-bottom: 8px;
    animation: numberCountUp 1s ease-out;
}

@keyframes numberCountUp {
    from {
        opacity: 0;
        transform: scale(0.5) translateY(20px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.stat-label {
    color: #b0b0b0;
    font-size: 13px;
}

/* Футер */
#footer {
    background-color: #333333;
    border-top: 2px solid #444;
    margin-top: 30px;
    position: relative;
    overflow: hidden;
}

#footer::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, #0066CC, #0099CC, #0066CC);
    background-size: 200% 100%;
    animation: footerGlow 4s linear infinite;
}

@keyframes footerGlow {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* Завантаження */
.nav-loading {
    color: #888;
    font-style: italic;
    text-align: center;
    padding: 20px;
    animation: loadingPulse 1.5s ease-in-out infinite;
}

@keyframes loadingPulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
}

.loading {
    text-align: center;
    padding: 40px;
    color: #888;
    font-style: italic;
    animation: loadingDots 1.5s infinite;
}

@keyframes loadingDots {
    0%, 20% { content: "."; }
    40% { content: ".."; }
    60%, 100% { content: "..."; }
}

/* Підказки пошуку */
.search-suggestions {
    position: absolute;
    background: #2a2a2a;
    border: 1px solid #444;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    width: 200px;
    border-radius: 4px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    animation: suggestionsSlideDown 0.3s ease-out;
}

@keyframes suggestionsSlideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.suggestion-item {
    padding: 10px 15px;
    cursor: pointer;
    border-bottom: 1px solid #333;
    transition: all 0.3s ease;
}

.suggestion-item:hover {
    background: rgba(74, 144, 226, 0.2);
    color: #5BA0FF;
}

/* Адаптивність */
@media (max-width: 768px) {
    .search-container input[type="text"] {
        width: 100%;
        margin-bottom: 10px;
    }
    
    .search-container input[type="submit"] {
        width: 100%;
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
    }
}

/* Спеціальні ефекти для таблиць */
table {
    border-collapse: collapse;
    animation: tableFadeIn 0.8s ease-out;
}

@keyframes tableFadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

td {
    vertical-align: top;
    transition: background-color 0.3s ease;
}

/* Плавні переходи для всіх елементів */
* {
    transition: 
        color 0.3s ease,
        background-color 0.3s ease,
        border-color 0.3s ease,
        transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94),
        box-shadow 0.3s ease,
        opacity 0.3s ease;
}

/* Додаткові анімації для інтерактивності */
@keyframes microBounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
}

@keyframes gentleShake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-1px); }
    75% { transform: translateX(1px); }
}

/* Застосування мікро-анімацій до кнопок при кліку */
input[type="submit"]:active,
button:active {
    animation: microBounce 0.15s ease;
}

/* Анімація для помилок */
.error-shake {
    animation: gentleShake 0.5s ease;
}
