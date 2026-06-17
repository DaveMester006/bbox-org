/**
 * BBOX org chart – eredeti logika, nincs külső fájl-betöltés (file:// is működik).
 */
(function () {
    'use strict';

    const svg = document.getElementById('org-lines-svg');
    const container = document.getElementById('mainContainer');
    const viewport = document.getElementById('panViewport');
    const personModal = document.getElementById('personModal');
    const STORAGE_KEY = 'bbox-org-state-v2';
    const STORAGE_KEY_LEGACY = 'bbox-org-layout-v1';
    const ZONE_OPTIONS = [
        { id: 'col-raktar', label: 'Raktár' },
        { id: 'col-szerviz', label: 'Szerviz' },
        { id: 'col-rfm', label: 'RFM' },
        { id: 'col-integracio', label: 'Integráció' },
        { id: 'col-support', label: 'Support' },
        { id: 'col-gazdasag', label: 'Gazdaság' },
        { id: 'col-dev', label: 'Fejlesztés' }
    ];
    const PAGE_MODE = document.body.dataset.pageMode || 'editor';
    let presentationMode = false;
    let baselineSnapshot = null;
    let baselinePeople = null;
    let autoSaveTimer = null;
    let activePersonNode = null;
    let personFormMode = 'view';

    function isPagePresentation() {
        return PAGE_MODE === 'presentation';
    }

    function setupPageMode() {
        if (isPagePresentation()) {
            document.querySelectorAll('#addPersonBtn, #saveLayoutBtn, #restoreLayoutBtn, #presentationToggle').forEach(el => {
                if (el) el.remove();
            });
            const hint = document.getElementById('modeHint');
            if (hint) hint.textContent = 'Prezentáció: kattints a kártyára a részletekhez.';
            const note = document.createElement('div');
            note.className = 'presentation-note';
            note.innerHTML = 'Szerkesztéshez használd az <a href="editor.html">editor.html</a> oldalt.';
            document.body.insertBefore(note, document.body.firstChild);
            return;
        }

        const note = document.createElement('div');
        note.className = 'presentation-note';
        note.innerHTML = 'Prezentációs megtekintéshez nyisd meg az <a href="index.html">index.html</a> oldalt.';
        document.body.insertBefore(note, document.body.firstChild);
    }

    function drawAllLines() {
        if (!svg || !container) return;
        svg.innerHTML = '';
        svg.setAttribute('width', container.scrollWidth);
        svg.setAttribute('height', container.scrollHeight);
        const color = getComputedStyle(document.body).getPropertyValue('--line').trim() || '#cbd5e1';

        const ceo = document.getElementById('ceo-card');
        const leaders = [
            document.getElementById('dollak-leader'),
            document.getElementById('fabri-leader'),
            document.getElementById('szabo-leader')
        ].filter(Boolean);

        if (ceo && leaders.length) {
            const ceoX = getX(ceo), ceoY = getYBottom(ceo), midY = ceoY + 30;
            leaders.forEach(leader => {
                const lx = getX(leader), ly = getYTop(leader);
                drawLine(ceoX, ceoY, ceoX, midY, color);
                drawLine(ceoX, midY, lx, midY, color);
                drawLine(lx, midY, lx, ly, color);
            });
        }

        const dollakLeader = document.getElementById('dollak-leader');
        if (dollakLeader) {
            const dx = getX(dollakLeader), dy = getYBottom(dollakLeader), dMidY = dy + 30;
            document.querySelectorAll('.dollak-tree .sub-column').forEach(col => {
                const firstNode = col.querySelector('.node');
                if (!firstNode) return;
                const fx = getX(firstNode), fy = getYTop(firstNode);
                drawLine(dx, dy, dx, dMidY, color);
                drawLine(dx, dMidY, fx, dMidY, color);
                drawLine(fx, dMidY, fx, fy, color);
            });
        }

        const fabriLeader = document.getElementById('fabri-leader');
        const gazdasagFirst = document.querySelector('#col-gazdasag .node');
        if (fabriLeader && gazdasagFirst) {
            drawLine(getX(fabriLeader), getYBottom(fabriLeader), getX(gazdasagFirst), getYTop(gazdasagFirst), color);
        }

        const szaboLeader = document.getElementById('szabo-leader');
        if (szaboLeader) {
            const sx = getX(szaboLeader), sy = getYBottom(szaboLeader), sMidY = sy + 30;
            const devNodes = document.querySelectorAll('#col-dev .node');
            if (devNodes.length) {
                const leftX = getX(devNodes[0]);
                const rightX = getX(devNodes[Math.min(1, devNodes.length - 1)]);
                drawLine(sx, sy, sx, sMidY, color);
                drawLine(leftX, sMidY, rightX, sMidY, color);
                drawLine(leftX, sMidY, leftX, getYTop(devNodes[0]), color);
                if (devNodes[1]) drawLine(rightX, sMidY, rightX, getYTop(devNodes[1]), color);
            }
        }
    }

    function getX(el) {
        const rect = el.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        return rect.left + rect.width / 2 - cRect.left + container.scrollLeft;
    }
    function getYTop(el) {
        const rect = el.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        return rect.top - cRect.top + container.scrollTop;
    }
    function getYBottom(el) {
        const rect = el.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        return rect.bottom - cRect.top + container.scrollTop;
    }
    function drawLine(x1, y1, x2, y2, color) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
    }

    function setPresentationMode(on) {
        presentationMode = on;
        document.body.classList.toggle('presentation-mode', on);
        const btn = document.getElementById('presentationToggle');
        const hint = document.getElementById('modeHint');
        if (btn) {
            btn.textContent = on ? 'Szerkesztő mód' : 'Prezentációs mód';
            btn.classList.toggle('is-active', on);
        }
        if (hint) {
            hint.textContent = on
                ? 'Prezentáció: nézet és keresés — kattints a kártyára'
                : 'Húzd a lapot · Kártyát másik részlegre · Kattintás = szerkesztés · + Új munkatárs';
        }
        document.getElementById('addPersonBtn')?.toggleAttribute('hidden', on);
        document.querySelectorAll('.node:not(.node-locked)').forEach(n => { n.draggable = !on; });
    }

    function markLockedNodes() {
        document.getElementById('ceo-card')?.classList.add('node-locked');
        document.querySelectorAll('.top-leader').forEach(n => n.classList.add('node-locked'));
    }

    function getDropInsertionNode(zone, dragging, clientX, clientY) {
        const nodes = [...zone.querySelectorAll(':scope > .node:not(.dragging)')];
        if (!nodes.length) return null;

        if (zone.classList.contains('dev-grid')) {
            let nearest = null;
            let minDist = Infinity;
            nodes.forEach(child => {
                const box = child.getBoundingClientRect();
                const cx = box.left + box.width / 2;
                const cy = box.top + box.height / 2;
                const dist = (clientX - cx) ** 2 + (clientY - cy) ** 2;
                if (dist < minDist) {
                    minDist = dist;
                    nearest = child;
                }
            });
            if (!nearest) return null;
            const box = nearest.getBoundingClientRect();
            const beforeY = clientY < box.top + box.height / 2;
            const beforeX = clientX < box.left + box.width / 2;
            if (beforeY || (Math.abs(clientY - (box.top + box.height / 2)) < box.height * 0.25 && beforeX)) {
                return nearest;
            }
            let next = nearest.nextElementSibling;
            while (next && !next.classList.contains('node')) next = next.nextElementSibling;
            return next;
        }

        return nodes.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = clientY - box.top - box.height / 2;
            return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function clearDragOverZones(except) {
        document.querySelectorAll('[data-drop="true"].drag-over').forEach(z => {
            if (z !== except) z.classList.remove('drag-over');
        });
    }

    function normalizeNodeAfterMove(node, zone) {
        const fromPillar = node.dataset.lastPillar || '';
        const newPillar = zone.closest('.pillar')?.className.match(/pillar-\w+/)?.[0] || '';
        if (fromPillar && newPillar && fromPillar !== newPillar && node.classList.contains('mid-leader')) {
            node.classList.remove('mid-leader');
        }
        node.dataset.lastPillar = newPillar;
    }

    function escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function slugId(text) {
        return (text || 'szemely')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40);
    }

    function ensurePersonIds() {
        document.querySelectorAll('.node:not(.node-locked)').forEach(node => {
            if (!node.dataset.personId) {
                const name = node.querySelector('b')?.textContent?.trim() || 'unknown';
                node.dataset.personId = `${slugId(name)}-${Math.random().toString(36).slice(2, 6)}`;
            }
        });
    }

    function getNodeKey(node) {
        if (node.dataset.personId) return `pid:${node.dataset.personId}`;
        if (node.id) return `id:${node.id}`;
        return `name:${node.querySelector('b')?.textContent?.trim()}`;
    }

    function getZoneLabel(zoneId) {
        return ZONE_OPTIONS.find(z => z.id === zoneId)?.label || zoneId;
    }

    function capturePeople() {
        const people = [];
        document.querySelectorAll('.node:not(.node-locked)').forEach(node => {
            const zone = node.closest('[data-drop="true"]');
            people.push({
                id: node.dataset.personId,
                name: node.querySelector('b')?.textContent?.trim() || '',
                title: node.querySelector('span')?.textContent?.trim() || '',
                zoneId: zone?.id || 'col-dev',
                probation: node.classList.contains('probation'),
                midLeader: node.classList.contains('mid-leader'),
                probationEnd: node.dataset.probationEnd || null
            });
        });
        return people;
    }

    function createPersonNode(person) {
        const div = document.createElement('div');
        div.className = 'node';
        if (person.probation) div.classList.add('probation');
        if (person.midLeader) div.classList.add('mid-leader');
        div.dataset.personId = person.id;
        if (person.probationEnd) div.dataset.probationEnd = person.probationEnd;
        div.draggable = !presentationMode;
        div.innerHTML = `<b>${escapeHtml(person.name)}</b><span>${escapeHtml(person.title)}</span>`;
        const pillar = document.getElementById(person.zoneId)?.closest('.pillar')?.className.match(/pillar-\w+/)?.[0] || '';
        div.dataset.lastPillar = pillar;
        return div;
    }

    function clearMovableNodes() {
        document.querySelectorAll('[data-drop="true"]').forEach(zone => {
            zone.querySelectorAll(':scope > .node').forEach(n => n.remove());
        });
    }

    function rebuildPeople(people) {
        clearMovableNodes();
        people.forEach(person => {
            const zone = document.getElementById(person.zoneId);
            if (zone) zone.appendChild(createPersonNode(person));
        });
        tagMovableNodes();
    }

    function captureState() {
        return {
            version: 2,
            savedAt: new Date().toISOString(),
            people: capturePeople(),
            layout: captureLayout()
        };
    }

    function applyState(state) {
        if (!state) return false;
        if (state.people?.length) rebuildPeople(state.people);
        if (state.layout?.items?.length) applyLayout(state.layout);
        else {
            updateStats();
            drawAllLines();
        }
        return true;
    }

    function captureLayout() {
        const items = [];
        document.querySelectorAll('[data-drop="true"]').forEach(zone => {
            [...zone.querySelectorAll(':scope > .node')].forEach((node, index) => {
                if (node.classList.contains('node-locked')) return;
                items.push({
                    key: getNodeKey(node),
                    zoneId: zone.id,
                    index,
                    probation: node.classList.contains('probation'),
                    midLeader: node.classList.contains('mid-leader')
                });
            });
        });
        return { version: 1, savedAt: new Date().toISOString(), items };
    }

    function applyLayout(snapshot) {
        if (!snapshot?.items?.length) return false;

        const zones = {};
        document.querySelectorAll('[data-drop="true"]').forEach(z => { zones[z.id] = z; });

        const nodesByKey = {};
        document.querySelectorAll('.node:not(.node-locked)').forEach(node => {
            nodesByKey[getNodeKey(node)] = node;
        });

        const byZone = {};
        snapshot.items.forEach(item => {
            if (!byZone[item.zoneId]) byZone[item.zoneId] = [];
            byZone[item.zoneId].push(item);
        });

        Object.keys(byZone).forEach(zoneId => {
            const zone = zones[zoneId];
            if (!zone) return;
            byZone[zoneId].sort((a, b) => a.index - b.index);
            byZone[zoneId].forEach(item => {
                const node = nodesByKey[item.key];
                if (!node) return;
                node.classList.toggle('probation', !!item.probation);
                node.classList.toggle('mid-leader', !!item.midLeader);
                const pillar = zone.closest('.pillar')?.className.match(/pillar-\w+/)?.[0] || '';
                node.dataset.lastPillar = pillar;
                zone.appendChild(node);
            });
        });

        updateStats();
        drawAllLines();
        return true;
    }

    function formatSavedTime(iso) {
        try {
            const d = new Date(iso);
            return d.toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' });
        } catch {
            return '';
        }
    }

    function setSaveStatus(text, type) {
        const el = document.getElementById('saveStatus');
        if (!el) return;
        el.textContent = text;
        el.classList.remove('is-ok', 'is-warn');
        if (type) el.classList.add(type);
    }

    function saveState(showFeedback = true) {
        const state = captureState();
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            if (showFeedback) {
                setSaveStatus(`Mentve: ${formatSavedTime(state.savedAt)}`, 'is-ok');
            }
            return true;
        } catch (err) {
            if (showFeedback) setSaveStatus('Mentés sikertelen (böngésző tiltja a tárolást)', 'is-warn');
            console.warn(err);
            return false;
        }
    }

    function scheduleAutoSave() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => saveState(true), 600);
    }

    function loadSavedState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const state = JSON.parse(raw);
                if (applyState(state)) {
                    setSaveStatus(`Betöltve: ${formatSavedTime(state.savedAt)}`, 'is-ok');
                    return true;
                }
            }
            const legacy = localStorage.getItem(STORAGE_KEY_LEGACY);
            if (legacy) {
                const layout = JSON.parse(legacy);
                if (applyLayout(layout)) {
                    setSaveStatus('Régi mentés betöltve (elrendezés)', 'is-ok');
                    saveState(false);
                    return true;
                }
            }
        } catch (err) {
            console.warn(err);
        }
        return false;
    }

    function restoreBaseline() {
        if (!baselineSnapshot || !baselinePeople) return;
        const ok = confirm(
            'Visszaállítod az eredeti állapotot?\n\nTörlődnek az új munkatársak, visszajönnek a töröltek, és a mentés is törlődik.'
        );
        if (!ok) return;
        rebuildPeople(baselinePeople);
        applyLayout(baselineSnapshot);
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_KEY_LEGACY);
        } catch (err) {
            console.warn(err);
        }
        setSaveStatus('Eredeti állapot visszaállítva', 'is-ok');
    }

    function readPersonFromNode(node) {
        const zone = node.closest('[data-drop="true"]');
        return {
            id: node.dataset.personId,
            name: node.querySelector('b')?.textContent?.trim() || '',
            title: node.querySelector('span')?.textContent?.trim() || '',
            zoneId: zone?.id || 'col-dev',
            probation: node.classList.contains('probation'),
            midLeader: node.classList.contains('mid-leader'),
            probationEnd: node.dataset.probationEnd || null
        };
    }

    function applyPersonToNode(node, person) {
        node.querySelector('b').textContent = person.name;
        node.querySelector('span').textContent = person.title;
        node.classList.toggle('probation', !!person.probation);
        if (person.probationEnd) node.dataset.probationEnd = person.probationEnd;
        else delete node.dataset.probationEnd;

        const currentZone = node.closest('[data-drop="true"]');
        const targetZone = document.getElementById(person.zoneId);
        if (targetZone && currentZone !== targetZone) {
            targetZone.appendChild(node);
            normalizeNodeAfterMove(node, targetZone);
        }
    }

    function formatProbationStatus(person) {
        if (!person.probation) return 'Állandó';
        if (person.probationEnd) {
            try {
                const end = new Date(person.probationEnd);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                if (end < today) return `Próbaidős (lejárt: ${person.probationEnd})`;
                return `Próbaidős (vége: ${person.probationEnd})`;
            } catch {
                return `Próbaidős (vége: ${person.probationEnd})`;
            }
        }
        return 'Próbaidős';
    }

    function populateZoneSelect(select, selectedId) {
        select.innerHTML = ZONE_OPTIONS.map(z =>
            `<option value="${z.id}"${z.id === selectedId ? ' selected' : ''}>${z.label}</option>`
        ).join('');
    }

    function closePersonModal() {
        personModal?.classList.remove('is-open');
        activePersonNode = null;
        personFormMode = 'view';
    }

    function renderPersonActions(mode, person, isLocked) {
        const actions = document.getElementById('personActions');
        if (!actions) return;
        if (presentationMode || isLocked) {
            actions.innerHTML = '<button type="button" class="btn btn-ghost modal-only-close">Bezárás</button>';
            actions.querySelector('.modal-only-close')?.addEventListener('click', closePersonModal);
            return;
        }
        if (mode === 'add') {
            actions.innerHTML = `
                <button type="button" class="btn btn-accent" id="btnSaveNew">Felvétel</button>
                <button type="button" class="btn btn-ghost" id="btnCancelAdd">Mégse</button>`;
            document.getElementById('btnSaveNew')?.addEventListener('click', saveNewPerson);
            document.getElementById('btnCancelAdd')?.addEventListener('click', closePersonModal);
            return;
        }
        if (mode === 'edit') {
            actions.innerHTML = `
                <button type="button" class="btn btn-accent" id="btnSaveEdit">Változások mentése</button>
                <button type="button" class="btn btn-ghost" id="btnCancelEdit">Mégse</button>`;
            document.getElementById('btnSaveEdit')?.addEventListener('click', saveEditedPerson);
            document.getElementById('btnCancelEdit')?.addEventListener('click', () => openPersonModal(activePersonNode, 'view'));
            return;
        }
        const probBtn = person?.probation
            ? '<button type="button" class="btn btn-accent" id="btnProbationDone">Próbaidő lejárt</button>'
            : '<button type="button" class="btn btn-ghost" id="btnSetProbation">Próbaidő beállítása</button>';
        actions.innerHTML = `
            ${probBtn}
            <button type="button" class="btn btn-ghost" id="btnEditPerson">Szerkesztés</button>
            <button type="button" class="btn btn-danger" id="btnDeletePerson">Kilépés / törlés</button>
            <button type="button" class="btn btn-ghost modal-only-close">Bezárás</button>`;
        document.getElementById('btnProbationDone')?.addEventListener('click', confirmProbationEnd);
        document.getElementById('btnSetProbation')?.addEventListener('click', () => {
            if (!activePersonNode) return;
            activePersonNode.classList.add('probation');
            saveState(true);
            openPersonModal(activePersonNode, 'view');
        });
        document.getElementById('btnEditPerson')?.addEventListener('click', () => openPersonModal(activePersonNode, 'edit'));
        document.getElementById('btnDeletePerson')?.addEventListener('click', deleteActivePerson);
        actions.querySelector('.modal-only-close')?.addEventListener('click', closePersonModal);
    }

    function openPersonModal(node, mode) {
        if (!personModal) return;
        personFormMode = mode;
        const view = document.getElementById('personView');
        const form = document.getElementById('personForm');
        const title = document.getElementById('personModalTitle');
        const isLocked = node?.classList.contains('node-locked');

        if (mode === 'add') {
            activePersonNode = null;
            view.classList.add('hidden');
            form.classList.remove('hidden');
            title.textContent = 'Új munkatárs felvétele';
            document.getElementById('pfName').value = '';
            document.getElementById('pfTitle').value = '';
            populateZoneSelect(document.getElementById('pfZone'), 'col-dev');
            document.getElementById('pfProbation').checked = false;
            document.getElementById('pfProbationEnd').value = '';
            renderPersonActions('add');
            personModal.classList.add('is-open');
            document.getElementById('pfName')?.focus();
            return;
        }

        if (!node) return;
        activePersonNode = node;
        const person = readPersonFromNode(node);
        const pillarLeader = node.closest('.pillar')?.querySelector('.top-leader b')?.textContent;
        const sectionLabel = node.closest('.sub-column')?.querySelector('.section-label')?.textContent;

        if (mode === 'edit' && !isLocked) {
            view.classList.add('hidden');
            form.classList.remove('hidden');
            title.textContent = 'Munkatárs szerkesztése';
            document.getElementById('pfName').value = person.name;
            document.getElementById('pfTitle').value = person.title;
            populateZoneSelect(document.getElementById('pfZone'), person.zoneId);
            document.getElementById('pfProbation').checked = person.probation;
            document.getElementById('pfProbationEnd').value = person.probationEnd || '';
            renderPersonActions('edit', person);
        } else {
            form.classList.add('hidden');
            view.classList.remove('hidden');
            title.textContent = person.name;
            document.getElementById('personViewRole').textContent = person.title;
            document.getElementById('personViewDept').textContent = sectionLabel || getZoneLabel(person.zoneId);
            document.getElementById('personViewPillar').textContent = pillarLeader || (node.id === 'ceo-card' ? '—' : '—');
            document.getElementById('personViewStatus').textContent = isLocked ? 'Vezető (fix)' : formatProbationStatus(person);
            renderPersonActions('view', person, isLocked);
        }
        personModal.classList.add('is-open');
    }

    function saveNewPerson() {
        const name = document.getElementById('pfName').value.trim();
        const title = document.getElementById('pfTitle').value.trim();
        const zoneId = document.getElementById('pfZone').value;
        const probation = document.getElementById('pfProbation').checked;
        const probationEnd = document.getElementById('pfProbationEnd').value || null;
        if (!name || !title) {
            alert('Add meg a nevet és a beosztást.');
            return;
        }
        const person = {
            id: `new-${Date.now().toString(36)}`,
            name,
            title,
            zoneId,
            probation,
            midLeader: false,
            probationEnd: probation ? probationEnd : null
        };
        const zone = document.getElementById(zoneId);
        if (!zone) return;
        zone.appendChild(createPersonNode(person));
        updateStats();
        drawAllLines();
        saveState(true);
        closePersonModal();
        setSaveStatus(`${name} felvéve`, 'is-ok');
    }

    function saveEditedPerson() {
        if (!activePersonNode) return;
        const name = document.getElementById('pfName').value.trim();
        const title = document.getElementById('pfTitle').value.trim();
        const zoneId = document.getElementById('pfZone').value;
        const probation = document.getElementById('pfProbation').checked;
        const probationEnd = document.getElementById('pfProbationEnd').value || null;
        if (!name || !title) {
            alert('Add meg a nevet és a beosztást.');
            return;
        }
        const person = {
            ...readPersonFromNode(activePersonNode),
            name,
            title,
            zoneId,
            probation,
            probationEnd: probation ? probationEnd : null
        };
        applyPersonToNode(activePersonNode, person);
        updateStats();
        drawAllLines();
        saveState(true);
        openPersonModal(activePersonNode, 'view');
        setSaveStatus(`${name} frissítve`, 'is-ok');
    }

    function confirmProbationEnd() {
        if (!activePersonNode) return;
        const name = activePersonNode.querySelector('b')?.textContent?.trim();
        if (!confirm(`${name} — lejárt a próbaideje, és állandó munkaviszonyba kerül?`)) return;
        activePersonNode.classList.remove('probation');
        delete activePersonNode.dataset.probationEnd;
        updateStats();
        drawAllLines();
        saveState(true);
        openPersonModal(activePersonNode, 'view');
        setSaveStatus(`${name}: próbaidő lezárva`, 'is-ok');
    }

    function deleteActivePerson() {
        if (!activePersonNode) return;
        const name = activePersonNode.querySelector('b')?.textContent?.trim();
        if (!confirm(`${name} kilép / törlés a szervezeti ábráról?\n\nA művelet mentés után megmarad.`)) return;
        activePersonNode.remove();
        activePersonNode = null;
        closePersonModal();
        updateStats();
        drawAllLines();
        saveState(true);
        setSaveStatus(`${name} törölve`, 'is-ok');
    }

    function tagMovableNodes() {
        document.querySelectorAll('.node:not(.node-locked)').forEach(node => {
            const pillar = node.closest('.pillar')?.className.match(/pillar-\w+/)?.[0] || '';
            node.dataset.lastPillar = pillar;
        });
    }

    function updateStats() {
        const nodes = document.querySelectorAll('.node');
        const excludeCeo = n => n.id !== 'ceo-card';
        const inPillar = id => [...document.querySelectorAll(`.pillar-${id} .node`)].filter(excludeCeo);

        const total = [...nodes].filter(excludeCeo).length;
        const dollak = inPillar('dollak').length;
        const fabri = inPillar('fabri').length;
        const szabo = inPillar('szabo').length;
        const probation = document.querySelectorAll('.node.probation').length;

        document.getElementById('statTotal').textContent = total;
        document.getElementById('statDollak').textContent = dollak;
        document.getElementById('statFabri').textContent = fabri;
        document.getElementById('statSzabo').textContent = szabo;
        document.getElementById('statProbation').textContent = probation;

        const mini = document.getElementById('headerMiniStats');
        if (mini) {
            mini.textContent = `${total} fő · ${probation} próbaidős`;
        }
    }

    function bindHeaderCollapse() {
        const header = document.getElementById('appHeader');
        const btn = document.getElementById('headerToggle');
        if (!header || !btn) return;

        const apply = collapsed => {
            header.classList.toggle('is-collapsed', collapsed);
            btn.setAttribute('aria-expanded', String(!collapsed));
            btn.querySelector('.header-toggle-text').textContent = collapsed ? 'Eszközök' : 'Bezárás';
        };

        try {
            const saved = localStorage.getItem('bbox-header-collapsed');
            if (saved !== null) apply(saved === 'true');
        } catch (err) {
            console.warn(err);
        }

        btn.addEventListener('click', () => {
            const collapsed = !header.classList.contains('is-collapsed');
            apply(collapsed);
            try {
                localStorage.setItem('bbox-header-collapsed', String(collapsed));
            } catch (err) {
                console.warn(err);
            }
        });
    }

    function nodeMatchesFilter(node, filter) {
        if (!filter) return true;
        if (filter.startsWith('pillar-')) {
            return !!node.closest(`.${filter}`);
        }
        return !!node.closest(`#${filter}`);
    }

    function applyFilters() {
        const term = (document.getElementById('nameSearch').value || '').toLowerCase().trim();
        const filter = document.getElementById('deptFilter').value;

        document.querySelectorAll('.node').forEach(node => {
            const deptOk = nodeMatchesFilter(node, filter);
            const searchOk = term.length < 2 || node.innerText.toLowerCase().includes(term);
            const show = deptOk && searchOk;

            if (term.length >= 2) {
                node.classList.toggle('highlight', show);
                node.classList.toggle('fade', !show);
            } else {
                node.classList.remove('highlight');
                node.classList.toggle('fade', !deptOk && !!filter);
            }
        });
        drawAllLines();
    }

    function bindDragDrop() {
        container.addEventListener('dragstart', e => {
            if (presentationMode) {
                e.preventDefault();
                return;
            }
            const node = e.target.closest('.node');
            if (!node || node.classList.contains('node-locked')) {
                e.preventDefault();
                return;
            }
            node.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', getNodeKey(node));
        });

        container.addEventListener('dragend', e => {
            const node = e.target.closest('.node');
            node?.classList.remove('dragging');
            clearDragOverZones();
            setTimeout(drawAllLines, 50);
            updateStats();
            scheduleAutoSave();
        });

        container.addEventListener('dragover', e => {
            if (presentationMode) return;
            const zone = e.target.closest('[data-drop="true"]');
            if (!zone) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const dragging = document.querySelector('.dragging');
            if (!dragging) return;

            clearDragOverZones(zone);
            zone.classList.add('drag-over');

            const insertBefore = getDropInsertionNode(zone, dragging, e.clientX, e.clientY);
            if (insertBefore) zone.insertBefore(dragging, insertBefore);
            else zone.appendChild(dragging);

            drawAllLines();
        });

        container.addEventListener('drop', e => {
            if (presentationMode) return;
            const zone = e.target.closest('[data-drop="true"]');
            if (!zone) return;
            e.preventDefault();
            zone.classList.remove('drag-over');
            const dragging = document.querySelector('.dragging');
            if (dragging) normalizeNodeAfterMove(dragging, zone);
            updateStats();
            drawAllLines();
            scheduleAutoSave();
        });

        container.addEventListener('dragleave', e => {
            const zone = e.target.closest('[data-drop="true"]');
            if (!zone) return;
            const related = e.relatedTarget;
            if (!related || !zone.contains(related)) zone.classList.remove('drag-over');
        });
    }

    function bindPanning() {
        if (!viewport) return;

        let isPanning = false;
        let startX = 0;
        let startY = 0;
        let scrollLeft = 0;
        let scrollTop = 0;

        viewport.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            if (e.target.closest('.node')) return;
            isPanning = true;
            document.body.classList.add('is-panning');
            startX = e.clientX;
            startY = e.clientY;
            scrollLeft = viewport.scrollLeft;
            scrollTop = viewport.scrollTop;
            e.preventDefault();
        });

        window.addEventListener('mousemove', e => {
            if (!isPanning) return;
            viewport.scrollLeft = scrollLeft - (e.clientX - startX);
            viewport.scrollTop = scrollTop - (e.clientY - startY);
        });

        const endPan = () => {
            if (!isPanning) return;
            isPanning = false;
            document.body.classList.remove('is-panning');
        };

        window.addEventListener('mouseup', endPan);
        viewport.addEventListener('mouseleave', endPan);
    }

    function bindPersonModal() {
        personModal?.querySelector('.modal-close')?.addEventListener('click', closePersonModal);
        personModal?.addEventListener('click', e => {
            if (e.target === personModal) closePersonModal();
        });

        container.addEventListener('click', e => {
            const node = e.target.closest('.node');
            if (!node || node.classList.contains('dragging')) return;
            e.stopPropagation();
            openPersonModal(node, 'view');
        });

        document.getElementById('addPersonBtn')?.addEventListener('click', () => {
            if (presentationMode) {
                alert('Kapcsold ki a prezentációs módot az új munkatárs felvételéhez.');
                return;
            }
            openPersonModal(null, 'add');
        });
    }

    function fitView() {
        const ceo = document.getElementById('ceo-card');
        if (!ceo || !viewport) return;
        const cr = ceo.getBoundingClientRect();
        const vr = viewport.getBoundingClientRect();
        viewport.scrollTo({
            left: viewport.scrollLeft + cr.left - vr.left - (vr.width - cr.width) / 2,
            top: viewport.scrollTop + cr.top - vr.top - 60,
            behavior: 'smooth'
        });
    }

    function init() {
        markLockedNodes();
        ensurePersonIds();
        tagMovableNodes();
        baselinePeople = capturePeople();
        baselineSnapshot = captureLayout();

        bindDragDrop();
        bindPanning();
        bindPersonModal();
        bindHeaderCollapse();
        updateStats();
        setPresentationMode(isPagePresentation());
        setupPageMode();

        if (!loadSavedState()) {
            setSaveStatus('Nincs mentés — változtatás után automatikusan ment');
        }

        document.getElementById('nameSearch')?.addEventListener('input', applyFilters);
        document.getElementById('deptFilter')?.addEventListener('change', applyFilters);
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            setTimeout(drawAllLines, 80);
        });
        document.getElementById('printBtn')?.addEventListener('click', () => window.print());
        document.getElementById('fitViewBtn')?.addEventListener('click', fitView);
        document.getElementById('saveLayoutBtn')?.addEventListener('click', () => saveState(true));
        document.getElementById('restoreLayoutBtn')?.addEventListener('click', restoreBaseline);

        window.addEventListener('load', drawAllLines);
        window.addEventListener('resize', drawAllLines);
        requestAnimationFrame(drawAllLines);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
