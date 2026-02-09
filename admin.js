// Globals
let siteData = window.siteData;
let currentSeriesId = null;

// === LOGIN LOGIC ===
function attemptLogin() {
    const pass = document.getElementById('password-input').value;
    if (pass === 'admin123') { // Simple client-side protection
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        initDashboard();
    } else {
        document.getElementById('login-error').textContent = 'Contraseña incorrecta';
    }
}

// === DASHBOARD LOGIC ===
function initDashboard() {
    populateConfigForm();
    renderSeriesList();
}

function switchTab(tabName) {
    // Buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    // Content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// --- Config Tab ---
function populateConfigForm() {
    document.getElementById('hero-title').value = siteData.hero.title;
    document.getElementById('hero-tag').value = siteData.hero.tag;
    document.getElementById('hero-synopsis').value = siteData.hero.synopsis;
    document.getElementById('hero-cover').value = siteData.hero.cover;
    document.getElementById('hero-target').value = siteData.hero.targetSeriesId;
}

function saveConfigToMemory() {
    siteData.hero.title = document.getElementById('hero-title').value;
    siteData.hero.tag = document.getElementById('hero-tag').value;
    siteData.hero.synopsis = document.getElementById('hero-synopsis').value;
    siteData.hero.cover = document.getElementById('hero-cover').value;
    siteData.hero.targetSeriesId = document.getElementById('hero-target').value;
}

// --- Series Tab ---
function renderSeriesList() {
    const list = document.getElementById('series-list');
    list.innerHTML = '';

    siteData.series.forEach(s => {
        const item = document.createElement('div');
        item.className = 'series-item';
        item.innerHTML = `
            <div>
                <strong>${s.title}</strong>
                <span style="color: #94a3b8; font-size: 0.9em;">(${s.chapters.length} Caps)</span>
            </div>
            <button class="btn btn-small" onclick="openEditModal('${s.id}')">Editar</button>
        `;
        list.appendChild(item);
    });
}

function openEditModal(seriesId) {
    currentSeriesId = seriesId;
    const series = siteData.series.find(s => s.id === seriesId);

    document.getElementById('edit-title').value = series.title;
    document.getElementById('edit-genre').value = series.genre;
    document.getElementById('edit-status').value = series.status;
    document.getElementById('edit-cover').value = series.cover;

    renderChapterList(series);

    document.getElementById('edit-modal').classList.remove('hidden');
}

function renderChapterList(series) {
    const div = document.getElementById('chapter-list');
    div.innerHTML = '';
    series.chapters.forEach((ch, idx) => {
        const item = document.createElement('div');
        item.className = 'chapter-item';
        item.style.margin = "0.5rem 0";
        item.style.padding = "0.8rem";
        item.style.background = "#0f172a";
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.alignItems = "center";
        item.style.borderRadius = "6px";

        item.innerHTML = `
            <span><strong>Cap. ${idx + 1}:</strong> ${ch.title} (${ch.pages.length} págs)</span>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-small" onclick="openPageManager('${series.id}', '${ch.id}')" title="Ver y eliminar páginas">🖼️</button>
                <button class="btn btn-small" onclick="uploadPages('${series.id}', '${ch.id}')" title="Subir imágenes (Base64)">📸</button>
                <button class="btn btn-small" onclick="addPagesByPath('${series.id}', '${ch.id}')" title="Añadir por Carpeta (Recomendado)">📁 Ruta</button>
                <button class="btn btn-small btn-danger" onclick="deleteChapter('${series.id}', '${ch.id}')">✕</button>
            </div>
        `;
        div.appendChild(item);
    });
}

function deleteChapter(sId, cId) {
    if (!confirm("¿Borrar este capítulo?")) return;
    const series = siteData.series.find(s => s.id === sId);
    series.chapters = series.chapters.filter(c => c.id !== cId);
    renderChapterList(series);
}

function closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

function saveSeriesEdits() {
    const series = siteData.series.find(s => s.id === currentSeriesId);
    series.title = document.getElementById('edit-title').value;
    series.genre = document.getElementById('edit-genre').value;
    series.status = document.getElementById('edit-status').value;
    series.cover = document.getElementById('edit-cover').value;

    renderSeriesList();
    closeModal();
}

function addSeries() {
    const newId = 'series_' + Date.now();
    siteData.series.push({
        id: newId,
        title: "Nueva Serie",
        genre: "Género",
        status: "PRÓXIMAMENTE",
        cover: "assets/cover_1.svg",
        description: "",
        chapters: []
    });
    renderSeriesList();
    openEditModal(newId);
}

function deleteObj() {
    if (!confirm("¿Borrar esta serie?")) return;
    siteData.series = siteData.series.filter(s => s.id !== currentSeriesId);
    renderSeriesList();
    closeModal();
}

function addChapter() {
    const series = siteData.series.find(s => s.id === currentSeriesId);
    const title = prompt("Título del Capítulo:");
    if (!title) return;

    series.chapters.push({
        id: 'ch_' + Date.now(),
        title: title,
        pages: []
    });
    renderChapterList(series);
}

// === EMBEDDED IMAGE SYSTEM (No Folders) ===
function uploadPages(sId, cId) {
    // Create a hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';

    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const series = siteData.series.find(s => s.id === sId);
        const chapter = series.chapters.find(c => c.id === cId);
        let count = 0;

        // Visual feedback
        const btn = document.activeElement;
        if (btn) btn.textContent = "⏳ Procesando...";

        // Process files
        const MAX_SIZE = 3 * 1024 * 1024; // 3MB warning
        let errorCount = 0;

        for (const file of files) {
            // Validate Type
            if (!file.type.startsWith('image/')) {
                console.warn(`Saltado: ${file.name} no es una imagen.`);
                continue;
            }

            // High memory warning (only for huge files)
            if (file.size > 10 * 1024 * 1024) {
                console.warn(`Procesando imagen grande: ${file.name}`);
            }

            try {
                let finalString;
                const useCompression = document.getElementById('compression-toggle').checked;

                if (useCompression) {
                    finalString = await compressImage(file);
                } else {
                    console.log("Modo Seguro: Saltando compresión para", file.name);
                    finalString = await readFileAsBase64(file);
                }

                chapter.pages.push(finalString);
                count++;
            } catch (err) {
                console.error("Error processing file:", file.name, err);
                errorCount++;
            }
        }

        renderChapterList(series);

        let msg = `¡Éxito! Se han incrustado ${count} páginas.`;
        if (errorCount > 0) msg += `\n\nHubo ${errorCount} errores.`;
        msg += "\n\nIMPORTANTE: Recuerda guardar los cambios (Botón 'Guardar Config').";

        alert(msg);
    };

    input.click();
}

