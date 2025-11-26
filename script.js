document.addEventListener('DOMContentLoaded', function () {
    // State Management
    let kriterien = [
        { text: "Aufmerksames Zuhören", gewicht: 1 },
        { text: "Konstruktive Beiträge", gewicht: 1 },
        { text: "Kontinuierliche Beteiligung", gewicht: 1 },
        { text: "Sorgfältige Arbeitsweise", gewicht: 1 },
        { text: "Selbstständiges Arbeiten", gewicht: 1 },
        { text: "Respektvoller Umgang", gewicht: 1 },
        { text: "Tabletnutzung sinnvoll", gewicht: 1 },
        { text: "Arbeitsaufträge erfüllt", gewicht: 1 }
    ];
    let abstufungen = [
    "Herausragend",
    "Stark ausgeprägt",
    "Deutlich ausgeprägt",
    "Erkennbar",
    "Ansatzweise erkennbar",
    "Noch nicht erkennbar"
  ];
    let schueler = [];
    let klassen = {}; // { "6a": { "Mathe": { schueler: ["Anna", "Ben"], bewertungen: { "Anna": [...] } } } }
    let aktuelleKlasse = null;
    let aktuellesFach = null;
    let aktuellerSchuelerName = null;
    let geladeneVorlagen = {};

    // DOM-Elemente
    const klasseSelect = document.getElementById('klasse-select');
    const neueKlasseInput = document.getElementById('neue-klasse-input');
    const neueKlasseBtn = document.getElementById('neue-klasse-btn');
    const loescheKlasseBtn = document.getElementById('loesche-klasse-btn');
    const fachSelect = document.getElementById('fach-select');
    const neuesFachInput = document.getElementById('neues-fach-input');
    const neuesFachBtn = document.getElementById('neues-fach-btn');
    const loescheFachBtn = document.getElementById('loesche-fach-btn');
    const kriterienContainer = document.getElementById('kriterien-container');
    const kriterienInput = document.getElementById('kriterien-input');
    const abstufungenContainer = document.getElementById('abstufungen-container');
    const abstufungenInput = document.getElementById('abstufungen-input');
    const rasterErstellenBtn = document.getElementById('raster-erstellen-btn');

    const schuelerInput = document.getElementById('schueler-input');
    const schuelerAnlegenBtn = document.getElementById('schueler-anlegen-btn');
    const klassenTabsContainer = document.getElementById('klassen-tabs-container');
    const faecherTabsContainer = document.getElementById('faecher-tabs-container');
    const schuelerTabsContainer = document.getElementById('schueler-tabs-container');

    const rasterPlatzhalter = document.getElementById('raster-platzhalter');
    const rasterContainer = document.getElementById('raster-container');
    const rasterTitel = document.getElementById('raster-titel');
    const kompetenzRaster = document.getElementById('kompetenz-raster');

    const auswertungPlatzhalter = document.getElementById('auswertung-platzhalter');
    const auswertungContainer = document.getElementById('auswertung-container');
    const auswertungTitel = document.getElementById('auswertung-titel');
    const auswertungChart = document.getElementById('auswertung-chart');
    const notenvorschlagSpan = document.getElementById('notenvorschlag');

    const saveStateBtn = document.getElementById('save-state-btn');
    const loadStateBtn = document.getElementById('load-state-btn');
    const loadStateInput = document.getElementById('load-state-input');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportGradesBtn = document.getElementById('export-grades-btn');
    const exportKlasseSelect = document.getElementById('export-klasse-select');
    const exportFachSelect = document.getElementById('export-fach-select');
    const saveVorlageBtn = document.getElementById('save-vorlage-btn');
    const loadVorlageBtn = document.getElementById('load-vorlage-btn');
    const vorlagenSelect = document.getElementById('vorlagen-select');

    // Modal elements
    const modal = document.getElementById('notification-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContentText = document.getElementById('modal-content-text');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // --- Notification Modal Logic ---
    function showNotification(title, message) {
        modalTitle.textContent = title;
        modalContentText.textContent = message;
        modal.classList.remove('hidden');
    }
    modalCloseBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });


    // --- Tag Input Logik ---
    function setupTagInput(container, input, dataArray, property = null) {
        let draggedIndex = -1;

        function renderTags() {
            container.querySelectorAll('.tag').forEach(tag => tag.remove());
            dataArray.forEach((item, index) => {
                const tag = document.createElement('span');
                tag.className = 'tag';
                tag.textContent = property ? item[property] : item;
                tag.draggable = true;
                tag.dataset.index = index;

                // Drag-and-Drop Event Listener
                tag.addEventListener('dragstart', (e) => {
                    draggedIndex = index;
                    e.dataTransfer.effectAllowed = 'move';
                    setTimeout(() => e.target.classList.add('dragging'), 0);
                });

                tag.addEventListener('dragend', (e) => {
                    e.target.classList.remove('dragging');
                });

                if (property === 'text') { // Nur für Kriterien
                    const gewichtBtn = document.createElement('span');
                    gewichtBtn.className = 'gewicht-indicator-main';
                    gewichtBtn.textContent = `x${item.gewicht}`;
                    gewichtBtn.title = 'Klick, um die Standard-Gewichtung für dieses Kriterium zu ändern.';
                    gewichtBtn.onclick = (e) => {
                        e.stopPropagation(); // Verhindert, dass Drag-Events ausgelöst werden
                        // Zyklus: 1 -> 2 -> 3 -> 0 -> 1
                        item.gewicht = (item.gewicht + 1) % 4;
                        renderTags();
                    };
                    tag.appendChild(gewichtBtn);
                }

                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '&times;';
                removeBtn.onclick = () => {
                    if (container === kriterienContainer) {
                        const fach = klassen[aktuelleKlasse]?.[aktuellesFach];
                        if (fach) {
                            // Sync student evaluations before removing the criterion
                            Object.values(fach.bewertungen).forEach(schuelerBewertung => {
                                schuelerBewertung.bewertung.splice(index, 1);
                            });
                        }
                    }
                    dataArray.splice(index, 1);
                    renderTags();
                    if (container === kriterienContainer || container === abstufungenContainer) {
                        erstelleRaster();
                    }
                };
                tag.appendChild(removeBtn);
                container.insertBefore(tag, input);
            });
        }

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(container, e.clientY);
            const dragging = container.querySelector('.dragging');
            if (dragging) {
                if (afterElement == null) {
                    container.insertBefore(dragging, input);
                } else {
                    container.insertBefore(dragging, afterElement);
                }
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const target = e.target.closest('.tag');
            if (target && draggedIndex !== -1) {
                const newTargetIndex = Array.from(container.querySelectorAll('.tag:not(.dragging)')).indexOf(target);

                if (container === kriterienContainer) {
                    const fach = klassen[aktuelleKlasse]?.[aktuellesFach];
                    if (fach) {
                        // Sync student evaluations before reordering the criterion
                        Object.values(fach.bewertungen).forEach(schuelerBewertung => {
                            const [draggedBewertung] = schuelerBewertung.bewertung.splice(draggedIndex, 1);
                            schuelerBewertung.bewertung.splice(newTargetIndex, 0, draggedBewertung);
                        });
                    }
                }

                const [draggedItem] = dataArray.splice(draggedIndex, 1);
                dataArray.splice(newTargetIndex, 0, draggedItem);

                renderTags();
                if (container === kriterienContainer || container === abstufungenContainer) {
                    erstelleRaster();
                    updateAuswertung();
                }
            }
            draggedIndex = -1;
        });

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.tag:not(.dragging)')];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && input.value.trim() !== '') {
                e.preventDefault();
                const value = input.value.trim();
                const exists = property ? dataArray.some(item => item[property] === value) : dataArray.includes(value);

                if (!exists) {
                    const newItem = property ? { [property]: value, gewicht: 1 } : value;
                    dataArray.push(newItem);

                    // Sync student evaluations when adding a new criterion
                    if (container === kriterienContainer) {
                        const fach = klassen[aktuelleKlasse]?.[aktuellesFach];
                        if (fach) {
                            Object.values(fach.bewertungen).forEach(schuelerBewertung => {
                                schuelerBewertung.bewertung.push({ wert: null, gewicht: newItem.gewicht });
                            });
                        }
                    }

                    input.value = '';
                    renderTags();
                    if (container === kriterienContainer || container === abstufungenContainer) {
                        erstelleRaster();
                    }
                }
            }
        });

        renderTags();
        return renderTags;
    }


    let renderKriterienTags = () => {}; // Initialisiere als leere Funktion
    const renderAbstufungenTags = setupTagInput(abstufungenContainer, abstufungenInput, abstufungen);

    function updateKriterienInput() {
        const kriterienArray = klassen[aktuelleKlasse]?.[aktuellesFach]?.kriterien || kriterien;
        renderKriterienTags = setupTagInput(kriterienContainer, kriterienInput, kriterienArray, 'text');
    }

    // --- Schüler-Logik ---
    schuelerAnlegenBtn.addEventListener('click', () => {
        const klasseName = klasseSelect.value;
        const fachName = fachSelect.value;
        const schuelerText = schuelerInput.value.trim();

        if (!klasseName || !fachName || schuelerText === '') {
            showNotification('Eingabefehler', 'Bitte wählen Sie eine Klasse, ein Fach und geben Sie mindestens einen Schülernamen ein.');
            return;
        }

        const namenArray = schuelerText.split('\n').map(line => {
            const parts = line.trim().split(/\s+/); // Trennt bei Tab oder Leerzeichen
            if (parts.length >= 2) {
                const nachname = parts[0];
                const vorname = parts.slice(1).join(' ');
                return `${vorname} ${nachname}`;
            }
            return line.trim(); // Fallback, falls nur ein Name pro Zeile
        }).filter(name => name);

        if (namenArray.length === 0) {
            showNotification('Eingabefehler', 'Keine gültigen Namen gefunden. Bitte überprüfen Sie das Format.');
            return;
        }

        const names = namenArray;

        if (!klassen[klasseName]) {
            klassen[klasseName] = {};
        }
        if (!klassen[klasseName][fachName]) {
            klassen[klasseName][fachName] = { schueler: [], bewertungen: {} };
        }

        const fach = klassen[klasseName][fachName];
        const neueSchueler = names.filter(name => !fach.schueler.includes(name));
        fach.schueler = [...fach.schueler, ...neueSchueler].sort();

        const fachKriterien = fach.kriterien || kriterien;
        neueSchueler.forEach(name => {
            fach.bewertungen[name] = {
                bewertung: fachKriterien.map(kriterium => ({
                    wert: null,
                    gewicht: kriterium.gewicht
                }))
            };
        });

        aktuelleKlasse = klasseName;
        aktuellesFach = fachName;
        aktuellerSchuelerName = fach.schueler[0];

        renderKlassenTabs();
        renderFaecherTabs();
        renderSchuelerTabs();
        erstelleRaster();
        updateAuswertung();
        updateExportSelects();
    });

    function renderKlassenTabs() {
        klassenTabsContainer.innerHTML = '';
        Object.keys(klassen).sort().forEach(name => {
            const tab = document.createElement('button');
            tab.textContent = name;
            tab.className = 'schueler-tab'; // Wiederverwendung der Stile
            if (name === aktuelleKlasse) {
                tab.classList.add('active');
            }
            tab.onclick = () => {
                aktuelleKlasse = name;
                aktuellesFach = Object.keys(klassen[aktuelleKlasse])[0] || null;
                aktuellerSchuelerName = aktuellesFach ? klassen[aktuelleKlasse][aktuellesFach].schueler[0] || null : null;
                renderKlassenTabs();
                renderFaecherTabs();
                renderSchuelerTabs();
                erstelleRaster();
                updateAuswertung();
        updateExportSelects();
            };
            klassenTabsContainer.appendChild(tab);
        });
    }

    function renderFaecherTabs() {
        faecherTabsContainer.innerHTML = '';
        if (!aktuelleKlasse || !klassen[aktuelleKlasse]) return;

        Object.keys(klassen[aktuelleKlasse]).sort().forEach(name => {
            const tab = document.createElement('button');
            tab.textContent = name;
            tab.className = 'schueler-tab';
            if (name === aktuellesFach) {
                tab.classList.add('active');
            }
            tab.onclick = () => {
                aktuellesFach = name;
                aktuellerSchuelerName = klassen[aktuelleKlasse][aktuellesFach].schueler[0] || null;
                renderFaecherTabs();
                renderSchuelerTabs();
                erstelleRaster();
                updateAuswertung();
            };
            faecherTabsContainer.appendChild(tab);
        });
    }

    function renderSchuelerTabs() {
        schuelerTabsContainer.innerHTML = '';
        if (!aktuelleKlasse || !aktuellesFach) return;

        const schueler = klassen[aktuelleKlasse][aktuellesFach].schueler;
        schueler.forEach(name => {
            const tab = document.createElement('button');
            tab.textContent = name;
            tab.className = 'schueler-tab';
            if (name === aktuellerSchuelerName) {
                tab.classList.add('active');
            }
            tab.onclick = () => {
                aktuellerSchuelerName = name;
                renderSchuelerTabs();
                erstelleRaster();
                updateAuswertung();
            };
            schuelerTabsContainer.appendChild(tab);
        });
    }

    // --- Combo Box Logik ---
    function updateKlasseSelect() {
        const klassenNamen = Object.keys(klassen).sort();
        klasseSelect.innerHTML = '';
        klassenNamen.forEach(name => {
            const option = document.createElement('option');
            option.value = option.textContent = name;
            klasseSelect.appendChild(option);
        });
        if (aktuelleKlasse) {
            klasseSelect.value = aktuelleKlasse;
        }
    }

    function updateFachSelect() {
        fachSelect.innerHTML = '';
        if (!aktuelleKlasse || !klassen[aktuelleKlasse]) return;

        const faecherNamen = Object.keys(klassen[aktuelleKlasse]).sort();
        faecherNamen.forEach(name => {
            const option = document.createElement('option');
            option.value = option.textContent = name;
            fachSelect.appendChild(option);
        });
        if (aktuellesFach) {
            fachSelect.value = aktuellesFach;
        }
    }

    neueKlasseBtn.addEventListener('click', () => {
        const neueKlasse = neueKlasseInput.value.trim();
        if (neueKlasse && !klassen[neueKlasse]) {
            klassen[neueKlasse] = {};
            aktuelleKlasse = neueKlasse;
            aktuellesFach = null;
            neueKlasseInput.value = '';
            renderAllFromState();
        }
    });

    loescheKlasseBtn.addEventListener('click', () => {
        const klasseZumLoeschen = klasseSelect.value;
        if (klasseZumLoeschen && klassen[klasseZumLoeschen]) {
            delete klassen[klasseZumLoeschen];

            // Setze den aktuellen Status zurück oder wähle die nächste Klasse
            const verbleibendeKlassen = Object.keys(klassen);
            aktuelleKlasse = verbleibendeKlassen.length > 0 ? verbleibendeKlassen[0] : null;
            aktuellesFach = aktuelleKlasse ? Object.keys(klassen[aktuelleKlasse])[0] || null : null;
            aktuellerSchuelerName = null; // Schüler-Kontext zurücksetzen

            renderAllFromState();
            updateExportSelects();
        } else {
            showNotification('Hinweis', 'Bitte wählen Sie eine Klasse zum Löschen aus.');
        }
    });

    neuesFachBtn.addEventListener('click', () => {
        const neuesFach = neuesFachInput.value.trim();
        if (neuesFach && aktuelleKlasse && !klassen[aktuelleKlasse][neuesFach]) {
            klassen[aktuelleKlasse][neuesFach] = {
                schueler: [],
                bewertungen: {},
                // Kriterien tief kopieren, um Unabhängigkeit zu gewährleisten
                kriterien: kriterien.map(k => ({...k}))
            };
            aktuellesFach = neuesFach;
            neuesFachInput.value = '';
            renderAllFromState();
        }
    });

    loescheFachBtn.addEventListener('click', () => {
        const fachZumLoeschen = fachSelect.value;
        if (aktuelleKlasse && fachZumLoeschen && klassen[aktuelleKlasse][fachZumLoeschen]) {
            delete klassen[aktuelleKlasse][fachZumLoeschen];

            const verbleibendeFaecher = Object.keys(klassen[aktuelleKlasse]);
            aktuellesFach = verbleibendeFaecher.length > 0 ? verbleibendeFaecher[0] : null;
            aktuellerSchuelerName = null; // Schüler-Kontext zurücksetzen

            renderAllFromState();
            updateExportSelects();
        } else {
            showNotification('Hinweis', 'Bitte wählen Sie ein Fach zum Löschen aus.');
        }
    });

    klasseSelect.addEventListener('change', () => {
        aktuelleKlasse = klasseSelect.value;
        const faecher = Object.keys(klassen[aktuelleKlasse]);
        aktuellesFach = faecher.length > 0 ? faecher[0] : null;
        renderAllFromState();
    });

    fachSelect.addEventListener('change', () => {
        aktuellesFach = fachSelect.value;
        renderAllFromState();
    });


    // --- Raster-Logik ---
    rasterErstellenBtn.addEventListener('click', () => {
        const fach = klassen[aktuelleKlasse]?.[aktuellesFach];
        if (!fach || fach.kriterien.length === 0 || abstufungen.length === 0) {
            showNotification('Eingabefehler', 'Bitte definieren Sie mindestens ein Kriterium und eine Abstufung oder wählen Sie ein Fach aus.');
            return;
        }

        // Übertrage die Standard-Gewichtung aus der Kriterien-Liste auf alle Schüler des Fachs
        const fachKriterien = fach.kriterien;
        Object.values(fach.bewertungen).forEach(schuelerBewertung => {
            schuelerBewertung.bewertung.forEach((bewertungObj, index) => {
                bewertungObj.gewicht = fachKriterien[index].gewicht;
            });
        });

        erstelleRaster();
        updateAuswertung();
        showNotification('Erfolg', 'Das Raster wurde aktualisiert und die Standard-Gewichtungen wurden auf alle Schüler angewendet.');
    });

    function erstelleRaster() {
        const fach = klassen[aktuelleKlasse]?.[aktuellesFach];
        if (!fach || fach.kriterien.length === 0 || abstufungen.length === 0 || !aktuellerSchuelerName) {
            rasterContainer.classList.add('hidden');
            rasterPlatzhalter.classList.remove('hidden');
            return;
        }
        rasterPlatzhalter.classList.add('hidden');
        rasterContainer.classList.remove('hidden');
        rasterTitel.textContent = `Bewertungsraster für: ${aktuellerSchuelerName} (${aktuelleKlasse} - ${aktuellesFach})`;

        kompetenzRaster.innerHTML = '';

        const thead = document.createElement('thead');
        let headerRow = '<tr><th class="text-left">Kriterium</th>';
        abstufungen.forEach(stufe => {
            headerRow += `<th class="text-center">${stufe}</th>`;
        });
        headerRow += '</tr>';
        thead.innerHTML = headerRow;
        kompetenzRaster.appendChild(thead);

        const tbody = document.createElement('tbody');
        const aktuelleBewertungen = fach.bewertungen[aktuellerSchuelerName].bewertung;
        fach.kriterien.forEach((kriterium, kIndex) => {
            const gewicht = aktuelleBewertungen[kIndex] ? aktuelleBewertungen[kIndex].gewicht : 1;
            let row = `<tr>
                        <td class="font-medium kriterium-zelle" data-kriterium-index="${kIndex}">
                            ${kriterium.text}
                            <span class="gewicht-indicator">x${gewicht}</span>
                        </td>`;
            abstufungen.forEach((_, aIndex) => {
                row += `<td class="grid-cell" data-kriterium-index="${kIndex}" data-abstufung-index="${aIndex}"></td>`;
            });
            row += '</tr>';
            tbody.innerHTML += row;
        });
        kompetenzRaster.appendChild(tbody);

        addGridCellListeners();
        updateRasterAnsicht();
    }

    function addGridCellListeners() {
        // Klick auf Bewertungszellen
        kompetenzRaster.querySelectorAll('.grid-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                if (!aktuelleKlasse || !aktuellesFach || !aktuellerSchuelerName) return;

                const kIndex = parseInt(cell.dataset.kriteriumIndex);
                const aIndex = parseInt(cell.dataset.abstufungIndex);
                const bewertungObj = klassen[aktuelleKlasse][aktuellesFach].bewertungen[aktuellerSchuelerName].bewertung[kIndex];

                if (bewertungObj.wert === aIndex) {
                    bewertungObj.wert = null; // Deselektieren
                } else {
                    bewertungObj.wert = aIndex; // Selektieren
                }

                updateRasterAnsicht();
                updateAuswertung();
            });
        });

        // Klick auf Kriterium-Zelle zur Gewichtung
        kompetenzRaster.querySelectorAll('.kriterium-zelle').forEach(zelle => {
            zelle.addEventListener('click', () => {
                if (!aktuelleKlasse || !aktuellesFach || !aktuellerSchuelerName) return;

                const kIndex = parseInt(zelle.dataset.kriteriumIndex);
                const bewertungObj = klassen[aktuelleKlasse][aktuellesFach].bewertungen[aktuellerSchuelerName].bewertung[kIndex];

                // Zyklus: 1 -> 2 -> 3 -> 0 -> 1
                bewertungObj.gewicht = bewertungObj.gewicht === 1 ? 2 : bewertungObj.gewicht === 2 ? 3 : bewertungObj.gewicht === 3 ? 0 : 1;

                // UI direkt aktualisieren und neu berechnen
                updateRasterAnsicht();
                updateAuswertung();
            });
        });
    }

    function updateRasterAnsicht() {
        if (!aktuelleKlasse || !aktuellesFach || !aktuellerSchuelerName || !klassen[aktuelleKlasse][aktuellesFach].bewertungen[aktuellerSchuelerName]) return;
        const aktuelleBewertung = klassen[aktuelleKlasse][aktuellesFach].bewertungen[aktuellerSchuelerName].bewertung;

        kompetenzRaster.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('selected');
            for (let i = 0; i < abstufungen.length; i++) {
                cell.classList.remove(`selected-color-${i}`);
            }
        });

        // Kriterien-Zellen (Gewichtung) aktualisieren
        kompetenzRaster.querySelectorAll('.kriterium-zelle').forEach(zelle => {
             const kIndex = parseInt(zelle.dataset.kriteriumIndex);
             const gewicht = aktuelleBewertung[kIndex].gewicht;
             const indicator = zelle.querySelector('.gewicht-indicator');
             if(indicator) {
                indicator.textContent = `x${gewicht}`;
             }
        });

        aktuelleBewertung.forEach((bewertungObj, kIndex) => {
            if (bewertungObj.wert !== null) {
                const cell = kompetenzRaster.querySelector(`[data-kriterium-index="${kIndex}"][data-abstufung-index="${bewertungObj.wert}"]`);
                if (cell) {
                    cell.classList.add('selected');
                    cell.classList.add(`selected-color-${bewertungObj.wert}`);
                }
            }
        });
    }

    // --- Auswertungs-Logik ---
    const farben = ["#22c55e", "#38bdf8", "#facc15", "#f97316", "#ef4444", "#000000"];

    function berechneNotenvorschlag(bewertungen) {
        const gewichteteKriterien = bewertungen.filter(b => b.gewicht > 0);
        const benoteteGewichteteKriterien = gewichteteKriterien.filter(b => b.wert !== null);

        if (gewichteteKriterien.length > 0 && benoteteGewichteteKriterien.length < gewichteteKriterien.length) {
            return null; // Not all weighted criteria have been graded
        }

        if (benoteteGewichteteKriterien.length === 0) {
            return null; // No criteria to average
        }

        let gewichteteSumme = 0;
        let gesamtGewicht = 0;

        benoteteGewichteteKriterien.forEach(b => {
            const note = b.wert + 1;
            gewichteteSumme += note * b.gewicht;
            gesamtGewicht += b.gewicht;
        });

        if (gesamtGewicht === 0) return null;

        const durchschnitt = gewichteteSumme / gesamtGewicht;
        return durchschnitt.toFixed(2);
    }

    function updateAuswertung() {
        if (!aktuelleKlasse || !aktuellesFach || !aktuellerSchuelerName || !klassen[aktuelleKlasse][aktuellesFach].bewertungen[aktuellerSchuelerName] || klassen[aktuelleKlasse][aktuellesFach].bewertungen[aktuellerSchuelerName].bewertung.every(b => b.wert === null)) {
            auswertungContainer.classList.add('hidden');
            auswertungPlatzhalter.classList.remove('hidden');
            return;
        }
        auswertungPlatzhalter.classList.add('hidden');
        auswertungContainer.classList.remove('hidden');
        auswertungTitel.textContent = `Visuelle Auswertung für: ${aktuellerSchuelerName}`;
        auswertungChart.innerHTML = '';

        const aktuelleBewertung = klassen[aktuelleKlasse][aktuellesFach].bewertungen[aktuellerSchuelerName].bewertung;

        const notenvorschlag = berechneNotenvorschlag(aktuelleBewertung);
        if (notenvorschlag) {
            notenvorschlagSpan.textContent = notenvorschlag;
        } else {
            notenvorschlagSpan.textContent = '--';
        }

        const fachKriterien = klassen[aktuelleKlasse][aktuellesFach].kriterien;
        fachKriterien.forEach((kriterium, kIndex) => {
            const bewertungObj = aktuelleBewertung[kIndex];
            if (!bewertungObj || bewertungObj.wert === null || bewertungObj.wert >= abstufungen.length) return;
            const bewertungIndex = bewertungObj.wert;

            const prozent = (abstufungen.length - bewertungIndex) / abstufungen.length * 100;
            const farbe = farben[bewertungIndex % farben.length];

            const barContainer = document.createElement('div');

            const labelContainer = document.createElement('div');
            labelContainer.className = 'progress-bar-label-container';

            const kriteriumLabel = document.createElement('span');
            kriteriumLabel.textContent = kriterium.text;
            kriteriumLabel.className = 'progress-bar-kriterium';

            const stufeLabel = document.createElement('span');
            stufeLabel.textContent = abstufungen[bewertungIndex];
            stufeLabel.className = 'progress-bar-stufe';
            stufeLabel.style.backgroundColor = farbe;
            if (farbe === '#000000') {
                stufeLabel.style.color = '#ffffff';
            }

            labelContainer.appendChild(kriteriumLabel);
            labelContainer.appendChild(stufeLabel);

            const progressBg = document.createElement('div');
            progressBg.className = 'progress-bar-bg';

            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar-fill';
            progressBar.style.width = `${prozent}%`;
            progressBar.style.backgroundColor = farbe;

            progressBg.appendChild(progressBar);
            barContainer.appendChild(labelContainer);
            barContainer.appendChild(progressBg);
            auswertungChart.appendChild(barContainer);
        });
    }

    // --- Save & Load Logic ---
    function renderAllFromState() {
        updateKriterienInput();
        renderAbstufungenTags();
        updateKlasseSelect();
        updateFachSelect();

        schueler.length = 0;
        if (aktuelleKlasse && aktuellesFach && klassen[aktuelleKlasse][aktuellesFach]) {
            const fach = klassen[aktuelleKlasse][aktuellesFach];
            Array.prototype.push.apply(schueler, fach.schueler);
        }

        renderKlassenTabs();
        renderFaecherTabs();
        renderSchuelerTabs();
        erstelleRaster();
        updateAuswertung();
    }

    saveStateBtn.addEventListener('click', () => {
        if (Object.keys(klassen).length === 0) {
            showNotification('Hinweis', 'Es sind keine Daten zum Speichern vorhanden.');
            return;
        }
        // Das globale `kriterien` wird nicht mehr benötigt, da es pro Fach gespeichert ist.
        const state = { abstufungen, klassen };
        const dataStr = JSON.stringify(state, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.download = `kompetenzraster_stand_${new Date().toISOString().slice(0, 10)}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    loadStateBtn.addEventListener('click', () => {
        loadStateInput.click();
    });

    loadStateInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Prüfen, ob das Laden erfolgreich war und die notwendigen Daten vorhanden sind
                if (!data.klassen || !data.abstufungen) {
                    showNotification('Fehler', 'Die JSON-Datei hat ein ungültiges Format.');
                    return;
                }

                // Globales `abstufungen` aktualisieren
                abstufungen.length = 0;
                Array.prototype.push.apply(abstufungen, data.abstufungen);

                // `klassen` Objekt übernehmen
                klassen = data.klassen;

                // Datenmigration für Kriterien (global und pro Fach)
                function migrateKriterien(kriterienArray) {
                    if (!kriterienArray || kriterienArray.length === 0) return [];
                    // Check if the first element is a string to decide on migration
                    if (typeof kriterienArray[0] === 'string') {
                        return kriterienArray.map(k => ({ text: k, gewicht: 1 }));
                    }
                    // Already in the new format
                    return kriterienArray;
                }

                if (data.kriterien) {
                    kriterien.length = 0;
                    Array.prototype.push.apply(kriterien, migrateKriterien(data.kriterien));
                }

                Object.values(klassen).forEach(fachMap => {
                    Object.values(fachMap).forEach(fach => {
                        if (fach.kriterien) {
                            fach.kriterien = migrateKriterien(fach.kriterien);
                        } else if (data.kriterien) {
                             // Fallback für sehr alte Speicherstände ohne fach.kriterien
                            fach.kriterien = migrateKriterien(data.kriterien);
                        }
                    });
                });



                aktuelleKlasse = Object.keys(klassen)[0] || null;
                aktuellesFach = aktuelleKlasse ? Object.keys(klassen[aktuelleKlasse])[0] || null : null;
                aktuellerSchuelerName = aktuellesFach ? klassen[aktuelleKlasse][aktuellesFach].schueler[0] || null : null;

                renderAllFromState();
                updateExportSelects();
                showNotification('Erfolg', 'Der Bearbeitungsstand wurde erfolgreich geladen.');

            } catch (error) {
                console.error('Error parsing JSON:', error);
                showNotification('Fehler', 'Die Datei konnte nicht gelesen werden. Stellen Sie sicher, dass es eine gültige JSON-Datei ist.');
            }
        };
        reader.readAsText(file);
        event.target.value = null; // Allow loading the same file again
    });

    // --- Export-Logik ---
    function updateExportSelects() {
        const ausgewaehlteKlasse = exportKlasseSelect.value;
        exportKlasseSelect.innerHTML = '';

        const klassenNamen = Object.keys(klassen).sort();
        if (klassenNamen.length === 0) {
            exportKlasseSelect.innerHTML = '<option>Keine Klassen</option>';
            exportFachSelect.innerHTML = '<option>Keine Fächer</option>';
            return;
        }

        klassenNamen.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            exportKlasseSelect.appendChild(option);
        });

        if (ausgewaehlteKlasse && klassenNamen.includes(ausgewaehlteKlasse)) {
            exportKlasseSelect.value = ausgewaehlteKlasse;
        }

        updateExportFachSelect();
    }

    function updateExportFachSelect() {
        const klasseName = exportKlasseSelect.value;
        exportFachSelect.innerHTML = '';
        if (!klasseName || !klassen[klasseName]) {
             exportFachSelect.innerHTML = '<option>Keine Fächer</option>';
            return;
        }

        const faecherNamen = Object.keys(klassen[klasseName]).sort();
        faecherNamen.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            exportFachSelect.appendChild(option);
        });
    }

    exportKlasseSelect.addEventListener('change', updateExportFachSelect);


    const { jsPDF } = window.jspdf;

    async function exportAllToPdf() {
        const klasseName = exportKlasseSelect.value;
        const fachName = exportFachSelect.value;

        if (!klasseName || !fachName || !klassen[klasseName] || !klassen[klasseName][fachName]) {
            showNotification('Hinweis', 'Bitte wählen Sie eine gültige Klasse und ein Fach für den Export aus.');
            return;
        }

        exportPdfBtn.disabled = true;
        exportPdfBtn.textContent = 'Exportiere...';

        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let isFirstPage = true;

        const originalState = { aktuelleKlasse, aktuellesFach, aktuellerSchuelerName };

        const fach = klassen[klasseName][fachName];
        for (const schuelerName of fach.schueler) {

            if (!isFirstPage) {
                doc.addPage();
            }
            isFirstPage = false;

            // Temporär Zustand für die Darstellung wechseln
            aktuelleKlasse = klasseName;
            aktuellesFach = fachName;
            aktuellerSchuelerName = schuelerName;
            renderAllFromState();
            await new Promise(resolve => setTimeout(resolve, 100)); // Warten auf UI-Update

            const hatBewertung = fach.bewertungen[schuelerName] && !fach.bewertungen[schuelerName].bewertung.every(b => b === null);

            doc.setFontSize(10);
            doc.text(`Klasse: ${klasseName}`, margin, margin - 5);
            doc.text(`Fach: ${fachName}`, pageWidth - margin, margin - 5, { align: 'right' });

            if (!hatBewertung) {
                doc.setFontSize(18);
                doc.text(`Auswertung für: ${schuelerName}`, margin, 25);
                doc.setFontSize(12);
                doc.text('Für diesen Schüler/diese Schülerin liegt noch keine Bewertung vor.', margin, 35);
                continue;
            }

            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.width = '800px';
            document.body.appendChild(tempContainer);

            const titleClone = auswertungTitel.cloneNode(true);
            titleClone.textContent = `Auswertung für: ${schuelerName}`;
            tempContainer.appendChild(titleClone);

            const chartClone = auswertungChart.cloneNode(true);
            tempContainer.appendChild(chartClone);

            const canvas = await html2canvas(tempContainer, { scale: 2 });
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const imgHeight = (canvas.height * (pageWidth - margin * 2)) / canvas.width;

            let position = margin;
            doc.addImage(imgData, 'JPEG', margin, position, pageWidth - margin * 2, imgHeight);

            // Add signature line at the bottom
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFontSize(10);
            doc.text("Bitte Kenntnisnahme bestätigen:", margin, pageHeight - 25);
            doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20); // Signature line

            document.body.removeChild(tempContainer);
        }

        doc.save(`Kompetenzraster_${klasseName}_${fachName}_${new Date().toISOString().slice(0,10)}.pdf`);

        // Ursprünglichen Zustand wiederherstellen
        aktuelleKlasse = originalState.aktuelleKlasse;
        aktuellesFach = originalState.aktuellesFach;
        aktuellerSchuelerName = originalState.aktuellerSchuelerName;
        renderAllFromState();

        exportPdfBtn.disabled = false;
        exportPdfBtn.textContent = 'Auswahl als PDF speichern';
    }

    exportPdfBtn.addEventListener('click', exportAllToPdf);

    async function exportGradesList() {
        const klasseName = exportKlasseSelect.value;
        const fachName = exportFachSelect.value;

        if (!klasseName || !fachName || !klassen[klasseName] || !klassen[klasseName][fachName]) {
            showNotification('Hinweis', 'Bitte wählen Sie eine gültige Klasse und ein Fach für den Export aus.');
            return;
        }

        exportGradesBtn.disabled = true;
        exportGradesBtn.textContent = 'Exportiere...';

        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = margin;

        doc.setFontSize(18);
        doc.text(`Notenliste für Klasse: ${klasseName} - Fach: ${fachName}`, margin, y);
        y += 15;

        const fach = klassen[klasseName][fachName];
        const tableData = fach.schueler.map(schuelerName => {
            const bewertungen = fach.bewertungen[schuelerName].bewertung;
            const note = berechneNotenvorschlag(bewertungen) || 'N/A';
            return [schuelerName, note];
        });

        doc.autoTable({
            startY: y,
            head: [['Schülername', 'Note']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
            margin: { top: y }
        });

        doc.save(`Notenliste_${klasseName}_${fachName}_${new Date().toISOString().slice(0,10)}.pdf`);

        exportGradesBtn.disabled = false;
        exportGradesBtn.textContent = 'Notenliste';
    }

    exportGradesBtn.addEventListener('click', exportGradesList);

    // Initial render on load
    renderAllFromState();

    // --- Vorlagen-Logik ---
    saveVorlageBtn.addEventListener('click', () => {
        const fachKriterien = klassen[aktuelleKlasse]?.[aktuellesFach]?.kriterien || kriterien;
        if (fachKriterien.length === 0 || abstufungen.length === 0) {
            showNotification('Hinweis', 'Es sind keine Kriterien oder Abstufungen zum Speichern vorhanden.');
            return;
        }
        const vorlage = { kriterien: fachKriterien, abstufungen };
        const dataStr = JSON.stringify(vorlage, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.download = 'vorlage.json';
        link.href = url;
        document.body.appendChild(link); // Append to body to ensure visibility
        link.click();
        document.body.removeChild(link); // Clean up
        URL.revokeObjectURL(url);
    });

    async function ladeVorlagen() {
        try {
            const response = await fetch('./Vorlage/templates.json');
            if (!response.ok) {
                throw new Error('Vorlagendatei nicht gefunden.');
            }
            geladeneVorlagen = await response.json();

            vorlagenSelect.innerHTML = '';
            Object.keys(geladeneVorlagen).forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                vorlagenSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Fehler beim Laden der Vorlagen:', error);
            showNotification('Fehler', 'Die Vorlagendatei (`templates.json`) konnte im Ordner "/Vorlage/" nicht gefunden werden.');
        }
    }

    loadVorlageBtn.addEventListener('click', () => {
        const ausgewaehlterName = vorlagenSelect.value;
        if (!ausgewaehlterName || !geladeneVorlagen[ausgewaehlterName]) {
            showNotification('Hinweis', 'Bitte wählen Sie eine gültige Vorlage aus.');
            return;
        }

        const vorlage = geladeneVorlagen[ausgewaehlterName];
        const zielKriterien = klassen[aktuelleKlasse]?.[aktuellesFach]?.kriterien || kriterien;

        let importierteKriterien = vorlage.kriterien;
        // Backwards compatibility for old templates with string arrays
        if (importierteKriterien && importierteKriterien.length > 0 && (typeof importierteKriterien[0] === 'string' || !importierteKriterien[0].hasOwnProperty('gewicht'))) {
             importierteKriterien = importierteKriterien.map(k => (typeof k === 'string' ? { text: k, gewicht: 1 } : { ...k, gewicht: k.gewicht || 1 }));
        }


        zielKriterien.length = 0;
        abstufungen.length = 0;
        Array.prototype.push.apply(zielKriterien, importierteKriterien || []);
        Array.prototype.push.apply(abstufungen, vorlage.abstufungen || []);


        updateKriterienInput(); // Aktualisiert die Anzeige für die Kriterien
        renderAbstufungenTags();

        if (aktuellerSchuelerName) {
            rasterErstellenBtn.click(); // Um das Raster und die Bewertungen zu aktualisieren
        }

        showNotification('Erfolg', `Die Vorlage "${ausgewaehlterName}" wurde erfolgreich geladen.`);
    });

    // --- Initialisierung ---
    ladeVorlagen();

    document.querySelectorAll('.card > .card-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            if (content && content.classList.contains('card-content')) {
                content.classList.toggle('hidden');
                header.classList.toggle('collapsed');
            }
        });
    });
});
