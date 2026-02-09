// Globals
const data = window.siteData;
const modal = document.getElementById('reader-modal');
const pageImg = document.getElementById('current-page'); // Used in single mode legacy, but we use canvas now
const indicator = document.getElementById('page-indicator');
const chapterTitleEl = document.getElementById('chapter-title');

// Reader State
let currentMode = 'single'; // single, double, cascade
let currentPages = [];
let currentIndex = 0;

// === RENDER SITE ===
function initSite() {
    if (!data) {
        document.body.innerHTML = '<div style="color:white; text-align:center; padding:50px; font-family:sans-serif;"><h1>⚠️ ERROR CRÍTICO</h1><p>No se pudo cargar el archivo <strong>data.js</strong>.</p><p>Posibles causas:</p><ul style="display:inline-block; text-align:left;"><li>No has guardado/reemplazado el archivo data.js</li><li>El archivo está corrupto o vacío</li><li>Hay un error de sintaxis (archivo cortado)</li></ul></div>';
        console.error("Critical: window.siteData is undefined");
        return;
    }
    renderHero();
    renderGallery();
}

// === SERIES DETAIL LOGIC ===
function openSeriesDetail(seriesId) {
    const series = data.series.find(s => s.id === seriesId);
    if (!series) return;

    // Populate Info
    document.getElementById('detail-cover').src = series.cover;
    document.getElementById('detail-title').textContent = series.title;
    document.getElementById('detail-genre').textContent = series.genre;
    document.getElementById('detail-status').textContent = series.status;
    document.getElementById('detail-desc').textContent = series.description || "Sin descripción disponible.";

    // Render Chapters
    const chapterGrid = document.getElementById('detail-chapters');
    chapterGrid.innerHTML = '';

    if (series.chapters.length === 0) {
        chapterGrid.innerHTML = '<p style="color: #64748b;">Próximamente...</p>';
    } else {
        // Use a list layout instead of grid
        chapterGrid.style.display = 'flex';
        chapterGrid.style.flexDirection = 'column';
        chapterGrid.style.gap = '10px';

        series.chapters.forEach((ch, idx) => {
            const row = document.createElement('div');
            row.className = 'chapter-row';
            row.style.background = '#1e293b';
            row.style.padding = '15px';
            row.style.borderRadius = '8px';
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';

            row.innerHTML = `
                <div style="flex: 1;">
                    <span style="font-size: 1.1rem; font-weight: bold; color: white;">#${idx + 1} - ${ch.title}</span>
                    <div style="font-size: 0.8rem; color: #94a3b8;">${ch.pages.length} páginas</div>
                </div>
            `;

            const btn = document.createElement('button');
            btn.className = 'btn'; // Reuse main button style
            btn.textContent = 'LEER AHORA';
            btn.style.padding = '8px 20px';
            btn.style.background = '#3b82f6';

            // Click opens the reader setup
            btn.onclick = () => {
                console.log("Click en lista capítulo", idx + 1);
                openReader(series.id, idx);
            };

            row.appendChild(btn);
            chapterGrid.appendChild(row);
        });
    }

    // Show Overlay
    document.getElementById('series-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSeriesDetail() {
    console.log("Cerrando detalle de serie...");
    document.getElementById('series-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

function closeReader() {
    console.log("Cerrando lector...");
    modal.classList.remove('active');

    // Clear canvas to release memory and prevent artifacts
    const canvas = document.getElementById('reader-canvas');
    if (canvas) canvas.innerHTML = '';

    if (!document.getElementById('series-overlay').classList.contains('active')) {
        document.body.style.overflow = 'auto';
    }
}

// === CORE RENDER FUNCTIONS ===
function renderHero() {
    const hero = data.hero;
    const container = document.getElementById('home');

    container.innerHTML = `
        <div class="hero-content">
            <span class="tag">${hero.tag}</span>
            <h1>${hero.title}</h1>
            <p class="synopsis">${hero.synopsis}</p>
        </div>
        <div class="hero-image">
            <img src="${hero.cover}" alt="Hero Comic" id="hero-img">
        </div>
    `;
}

function renderGallery() {
    const grid = document.getElementById('comic-grid');
    grid.innerHTML = '';

    data.series.forEach(item => {
        const card = document.createElement('div');
        card.className = 'comic-card';
        card.onclick = () => openSeriesDetail(item.id);

        card.innerHTML = `
            <div class="card-image">
                <img src="${item.cover}" alt="${item.title}">
                <div class="overlay">
                    <span>${item.status}</span>
                </div>
            </div>
            <div class="card-info">
                <h3>${item.title}</h3>
                <p>${item.genre}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

// === READER LOGIC ===

function openReader(seriesId, chapterIndex) {
    try {
        console.log("Abriendo lector para:", seriesId, "Capítulo índice:", chapterIndex);

        const series = data.series.find(s => s.id === seriesId);
        if (!series) throw new Error("Serie no encontrada");

        const chapter = series.chapters[chapterIndex];
        if (!chapter) throw new Error("Capítulo no encontrado");

        const pages = chapter.pages;
        const title = chapter.title;

        if (!pages || pages.length === 0) {
            alert("Este capítulo no tiene páginas (Lista vacía).");
            return;
        }

        // Diagnostic Check
        const badPage = pages.find(p => !p.startsWith('data:image') && !p.startsWith('assets/'));
        if (badPage) {
            console.warn("Se detectó una ruta que no es Base64 ni local (assets/):", badPage);
        }

        currentPages = pages;
        currentIndex = 0;

        // Show Mode Selector
        document.getElementById('mode-selector').classList.add('active');

        // Store id and index temporarily
        window.currentChapterTitle = title;
        window.currentSeriesId = seriesId;
        window.currentChapterIndex = chapterIndex;

    } catch (err) {
        alert("Error crítico al abrir lector: " + err.message);
        console.error(err);
    }
}

function closeModeSelector() {
    document.getElementById('mode-selector').classList.remove('active');
}

function startReader(mode) {
    currentMode = mode;
    closeModeSelector();

    const canvas = document.getElementById('reader-canvas');
    const controlsBottom = document.querySelector('.reader-controls.bottom');
    const title = window.currentChapterTitle || "Capítulo";

    // Reset Canvas
    canvas.className = 'reader-canvas'; // remove old modes
    canvas.classList.add(mode);
    canvas.innerHTML = ''; // clear old content
    canvas.style = ''; // Clear inline styles (CSS variables)

    const zoomSlider = document.getElementById('zoom-slider');
    if (zoomSlider) zoomSlider.value = 100;

    chapterTitleEl.textContent = title;
    modal.classList.add('active');
    modal.classList.remove('immersive'); // Reset on start
    document.body.style.overflow = 'hidden';

    // Immersive Mode & Drag-to-Pan Logic
    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;
    let dragMoved = false;

    canvas.onmousedown = (e) => {
        if (e.target.closest('.reader-controls')) return;
        isDragging = true;
        dragMoved = false;
        canvas.classList.add('grabbing');
        startX = e.pageX - canvas.offsetLeft;
        startY = e.pageY - canvas.offsetTop;
        scrollLeft = canvas.scrollLeft;
        scrollTop = canvas.scrollTop;
    };

    window.onmousemove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - canvas.offsetLeft;
        const y = e.pageY - canvas.offsetTop;
        const walkX = (x - startX) * 1.5; // multiplier for speed
        const walkY = (y - startY) * 1.5;

        if (Math.abs(walkX) > 5 || Math.abs(walkY) > 5) dragMoved = true;

        canvas.scrollLeft = scrollLeft - walkX;
        canvas.scrollTop = scrollTop - walkY;
    };

    window.onmouseup = () => {
        isDragging = false;
        canvas.classList.remove('grabbing');
    };

    canvas.onclick = (e) => {
        if (e.target.closest('.reader-controls')) return;
        // Only toggle if we didn't drag the page
        if (!dragMoved) {
            modal.classList.toggle('immersive');
        }
    };

    const navElements = document.querySelectorAll('.reader-controls.bottom .nav-btn, .reader-controls.bottom #page-indicator');

    // Configure View based on Mode
    if (mode === 'cascade') {
        // Show controls container (for zoom), but hide nav buttons
        controlsBottom.style.display = 'flex';
        navElements.forEach(el => el.style.display = 'none');
        renderCascadeMode();
    } else {
        controlsBottom.style.display = 'flex';
        // Show nav buttons for Single/Double
        navElements.forEach(el => el.style.display = '');

        // Create IMG elements for Single/Double
        const img1 = document.createElement('img');
        img1.id = 'page-1';
        img1.alt = 'Página 1';
        img1.onerror = function () { this.alt = '⚠️ Error al cargar imagen'; this.style.border = "1px solid red"; };
        canvas.appendChild(img1);

        if (mode === 'double') {
            const img2 = document.createElement('img');
            img2.id = 'page-2';
            img2.alt = 'Página 2';
            img2.onerror = function () { this.alt = '⚠️ Error al cargar imagen'; this.style.border = "1px solid red"; };
            canvas.appendChild(img2);
        }
        updatePage();
    }
}

// === COMMENT LOGIC ===
function getCommentKey(seriesId, chapterIndex) {
    return `comments_${seriesId}_ch${chapterIndex}`;
}

function getComments(seriesId, chapterIndex) {
    const key = getCommentKey(seriesId, chapterIndex);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
}

// === DISQUS INTEGRATION ===
const DISQUS_SHORTNAME = 'anthony sama'; // <--- CAMBIA ESTO por tu nombre de sitio en Disqus

function renderCommentSection(seriesId, chapterIndex) {
    const container = document.createElement('div');
    container.className = 'comments-container';
    container.id = 'comments-section';

    // Disqus thread container
    const disqusDiv = document.createElement('div');
    disqusDiv.id = 'disqus_thread';
    container.appendChild(disqusDiv);

    // Generar URL e identificador único para este capítulo
    const pageUrl = window.location.href.split('#')[0] + `#${seriesId}-${chapterIndex}`;
    const pageIdentifier = `${seriesId}-${chapterIndex}`;

    // Si Disqus ya está cargado (cambio de capítulo), reseteamos el hilo
    if (typeof DISQUS !== 'undefined') {
        DISQUS.reset({
            reload: true,
            config: function () {
                this.page.identifier = pageIdentifier;
                this.page.url = pageUrl;
                this.page.title = `Anthony Sama Comics - ${window.currentChapterTitle}`;
            }
        });
    } else {
        // Primera carga del script de Disqus
        window.disqus_config = function () {
            this.page.url = pageUrl;
            this.page.identifier = pageIdentifier;
            this.page.title = `Anthony Sama Comics - ${window.currentChapterTitle}`;
        };

        const d = document, s = d.createElement('script');
        s.src = `https://${DISQUS_SHORTNAME}.disqus.com/embed.js`;
        s.setAttribute('data-timestamp', +new Date());
        (d.head || d.body).appendChild(s);
    }

    return container;
}

function renderCascadeMode() {
    const canvas = document.getElementById('reader-canvas');
    currentPages.forEach((src, idx) => {
        const img = document.createElement('img');
        img.src = src;
        img.loading = 'lazy';
        img.alt = `Página ${idx + 1}`;
        img.onerror = function () {
            this.alt = '⚠️ Error al cargar imagen (formato inválido)';
            this.style.border = "1px solid red";
            this.style.padding = "20px";
            this.style.background = "#333";
        };
        canvas.appendChild(img);
    });

    // Add Comment Section at the end
    const seriesId = window.currentSeriesId;
    const chIdx = window.currentChapterIndex;
    canvas.appendChild(renderCommentSection(seriesId, chIdx));
}



function updatePage() {
    if (currentMode === 'cascade') return;

    const canvas = document.getElementById('reader-canvas');
    const img1 = document.getElementById('page-1');
    const img2 = document.getElementById('page-2');

    // Remove existing comment section if any
    const existingComments = document.getElementById('comments-section');
    if (existingComments) existingComments.remove();

    // Check if we are at the "Comment Slide"
    if (currentIndex >= currentPages.length) {
        if (img1) img1.style.display = 'none';
        if (img2) img2.style.display = 'none';

        const seriesId = window.currentSeriesId;
        const chIdx = window.currentChapterIndex;
        canvas.appendChild(renderCommentSection(seriesId, chIdx));

        indicator.textContent = `Sección de Comentarios`;
        return;
    }

    // Page 1
    if (currentPages[currentIndex]) {
        img1.src = currentPages[currentIndex];
        img1.style.display = 'block';
    } else {
        img1.style.display = 'none';
    }

    // Page 2 (Double Mode)
    if (currentMode === 'double' && img2) {
        const nextIndex = currentIndex + 1;
        if (currentPages[nextIndex]) {
            img2.src = currentPages[nextIndex];
            img2.style.display = 'block';
            indicator.textContent = `Páginas ${currentIndex + 1}-${nextIndex + 1} / ${currentPages.length}`;
        } else {
            img2.style.display = 'none';
            indicator.textContent = `Página ${currentIndex + 1} / ${currentPages.length}`;
        }
    } else {
        indicator.textContent = `Página ${currentIndex + 1} / ${currentPages.length}`;
    }
}

function nextPage() {
    if (currentMode === 'cascade') return;

    let increment = currentMode === 'double' ? 2 : 1;

    // We can go up to currentPages.length (the comment slide)
    if (currentIndex + increment <= currentPages.length) {
        currentIndex += increment;
        updatePage();
    } else if (currentIndex < currentPages.length) {
        // Handle last single page in double mode jumping to comments
        currentIndex = currentPages.length;
        updatePage();
    }
}

function prevPage() {
    if (currentMode === 'cascade') return;

    let decrement = currentMode === 'double' ? 2 : 1;

    if (currentIndex - decrement >= 0) {
        currentIndex -= decrement;
        updatePage();
    } else if (currentIndex > 0) {
        currentIndex = 0; // go to start if less than decrement
        updatePage();
    }
}

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;

    if (currentMode === 'cascade') {
        if (e.key === 'Escape') closeReader();
        return;
    }

    if (e.key === 'ArrowRight') nextPage();
    if (e.key === 'ArrowLeft') prevPage();
    if (e.key === 'Escape') closeReader();
});

// Zoom Logic
const zoomSlider = document.getElementById('zoom-slider');
if (zoomSlider) {
    zoomSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        const canvas = document.getElementById('reader-canvas');

        if (currentMode === 'cascade') {
            const baseSize = window.innerWidth > 768 ? 800 : window.innerWidth;
            if (val > 100) {
                const newSize = baseSize * (val / 100);
                canvas.style.setProperty('--cascade-width', `${newSize}px`);
                canvas.style.textAlign = 'left';
                const imgs = canvas.querySelectorAll('img');
                imgs.forEach(i => i.style.margin = '0');
            } else {
                canvas.style.setProperty('--cascade-width', `${val}%`);
                canvas.style.textAlign = 'center';
                const imgs = canvas.querySelectorAll('img');
                imgs.forEach(i => i.style.margin = '0 auto');
            }
        } else if (currentMode === 'double' || currentMode === 'single') {
            const isDouble = currentMode === 'double';
            const baseSize = isDouble ? window.innerWidth / 2 : window.innerWidth;
            const img = canvas.querySelector('img');

            if (val > 100) {
                const newWidth = baseSize * (val / 100);

                if (isDouble) {
                    canvas.style.setProperty('--double-width', `${newWidth}px`);
                } else if (img) {
                    img.style.width = `${newWidth}px`;
                    img.style.maxWidth = 'none';
                    img.style.height = 'auto';
                    canvas.style.setProperty('--single-height', 'none');
                }

                canvas.style.alignItems = 'flex-start';
                canvas.style.justifyContent = 'flex-start';
            } else {
                if (isDouble) {
                    canvas.style.setProperty('--double-width', `${val / 2}%`);
                } else if (img) {
                    canvas.style.setProperty('--single-height', `${val}%`);
                    img.style.width = 'auto';
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                }
                canvas.style.alignItems = 'center';
                canvas.style.justifyContent = 'center';
            }
        }
    });
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', initSite);