// === NEW PATH-BASED SYSTEM ===
function addPagesByPath(sId, cId) {
    const folder = prompt("Introduce la ruta de la carpeta (ej: assets/comics/capitulo_1/):", "assets/comics/");
    if (!folder) return;

    const count = prompt("¿Cuántas páginas hay en esa carpeta?", "20");
    if (!count || isNaN(count)) return;

    const ext = prompt("Extensión de los archivos (jpg, png, jpeg):", "jpg");
    if (!ext) return;

    const pattern = prompt("Patrón de nombre (usa {n} para el número, ej: pagina_{n}):", "{n}");
    if (!pattern) return;

    const startAt = prompt("¿Empezar en el número?", "1");
    const numStart = parseInt(startAt) || 1;

    const series = siteData.series.find(s => s.id === sId);
    const chapter = series.chapters.find(c => c.id === cId);

    const cleanFolder = folder.endsWith('/') ? folder : folder + '/';
    const cleanExt = ext.startsWith('.') ? ext.substring(1) : ext;

    for (let i = 0; i < parseInt(count); i++) {
        const num = numStart + i;
        const fileName = pattern.replace('{n}', num) + '.' + cleanExt;
        chapter.pages.push(cleanFolder + fileName);
    }

    renderChapterList(series);
    alert(`Se han añadido ${count} rutas al capítulo.\n\nIMPORTANTE: Asegúrate de que las imágenes estén físicamente en esa carpeta dentro del proyecto.`);
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// === SAVE SYSTEM ===
async function saveChanges() {
    saveConfigToMemory();

    const jsonString = JSON.stringify(siteData, null, 4);
    const fileContent = `window.siteData = ${jsonString};`;

    try {
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'data.js',
                types: [{
                    description: 'JavaScript Data File',
                    accept: { 'text/javascript': ['.js'] },
                }],
            });

            const writable = await handle.createWritable();
            await writable.write(fileContent);
            await writable.close();

            alert("¡Guardado EXITOSO!");
            return;
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error(err);
        } else {
            return;
        }
    }

    const blob = new Blob([fileContent], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert("¡Archivo descargado!\n\nMueve 'data.js' a la carpeta del sitio y reemplaza el existente.");
}

