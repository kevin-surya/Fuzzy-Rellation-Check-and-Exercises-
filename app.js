/**
 * ============================================================
 *  FUZZY RELATION ANALYZER — APPLICATION LOGIC
 *  UI interactions, DOM manipulation, and event handling
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    const FE = window.FuzzyEngine;

    // ---- State ----
    let matrixSize = 5;
    let valueType = 'fuzzy'; // 'fuzzy' or 'classic'
    let practiceType = 'random';
    let practiceMatrix = null;
    let practiceAnswer = null;
    let score = { correct: 0, wrong: 0 };

    // ---- DOM Elements ----
    const matrixContainer = document.getElementById('matrix-container');
    const resultPanel = document.getElementById('result-panel');
    const resultContent = document.getElementById('result-content');
    const examplesGrid = document.getElementById('examples-grid');
    const practiceArea = document.getElementById('practice-area');
    const practiceMatrixDisplay = document.getElementById('practice-matrix-display');
    const practiceFeedback = document.getElementById('practice-feedback');

    // ---- Initialize ----
    generateMatrixGrid();
    renderExamples();
    setupEventListeners();

    // ============================================================
    //  MATRIX GRID GENERATION
    // ============================================================

    function generateMatrixGrid() {
        const n = matrixSize;
        const cols = n + 1; // +1 for row labels
        let html = `<div class="matrix-grid" style="grid-template-columns: 40px repeat(${n}, 1fr);">`;

        // Column headers
        html += `<div class="matrix-label"></div>`;
        for (let j = 0; j < n; j++) {
            html += `<div class="matrix-label">x<sub>${j + 1}</sub></div>`;
        }

        // Rows
        for (let i = 0; i < n; i++) {
            html += `<div class="matrix-label">x<sub>${i + 1}</sub></div>`;
            for (let j = 0; j < n; j++) {
                const isDiag = i === j;
                const value = isDiag ? '1' : '0';
                html += `<input type="text" class="matrix-cell${isDiag ? ' diagonal' : ''}" 
                          data-row="${i}" data-col="${j}" 
                          value="${value}" 
                          id="cell-${i}-${j}"
                          inputmode="decimal"
                          ${isDiag ? '' : ''}>`;
            }
        }

        html += `</div>`;
        matrixContainer.innerHTML = html;

        // Add input validation
        document.querySelectorAll('.matrix-cell').forEach(cell => {
            cell.addEventListener('input', (e) => {
                validateCell(e.target);
            });
            cell.addEventListener('focus', (e) => {
                e.target.select();
            });
        });
    }

    function validateCell(cell) {
        let val = cell.value.trim();
        // Allow typing in progress
        if (val === '' || val === '0.' || val === '1.' || val === '.') return;

        const num = parseFloat(val);
        if (isNaN(num)) {
            cell.classList.add('highlight-error');
            return;
        }

        if (valueType === 'classic') {
            if (num !== 0 && num !== 1) {
                cell.classList.add('highlight-error');
                return;
            }
        } else {
            if (num < 0 || num > 1) {
                cell.classList.add('highlight-error');
                return;
            }
        }
        cell.classList.remove('highlight-error');
    }

    function getMatrixFromGrid() {
        const n = matrixSize;
        const R = [];
        for (let i = 0; i < n; i++) {
            const row = [];
            for (let j = 0; j < n; j++) {
                const cell = document.getElementById(`cell-${i}-${j}`);
                const val = parseFloat(cell.value);
                if (isNaN(val) || val < 0 || val > 1) {
                    cell.classList.add('highlight-error');
                    return null;
                }
                row.push(Math.round(val * 100) / 100);
            }
            R.push(row);
        }
        return R;
    }

    function setMatrixToGrid(R) {
        const n = R.length;
        // Adjust size if needed
        if (n !== matrixSize) {
            matrixSize = n;
            updateSizeButtons();
            generateMatrixGrid();
        }
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const cell = document.getElementById(`cell-${i}-${j}`);
                if (cell) {
                    cell.value = formatNumber(R[i][j]);
                    cell.classList.remove('highlight-error');
                }
            }
        }
    }

    function updateSizeButtons() {
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.size) === matrixSize);
        });
    }

    // ============================================================
    //  ANALYSIS & RESULTS
    // ============================================================

    function analyzeMatrix() {
        const R = getMatrixFromGrid();
        if (!R) {
            showError('Pastikan semua sel berisi nilai valid antara 0 dan 1.');
            return;
        }

        const result = FE.analisisRelasi(R);
        renderResults(R, result);
        resultPanel.style.display = 'block';
        resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderResults(R, result) {
        let html = '';

        // Matrix display
        html += `<div class="result-section">`;
        html += `<p class="result-matrix-title">Matriks R (${R.length}×${R.length}):</p>`;
        html += renderMatrixHTML(R);
        html += `</div>`;

        // Properties
        const props = [
            { name: 'Refleksif', value: result.refleksif, icon: 'R' },
            { name: 'Simetris', value: result.simetris, icon: 'S' },
            { name: 'Transitif', value: result.transitif, icon: 'T' },
            { name: 'Proximity', value: result.proximity, icon: 'P' },
            { name: 'Toleransi', value: result.toleransi.isToleransi, icon: 'τ' }
        ];

        html += `<div class="result-section">`;
        props.forEach((prop, idx) => {
            html += `
                <div class="result-item">
                    <div class="result-badge ${prop.value ? 'badge-yes' : 'badge-no'}">${prop.icon}</div>
                    <span class="result-label">${idx + 1}. ${prop.name}</span>
                    <span class="result-status ${prop.value ? 'status-yes' : 'status-no'}">${prop.value ? 'YA' : 'TIDAK'}</span>
                </div>`;

            // Transitif violation detail
            if (prop.name === 'Transitif' && !result.transitif && result.pelanggaran.length > 0) {
                const p = result.pelanggaran[0];
                html += `<div class="result-detail">
                    Pelanggaran: μ(x${p.i},x${p.k}) = ${p.nilai.toFixed(2)} < min(μ(x${p.i},x${p.j}), μ(x${p.j},x${p.k})) = ${p.batas.toFixed(2)}<br>
                    Total pelanggaran: ${result.pelanggaran.length} pasang (i,j,k)
                </div>`;
            }

            // Toleransi detail
            if (prop.name === 'Toleransi') {
                if (result.toleransi.isToleransi) {
                    const k = result.toleransi.jumlahKomposisi;
                    if (k === 0) {
                        html += `<div class="result-detail">R sudah transitif tanpa perlu komposisi tambahan.</div>`;
                    } else {
                        html += `<div class="result-detail">
                            Diperlukan <strong>${k}</strong> kali komposisi max-min agar R menjadi transitif (relasi ekuivalensi).
                        </div>`;
                        html += `<p class="result-matrix-title">Matriks R<sup>${k + 1}</sup> (sudah transitif):</p>`;
                        html += renderMatrixHTML(result.toleransi.matriksAkhir);
                    }
                } else if (result.toleransi.alasan) {
                    html += `<div class="result-detail">${result.toleransi.alasan}</div>`;
                }
            }
        });
        html += `</div>`;

        // Equivalence notice
        if (result.ekuivalensi) {
            html += `<div class="result-equivalence">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                R adalah <strong>&nbsp;RELASI EKUIVALENSI&nbsp;</strong> (refleksif + simetris + transitif)
            </div>`;
        }

        resultContent.innerHTML = html;
    }

    function renderMatrixHTML(R) {
        const n = R.length;
        let html = '<table class="matrix-display-table"><thead><tr><th></th>';
        for (let j = 0; j < n; j++) {
            html += `<th>x<sub>${j + 1}</sub></th>`;
        }
        html += '</tr></thead><tbody>';
        for (let i = 0; i < n; i++) {
            html += `<tr><th>x<sub>${i + 1}</sub></th>`;
            for (let j = 0; j < n; j++) {
                const cls = i === j ? ' class="diag"' : '';
                html += `<td${cls}>${formatNumber(R[i][j])}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        return html;
    }

    function showError(msg) {
        resultPanel.style.display = 'block';
        resultContent.innerHTML = `
            <div class="result-item" style="border: 1px solid rgba(248,113,113,0.3);">
                <div class="result-badge badge-no">!</div>
                <span class="result-label" style="color: var(--accent-error);">${msg}</span>
            </div>`;
    }

    // ============================================================
    //  EXAMPLES
    // ============================================================

    const EXAMPLES = [
        {
            name: 'Contoh Slide',
            description: 'Relasi proximity & toleransi (2 komposisi)',
            matrix: [
                [1, 0.6, 0, 0.3, 0.2],
                [0.6, 1, 0.5, 0.8, 0],
                [0, 0.5, 1, 0, 0.4],
                [0.3, 0.8, 0, 1, 0.5],
                [0.2, 0, 0.4, 0.5, 1]
            ]
        },
        {
            name: 'Latihan 1',
            description: 'Relasi klasik — tidak simetris',
            matrix: [
                [1, 1, 0, 0, 0],
                [1, 1, 1, 0, 1],
                [0, 0, 1, 0, 0],
                [0, 1, 0, 1, 0],
                [0, 1, 1, 0, 1]
            ]
        },
        {
            name: 'Latihan 2',
            description: 'Relasi fuzzy — tidak simetris',
            matrix: [
                [1, 0.8, 0.4, 0.5, 0.6],
                [0.5, 1, 0.4, 0.3, 0.9],
                [0.4, 0.2, 1, 0.4, 0.4],
                [0.5, 0.5, 0.3, 1, 0.3],
                [0.4, 0.9, 0.4, 0.7, 1]
            ]
        },
        {
            name: 'Latihan 3',
            description: 'Relasi proximity & toleransi (2 komposisi)',
            matrix: [
                [1, 0.6, 0, 0.2, 0.3],
                [0.6, 1, 0.5, 0, 0.8],
                [0, 0.5, 1, 0, 0],
                [0.2, 0, 0, 1, 0.5],
                [0.3, 0.8, 0, 0.5, 1]
            ]
        },
        {
            name: 'Latihan 4',
            description: 'Relasi ekuivalensi (6×6)',
            matrix: [
                [1, 0.2, 1, 0.6, 0.2, 0.6],
                [0.2, 1, 0.2, 0.2, 0.8, 0.2],
                [1, 0.2, 1, 0.6, 0.2, 0.6],
                [0.6, 0.2, 0.6, 1, 0.2, 0.8],
                [0.2, 0.8, 0.2, 0.2, 1, 0.2],
                [0.6, 0.2, 0.6, 0.8, 0.2, 1]
            ]
        }
    ];

    function renderExamples() {
        let html = '';
        EXAMPLES.forEach((ex, idx) => {
            const result = FE.analisisRelasi(ex.matrix);
            const tags = [
                { label: 'Refleksif', val: result.refleksif },
                { label: 'Simetris', val: result.simetris },
                { label: 'Transitif', val: result.transitif },
                { label: 'Proximity', val: result.proximity },
                { label: 'Toleransi', val: result.toleransi.isToleransi }
            ];

            html += `
            <div class="card example-card" data-example="${idx}">
                <div class="card-body">
                    <div class="example-name">${ex.name}</div>
                    <div class="example-tags">
                        ${tags.map(t => `<span class="tag ${t.val ? 'tag-yes' : 'tag-no'}">${t.label}: ${t.val ? 'YA' : 'TIDAK'}</span>`).join('')}
                        ${result.ekuivalensi ? '<span class="tag tag-special">Ekuivalensi</span>' : ''}
                    </div>
                    <div class="example-matrix-preview">${matrixToText(ex.matrix)}</div>
                    <div class="example-action">
                        Analisis
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </div>
                </div>
            </div>`;
        });
        examplesGrid.innerHTML = html;

        // Click handlers
        document.querySelectorAll('.example-card').forEach(card => {
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.example);
                const ex = EXAMPLES[idx];
                setMatrixToGrid(ex.matrix);
                document.getElementById('analyzer').scrollIntoView({ behavior: 'smooth' });
                // Auto-analyze after a short delay
                setTimeout(() => analyzeMatrix(), 300);
            });
        });
    }

    function matrixToText(R) {
        const n = R.length;
        let text = '';
        const maxRows = Math.min(n, 5);
        for (let i = 0; i < maxRows; i++) {
            text += '[' + R[i].map(v => formatNumber(v).padStart(5)).join('') + ' ]\n';
        }
        if (n > 5) text += '  ...\n';
        return text.trimEnd();
    }

    // ============================================================
    //  PRACTICE MODE
    // ============================================================

    function generatePractice() {
        let R;
        const n = Math.floor(Math.random() * 3) + 4; // 4-6

        switch (practiceType) {
            case 'proximity':
                R = FE.generateProximityMatrix(n);
                break;
            case 'tolerance':
                R = FE.generateToleranceMatrix(n);
                break;
            case 'equivalence':
                R = FE.generateEquivalenceMatrix(n);
                break;
            default:
                // Random — sometimes fuzzy, sometimes classic
                const type = Math.random() < 0.3 ? 'classic' : 'fuzzy';
                const symmetric = Math.random() < 0.5;
                R = FE.generateRandomMatrix(n, type, symmetric);
        }

        practiceMatrix = R;
        practiceAnswer = FE.analisisRelasi(R);

        // Show practice area
        practiceArea.style.display = 'block';
        practiceFeedback.style.display = 'none';

        // Reset checkboxes
        ['refleksif', 'simetris', 'transitif', 'proximity', 'toleransi'].forEach(id => {
            document.getElementById(`chk-${id}`).checked = false;
            document.getElementById(`chk-${id}-label`).classList.remove('correct', 'wrong');
        });

        // Render matrix
        renderPracticeMatrix(R);
    }

    function renderPracticeMatrix(R) {
        const n = R.length;
        let html = `<div class="matrix-display-grid" style="grid-template-columns: 40px repeat(${n}, 1fr);">`;

        // Headers
        html += `<div class="matrix-label"></div>`;
        for (let j = 0; j < n; j++) {
            html += `<div class="matrix-label">x<sub>${j + 1}</sub></div>`;
        }

        for (let i = 0; i < n; i++) {
            html += `<div class="matrix-label">x<sub>${i + 1}</sub></div>`;
            for (let j = 0; j < n; j++) {
                const isDiag = i === j;
                html += `<div class="matrix-display-cell${isDiag ? ' diagonal' : ''}">${formatNumber(R[i][j])}</div>`;
            }
        }

        html += `</div>`;
        practiceMatrixDisplay.innerHTML = html;
    }

    function checkPracticeAnswer() {
        if (!practiceAnswer) return;

        const userAnswers = {
            refleksif: document.getElementById('chk-refleksif').checked,
            simetris: document.getElementById('chk-simetris').checked,
            transitif: document.getElementById('chk-transitif').checked,
            proximity: document.getElementById('chk-proximity').checked,
            toleransi: document.getElementById('chk-toleransi').checked
        };

        const correctAnswers = {
            refleksif: practiceAnswer.refleksif,
            simetris: practiceAnswer.simetris,
            transitif: practiceAnswer.transitif,
            proximity: practiceAnswer.proximity,
            toleransi: practiceAnswer.toleransi.isToleransi
        };

        let allCorrect = true;

        Object.keys(userAnswers).forEach(key => {
            const label = document.getElementById(`chk-${key}-label`);
            if (userAnswers[key] === correctAnswers[key]) {
                label.classList.add('correct');
                label.classList.remove('wrong');
            } else {
                label.classList.add('wrong');
                label.classList.remove('correct');
                allCorrect = false;
            }
        });

        // Update score
        if (allCorrect) {
            score.correct++;
        } else {
            score.wrong++;
        }
        updateScoreDisplay();

        // Show feedback
        showPracticeFeedback(allCorrect, correctAnswers);
    }

    function showPracticeFeedback(isCorrect, correctAnswers) {
        const props = ['Refleksif', 'Simetris', 'Transitif', 'Proximity', 'Toleransi'];
        const keys = ['refleksif', 'simetris', 'transitif', 'proximity', 'toleransi'];

        let detail = props.map((p, i) =>
            `<strong>${p}:</strong> ${correctAnswers[keys[i]] ? 'YA ✓' : 'TIDAK ✗'}`
        ).join(' &nbsp;|&nbsp; ');

        if (practiceAnswer.toleransi.isToleransi && practiceAnswer.toleransi.jumlahKomposisi > 0) {
            detail += `<br><br>Diperlukan <strong>${practiceAnswer.toleransi.jumlahKomposisi}</strong> kali komposisi max-min agar transitif.`;
        }

        if (practiceAnswer.ekuivalensi) {
            detail += `<br><br>R adalah <strong>Relasi Ekuivalensi</strong> ✨`;
        }

        practiceFeedback.className = `practice-feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
        practiceFeedback.innerHTML = `
            <div class="feedback-title">${isCorrect ? '🎉 Benar Semua!' : '❌ Ada yang Salah'}</div>
            <div class="feedback-detail">${isCorrect ? 'Semua jawaban kamu benar. Lanjut ke soal berikutnya!' : 'Jawaban yang benar:'}<br><br>${detail}</div>
        `;
        practiceFeedback.style.display = 'block';
    }

    function showSolution() {
        if (!practiceAnswer) return;

        const correctAnswers = {
            refleksif: practiceAnswer.refleksif,
            simetris: practiceAnswer.simetris,
            transitif: practiceAnswer.transitif,
            proximity: practiceAnswer.proximity,
            toleransi: practiceAnswer.toleransi.isToleransi
        };

        // Set checkboxes to correct answers
        Object.keys(correctAnswers).forEach(key => {
            document.getElementById(`chk-${key}`).checked = correctAnswers[key];
            const label = document.getElementById(`chk-${key}-label`);
            label.classList.add('correct');
            label.classList.remove('wrong');
        });

        showPracticeFeedback(true, correctAnswers);
    }

    function updateScoreDisplay() {
        const total = score.correct + score.wrong;
        document.getElementById('score-number').textContent = score.correct;
        document.getElementById('score-total').textContent = total;
        document.getElementById('stat-correct').textContent = score.correct;
        document.getElementById('stat-wrong').textContent = score.wrong;

        // Update ring
        const circle = document.getElementById('score-ring-circle');
        const circumference = 2 * Math.PI * 52; // r=52
        const pct = total > 0 ? score.correct / total : 0;
        const offset = circumference * (1 - pct);
        circle.style.strokeDashoffset = offset;
    }

    // ============================================================
    //  EVENT LISTENERS
    // ============================================================

    function setupEventListeners() {
        // Size buttons
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                matrixSize = parseInt(btn.dataset.size);
                updateSizeButtons();
                generateMatrixGrid();
                resultPanel.style.display = 'none';
            });
        });

        // Type buttons
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                valueType = btn.dataset.type;
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Random
        document.getElementById('btn-random').addEventListener('click', () => {
            const R = FE.generateRandomMatrix(matrixSize, valueType, false);
            setMatrixToGrid(R);
            resultPanel.style.display = 'none';
        });

        // Random symmetric
        document.getElementById('btn-random-symmetric').addEventListener('click', () => {
            const R = FE.generateRandomMatrix(matrixSize, valueType, true);
            setMatrixToGrid(R);
            resultPanel.style.display = 'none';
        });

        // Clear
        document.getElementById('btn-clear').addEventListener('click', () => {
            generateMatrixGrid();
            resultPanel.style.display = 'none';
        });

        // Analyze
        document.getElementById('btn-analyze').addEventListener('click', analyzeMatrix);

        // Practice type buttons
        document.querySelectorAll('.practice-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                practiceType = btn.dataset.ptype;
                document.querySelectorAll('.practice-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Generate practice
        document.getElementById('btn-generate-practice').addEventListener('click', generatePractice);

        // Check answer
        document.getElementById('btn-check-answer').addEventListener('click', checkPracticeAnswer);

        // Show solution
        document.getElementById('btn-show-solution').addEventListener('click', showSolution);

        // Reset score
        document.getElementById('btn-reset-score').addEventListener('click', () => {
            score = { correct: 0, wrong: 0 };
            updateScoreDisplay();
        });

        // Nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        // Scroll spy for nav
        const sections = ['analyzer', 'examples', 'practice', 'theory'];
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY + 100;
            for (let i = sections.length - 1; i >= 0; i--) {
                const el = document.getElementById(sections[i]);
                if (el && el.offsetTop <= scrollY) {
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    document.querySelector(`.nav-link[href="#${sections[i]}"]`)?.classList.add('active');
                    break;
                }
            }
        });
    }

    // ============================================================
    //  UTILITIES
    // ============================================================

    function formatNumber(val) {
        if (Number.isInteger(val) || Math.abs(val - Math.round(val)) < TOL) {
            return Math.round(val).toString();
        }
        // Show up to 2 decimal places
        const formatted = val.toFixed(2);
        // Remove trailing zeros after decimal
        return formatted.replace(/\.?0+$/, '') || '0';
    }
});
