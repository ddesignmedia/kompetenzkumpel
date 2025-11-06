document.addEventListener('DOMContentLoaded', function () {
    // State Management
    let kriterien = [
    "Aufmerksames Zuhören",
    "Konstruktive Beiträge",
    "Kontinuierliche Beteiligung",
    "Sorgfältige Arbeitsweise",
    "Selbstständiges Arbeiten",
    "Respektvoller Umgang",
    "Tabletnutzung sinnvoll",
    "Arbeitsaufträge erfüllt"
  ];
    let abstufungen = [
    "Herausragend",
    "Deutlich ausgeprägt",
    "Erkennbar",
    "Ansatzweise erkennbar",
    "Noch nicht erkennbar"
  ];
    let klassen = {}; // { "6a": { "Mathe": { schueler: ["Anna", "Ben"], bewertungen: { "Anna": [...] } } } }
    let aktuelleKlasse = null;
    let aktuellesFach = null;
    let aktuellerSchuelerName = null;
    let geladeneVorlagen = {};

    // DOM-Elemente
    const klasseInput = document.getElementById('klasse-input');
    const fachInput = document.getElementById('fach-input');
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

    const saveStateBtn = document.getElementById('save-state-btn');
    const loadStateBtn = document.getElementById('load-state-btn');
    const loadStateInput = document.getElementById('load-state-input');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
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
    function setupTagInput(container, input, dataArray) {
        function renderTags() {
            container.querySelectorAll('.tag').forEach(tag => tag.remove());
            dataArray.forEach((item, index) => {
                const tag = document.createElement('span');
                tag.className = 'tag';
                tag.textContent = item;
                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '&times;';
                removeBtn.onclick = () => {
                    dataArray.splice(index, 1);
                    renderTags();
                };
                tag.appendChild(removeBtn);
                container.insertBefore(tag, input);
            });
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && input.value.trim() !== '') {
                e.preventDefault();
                if (!dataArray.includes(input.value.trim())) {
                   dataArray.push(input.value.trim());
                }
                input.value = '';
                renderTags();
            }
        });
        renderTags();
        return renderTags;
    }

    const renderKriterienTags = setupTagInput(kriterienContainer, kriterienInput, kriterien);
    const renderAbstufungenTags = setupTagInput(abstufungenContainer, abstufungenInput, abstufungen);

    // --- Schüler-Logik ---
    schuelerAnlegenBtn.addEventListener('click', () => {
        const klasseName = klasseInput.value.trim();
        const fachName = fachInput.value.trim();
        const names = schuelerInput.value
            .split(/[\n,]+/)
            .map(name => name.trim())
            .filter(name => name.length > 0);

        if (!klasseName || !fachName || names.length === 0) {
            showNotification('Eingabefehler', 'Bitte geben Sie eine Klasse, ein Fach und mindestens einen Schülernamen ein.');
            return;
        }

        if (!klassen[klasseName]) {
            klassen[klasseName] = {};
        }
        if (!klassen[klasseName][fachName]) {
            klassen[klasseName][fachName] = { schueler: [], bewertungen: {} };
        }

        const fach = klassen[klasseName][fachName];
        const neueSchueler = names.filter(name => !fach.schueler.includes(name));
        fach.schueler = [...fach.schueler, ...neueSchueler].sort();

        neueSchueler.forEach(name => {
            fach.bewertungen[name] = {
                bewertung: Array(kriterien.length).fill(null)
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

    // --- Raster-Logik ---
    rasterErstellenBtn.addEventListener('click', () => {
        if (kriterien.length === 0 || abstufungen.length === 0) {
            showNotification('Eingabefehler', 'Bitte definieren Sie mindestens ein Kriterium und eine Abstufung.');
            return;
        }

        // Reset evaluations when grid is re-created
        const oldBewertungen = JSON.parse(JSON.stringify(bewertungen));
        bewertungen = {};
        schuelerNamen.forEach(name => {
            bewertungen[name] = {
                bewertung: Array(kriterien.length).fill(null)
            };
             // Try to keep old evaluations if student still exists
            if (oldBewertungen[name]) {
                bewertungen[name].bewertung = oldBewertungen[name].bewertung.slice(0, kriterien.length);
                while(bewertungen[name].bewertung.length < kriterien.length) {
                    bewertungen[name].bewertung.push(null);
                }
            }
        });

        erstelleRaster();
        updateAuswertung();
    });

    function erstelleRaster() {
        if (kriterien.length === 0 || abstufungen.length === 0 || !aktuelleKlasse || !aktuellesFach || !aktuellerSchuelerName) {
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
        kriterien.forEach((kriterium, kIndex) => {
            let row = `<tr><td class="font-medium">${kriterium}</td>`;
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
        kompetenzRaster.querySelectorAll('.grid-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                if (!aktuelleKlasse || !aktuellesFach || !aktuellerSchuelerName) return;

                const kIndex = parseInt(cell.dataset.kriteriumIndex);
                const aIndex = parseInt(cell.dataset.abstufungIndex);
                const aktuelleBewertung = klassen[aktuelleKlasse][aktuellesFach].bewertungen[aktuellerSchuelerName].bewertung;

                if (aktuelleBewertung[kIndex] === aIndex) {
                   aktuelleBewertung[kIndex] = null;
                } else {
                   aktuelleBewertung[kIndex] = aIndex;
                }

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
            // Remove all possible color classes
            for (let i = 0; i < abstufungen.length; i++) {
                cell.classList.remove(`selected-color-${i}`);
            }
        });

        aktuelleBewertung.forEach((aIndex, kIndex) => {
            if (aIndex !== null) {
                const cell = kompetenzRaster.querySelector(`[data-kriterium-index="${kIndex}"][data-abstufung-index="${aIndex}"]`);
                if (cell) {
                    cell.classList.add('selected');
                    cell.classList.add(`selected-color-${aIndex}`);
                }
            }
        });
    }

    // --- Auswertungs-Logik ---
    const farben = ['#22c55e', '#38bdf8', '#facc15', '#f97316', '#ef4444'];

    function updateAuswertung() {
        if (!aktuelleKlasse || !aktuellesFach || !aktuellerSchuelerName || !klassen[aktuelleKlasse][aktuellesFach].bewertungen[aktuellerSchuelerName] || klassen[aktuelleKlasse][aktuellesFach].bewertungen[aktuellerSchuelerName].bewertung.every(b => b === null)) {
            auswertungContainer.classList.add('hidden');
            auswertungPlatzhalter.classList.remove('hidden');
            return;
        }
        auswertungPlatzhalter.classList.add('hidden');
        auswertungContainer.classList.remove('hidden');
        auswertungTitel.textContent = `Visuelle Auswertung für: ${aktuellerSchuelerName}`;
        auswertungChart.innerHTML = '';

        const aktuelleBewertung = klassen[aktuelleKlasse][aktuellesFach].bewertungen[aktuellerSchuelerName].bewertung;

        kriterien.forEach((kriterium, kIndex) => {
            const bewertungIndex = aktuelleBewertung[kIndex];
            if (bewertungIndex === null || bewertungIndex >= abstufungen.length) return;

            const prozent = (bewertungIndex + 1) / abstufungen.length * 100;
            const farbe = farben[bewertungIndex % farben.length];

            const barContainer = document.createElement('div');

            const labelContainer = document.createElement('div');
            labelContainer.className = 'progress-bar-label-container';

            const kriteriumLabel = document.createElement('span');
            kriteriumLabel.textContent = kriterium;
            kriteriumLabel.className = 'progress-bar-kriterium';

            const stufeLabel = document.createElement('span');
            stufeLabel.textContent = abstufungen[bewertungIndex];
            stufeLabel.className = 'progress-bar-stufe';
            stufeLabel.style.backgroundColor = farbe;

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
        renderKriterienTags();
        renderAbstufungenTags();

        if (aktuelleKlasse && aktuellesFach) {
            const fach = klassen[aktuelleKlasse][aktuellesFach];
            schuelerInput.value = fach.schueler.join('\n');
            klasseInput.value = aktuelleKlasse;
            fachInput.value = aktuellesFach;
        } else {
            schuelerInput.value = '';
            klasseInput.value = '';
            fachInput.value = '';
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
        const state = { kriterien, abstufungen, klassen };
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
                if (data.kriterien && data.abstufungen && data.klassen) {
                    kriterien.length = 0;
                    abstufungen.length = 0;
                    Array.prototype.push.apply(kriterien, data.kriterien);
                    Array.prototype.push.apply(abstufungen, data.abstufungen);
                    klassen = data.klassen;

                    aktuelleKlasse = Object.keys(klassen)[0] || null;
                    aktuellesFach = aktuelleKlasse ? Object.keys(klassen[aktuelleKlasse])[0] || null : null;
                    aktuellerSchuelerName = aktuellesFach ? klassen[aktuelleKlasse][aktuellesFach].schueler[0] || null : null;

                    renderAllFromState();
                    updateExportSelects();
                    showNotification('Erfolg', 'Der Bearbeitungsstand wurde erfolgreich geladen.');
                } else {
                    showNotification('Fehler', 'Die JSON-Datei hat ein ungültiges Format.');
                }
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

    // Initial render on load
    renderAllFromState();

    // --- Vorlagen-Logik ---
    saveVorlageBtn.addEventListener('click', () => {
        if (kriterien.length === 0 || abstufungen.length === 0) {
            showNotification('Hinweis', 'Es sind keine Kriterien oder Abstufungen zum Speichern vorhanden.');
            return;
        }
        const vorlage = { kriterien, abstufungen };
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

        kriterien.length = 0;
        abstufungen.length = 0;
        Array.prototype.push.apply(kriterien, vorlage.kriterien);
        Array.prototype.push.apply(abstufungen, vorlage.abstufungen);

        renderKriterienTags();
        renderAbstufungenTags();

        if (aktuellerSchuelerName) {
            rasterErstellenBtn.click();
        }

        showNotification('Erfolg', `Die Vorlage "${ausgewaehlterName}" wurde erfolgreich geladen.`);
    });

    // --- Initialisierung ---
    ladeVorlagen();
});