// === IMAGE COMPRESSION UTILS ===
function compressImage(file) {
    return new Promise((resolve, reject) => {
        console.log(`Iniciando compresión: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        const MAX_WIDTH = 1600; // Good balance for 1080p screens
        const QUALITY = 0.8;    // JPEG Quality

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;


                // Scale logic
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                width = Math.floor(width);
                height = Math.floor(height);

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Export as JPEG
                try {
                    const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
                    console.log(`Compresión finalizada: ${file.name} -> ${(dataUrl.length / 1024 / 1024).toFixed(2)} MB (aprox)`);
                    resolve(dataUrl);
                } catch (e) {
                    console.error("Error al exportar canvas:", e);
                    // Fallback to original if canvas fails (rare)
                    resolve(event.target.result);
                }
            };
            img.onerror = (err) => {
                console.error("Error al cargar imagen en objeto Image:", err);
                reject(err);
            };
        };
        reader.onerror = (err) => {
            console.error("Error al leer archivo:", err);
            reject(err);
        };
    });
}

// === PAGE MANAGER LOGIC ===
function openPageManager(sId, cId) {
    const series = siteData.series.find(s => s.id === sId);
    if (!series) return;
    const chapter = series.chapters.find(c => c.id === cId);
    if (!chapter) return;

    document.getElementById('manager-title').textContent = `Páginas: ${chapter.title}`;
    renderPagesGrid(sId, cId);

    document.getElementById('page-manager-modal').classList.remove('hidden');
}

function closePageManager() {
    document.getElementById('page-manager-modal').classList.add('hidden');
}

function renderPagesGrid(sId, cId) {
    const series = siteData.series.find(s => s.id === sId);
    const chapter = series.chapters.find(c => c.id === cId);
    const grid = document.getElementById('pages-grid');
    grid.innerHTML = '';

    if (chapter.pages.length === 0) {
        grid.innerHTML = '<p style="color: #94a3b8; text-align: center; width: 100%; padding: 2rem;">No hay páginas cargadas.</p>';
        return;
    }

    chapter.pages.forEach((page, index) => {
        const container = document.createElement('div');
        container.className = 'page-thumb-container';

        const isFirst = index === 0;
        const isLast = index === chapter.pages.length - 1;

        container.innerHTML = `
            <img src="${page}" alt="Página ${index + 1}">
            <div class="page-num">${index + 1}</div>
            
            <div class="btn-reorder-group">
                <button class="btn-move" onclick="movePage('${sId}', '${cId}', ${index}, -1)" ${isFirst ? 'disabled' : ''} title="Subir">▲</button>
                <button class="btn-move" onclick="movePage('${sId}', '${cId}', ${index}, 1)" ${isLast ? 'disabled' : ''} title="Bajar">▼</button>
            </div>

            <button class="btn-del-page" onclick="deletePage('${sId}', '${cId}', ${index})" title="Eliminar esta página">✕</button>
        `;
        grid.appendChild(container);
    });
}

function movePage(sId, cId, index, direction) {
    const series = siteData.series.find(s => s.id === sId);
    const chapter = series.chapters.find(c => c.id === cId);

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= chapter.pages.length) return;

    // Swap pages
    const temp = chapter.pages[index];
    chapter.pages[index] = chapter.pages[newIndex];
    chapter.pages[newIndex] = temp;

    renderPagesGrid(sId, cId);
    // No need to refresh chapter list as page count hasn't changed
}

function deletePage(sId, cId, index) {
    if (!confirm(`¿Seguro que quieres eliminar la página ${index + 1}?`)) return;

    const series = siteData.series.find(s => s.id === sId);
    const chapter = series.chapters.find(c => c.id === cId);

    chapter.pages.splice(index, 1);

    renderPagesGrid(sId, cId);
    renderChapterList(series); // Update page count in main list
}
