const svg = document.getElementById('org-lines-svg');
const container = document.getElementById('mainContainer');

// Vonalak rajzolása
function drawAllLines() {
    svg.innerHTML = '';
    svg.setAttribute('width', container.scrollWidth);
    svg.setAttribute('height', container.scrollHeight);
    const color = getComputedStyle(document.body).getPropertyValue('--line-color');

    const ceo = document.getElementById('ceo-card');
    const leaders = [
        document.getElementById('dollak-leader'), 
        document.getElementById('fabri-leader'), 
        document.getElementById('szabo-leader')
    ];

    // CEO-tól a fővezetőkig
    const ceoX = getX(ceo), ceoY = getYBottom(ceo), midY = ceoY + 30;
    leaders.forEach(leader => {
        if (!leader) return;
        const lx = getX(leader), ly = getYTop(leader);
        drawLine(ceoX, ceoY, ceoX, midY, color);
        drawLine(ceoX, midY, lx, midY, color);
        drawLine(lx, midY, lx, ly, color);
    });

    // Dollák fa vonalai
    const dollakLeader = document.getElementById('dollak-leader');
    if (dollakLeader) {
        const dx = getX(dollakLeader), dy = getYBottom(dollakLeader), dMidY = dy + 30;
        document.querySelectorAll('.dollak-tree .sub-column').forEach(col => {
            const firstNode = col.querySelector('.node');
            if (firstNode) {
                const fx = getX(firstNode), fy = getYTop(firstNode);
                drawLine(dx, dy, dx, dMidY, color);
                drawLine(dx, dMidY, fx, dMidY, color);
                drawLine(fx, dMidY, fx, fy, color);
            }
        });
    }

    // Fábri vonal
    const fabriLeader = document.getElementById('fabri-leader');
    const gazdasagFirst = document.querySelector('#col-gazdasag .node');
    if (fabriLeader && gazdasagFirst) {
        drawLine(getX(fabriLeader), getYBottom(fabriLeader), getX(gazdasagFirst), getYTop(gazdasagFirst), color);
    }

    // Szabó vonalak (Dev grid)
    const szaboLeader = document.getElementById('szabo-leader');
    if (szaboLeader) {
        const sx = getX(szaboLeader), sy = getYBottom(szaboLeader), sMidY = sy + 30;
        const devNodes = document.querySelectorAll('#col-dev .node');
        if (devNodes.length > 0) {
            const leftX = getX(devNodes[0]), rightX = getX(devNodes[1]);
            drawLine(sx, sy, sx, sMidY, color);
            drawLine(leftX, sMidY, rightX, sMidY, color);
            drawLine(leftX, sMidY, leftX, getYTop(devNodes[0]), color);
            if (devNodes[1]) drawLine(rightX, sMidY, rightX, getYTop(devNodes[1]), color);
        }
    }
}

// Segédfüggvények a koordinátákhoz
function getX(el) { 
    const rect = el.getBoundingClientRect(), cRect = container.getBoundingClientRect(); 
    return rect.left + rect.width / 2 - cRect.left + container.scrollLeft; 
}
function getYTop(el) { 
    const rect = el.getBoundingClientRect(), cRect = container.getBoundingClientRect(); 
    return rect.top - cRect.top + container.scrollTop; 
}
function getYBottom(el) { 
    const rect = el.getBoundingClientRect(), cRect = container.getBoundingClientRect(); 
    return rect.bottom - cRect.top + container.scrollTop; 
}
function drawLine(x1, y1, x2, y2, color) { 
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line"); 
    line.setAttribute("x1", x1); line.setAttribute("y1", y1); 
    line.setAttribute("x2", x2); line.setAttribute("y2", y2); 
    line.setAttribute("stroke", color); line.setAttribute("stroke-width", "2"); 
    svg.appendChild(line); 
}

// DRAG & DROP
const draggables = document.querySelectorAll('.node');
const dropZones = document.querySelectorAll('[data-drop="true"]');

draggables.forEach(d => {
    d.addEventListener('dragstart', () => d.classList.add('dragging'));
    d.addEventListener('dragend', () => { 
        d.classList.remove('dragging'); 
        setTimeout(drawAllLines, 50); 
    });
});

dropZones.forEach(zone => {
    zone.addEventListener('dragover', e => {
        e.preventDefault();
        const dragging = document.querySelector('.dragging');
        if (!dragging) return;
        const afterElement = [...zone.querySelectorAll('.node:not(.dragging)')].reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = e.clientY - box.top - box.height / 2;
            return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
        if (!afterElement) zone.appendChild(dragging); else zone.insertBefore(dragging, afterElement);
        drawAllLines();
    });
    zone.addEventListener('dragenter', () => zone.classList.add('drag-over'));
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', () => zone.classList.remove('drag-over'));
});

// KERESÉS
document.getElementById('nameSearch').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.node').forEach(node => {
        if (term.length < 2) { node.classList.remove('fade', 'highlight'); return; }
        const match = node.innerText.toLowerCase().includes(term);
        node.classList.toggle('highlight', match); 
        node.classList.toggle('fade', !match);
    });
});

// DARK MODE Toggle
document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    setTimeout(drawAllLines, 100);
});

// Ablak események
window.addEventListener('load', drawAllLines);
window.addEventListener('resize', drawAllLines);

// MEGFOGÁS ÉS HÚZÁS (Panning)
let isDown = false, startX, startY, scrollLeft, scrollTop;
container.addEventListener('mousedown', (e) => { 
    if(e.target.closest('.node')) return; 
    isDown = true; 
    container.style.cursor = 'grabbing'; 
    startX = e.pageX - container.offsetLeft; 
    startY = e.pageY - container.offsetTop; 
    scrollLeft = window.scrollX; 
    scrollTop = window.scrollY; 
});
window.addEventListener('mouseup', () => { isDown = false; container.style.cursor = 'grab'; });
window.addEventListener('mousemove', (e) => { 
    if (!isDown) return; 
    window.scrollTo(
        scrollLeft - (e.pageX - container.offsetLeft - startX) * 1.5, 
        scrollTop - (e.pageY - container.offsetTop - startY) * 1.5
    ); 
});
// A modal és az X gomb elérése
const modal = document.getElementById('employeeModal');
const closeModal = document.querySelector('.close-modal');

// NYITÁS: A konténeren figyeljük a kattintást
container.addEventListener('click', (e) => {
    const node = e.target.closest('.node');
    if (!node || node.classList.contains('dragging')) return;

    e.stopPropagation(); // Megállítja az esemény továbbterjedését

    const name = node.querySelector('b').innerText;
    const pos = node.querySelector('span').innerText;
    const pillar = node.closest('.pillar');
    const dept = pillar ? pillar.querySelector('.top-leader b').innerText : "Vezetőség";

    document.getElementById('modalName').innerText = name;
    document.getElementById('modalPos').innerText = pos;
    document.getElementById('modalDept').innerText = dept;
    
    // Ékezetmentes email generálás
    const emailBase = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '.');
    document.getElementById('modalEmail').innerText = `${emailBase}@bbox.hu`;
    document.getElementById('modalPhone').innerText = `+36 30 ${Math.floor(100+Math.random()*900)}-${Math.floor(1000+Math.random()*9000)}`;

    modal.style.display = "block";
});

// BEZÁRÁS: X gombra kattintva
if (closeModal) {
    closeModal.addEventListener('click', (e) => {
        e.stopPropagation();
        modal.style.display = "none";
    });
}

// BEZÁRÁS: Ha a sötét háttérre kattintasz
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = "none";
    }
});