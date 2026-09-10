/**
 * ============================================================
 *  FUZZY RELATION ANALYSIS ENGINE
 *  Ported from Python notebook — all math logic is here
 * ============================================================
 */

const TOL = 1e-9;

/**
 * Check reflexive: μ_R(xi, xi) = 1 for all i
 */
function cekRefleksif(R) {
    const n = R.length;
    for (let i = 0; i < n; i++) {
        if (Math.abs(R[i][i] - 1) > TOL) return false;
    }
    return true;
}

/**
 * Check symmetric: μ_R(xi, xj) = μ_R(xj, xi) for all i, j
 */
function cekSimetris(R) {
    const n = R.length;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (Math.abs(R[i][j] - R[j][i]) > TOL) return false;
        }
    }
    return true;
}

/**
 * Check transitive (fuzzy max-min):
 * μ_R(xi, xk) >= min(μ_R(xi,xj), μ_R(xj,xk)) for all i, j, k
 * Returns { isTransitif, pelanggaran: [{i, j, k, nilai, batas}] }
 */
function cekTransitif(R) {
    const n = R.length;
    const pelanggaran = [];
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            for (let k = 0; k < n; k++) {
                const batasBawah = Math.min(R[i][j], R[j][k]);
                if (R[i][k] < batasBawah - TOL) {
                    pelanggaran.push({
                        i: i + 1, j: j + 1, k: k + 1,
                        nilai: R[i][k],
                        batas: batasBawah
                    });
                }
            }
        }
    }
    return {
        isTransitif: pelanggaran.length === 0,
        pelanggaran
    };
}

/**
 * Max-min composition: C = A ○ B
 * C(i,j) = max_k min(A(i,k), B(k,j))
 */
function komposisiMaxMin(A, B) {
    const n = A.length;
    const p = B.length;
    const m = B[0].length;
    const C = Array.from({ length: n }, () => Array(m).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            let maxVal = 0;
            for (let k = 0; k < p; k++) {
                maxVal = Math.max(maxVal, Math.min(A[i][k], B[k][j]));
            }
            C[i][j] = maxVal;
        }
    }
    return C;
}

/**
 * Check proximity: reflexive AND symmetric AND NOT transitive
 */
function cekProximity(R) {
    const refl = cekRefleksif(R);
    const sim = cekSimetris(R);
    const { isTransitif } = cekTransitif(R);
    return refl && sim && !isTransitif;
}

/**
 * Check tolerance:
 * - Must be proximity (reflexive + symmetric + not transitive)
 * - OR reflexive + symmetric + already transitive (equivalence)
 * - If proximity, R^k must become transitive for some k ≤ n-1
 * Returns { isToleransi, jumlahKomposisi, matriksAkhir, keterangan/alasan }
 */
function cekToleransi(R) {
    const n = R.length;
    const refl = cekRefleksif(R);
    const sim = cekSimetris(R);

    if (!(refl && sim)) {
        return {
            isToleransi: false,
            jumlahKomposisi: null,
            alasan: 'Bukan relasi proximity (tidak refleksif dan/atau tidak simetris), sehingga tidak dapat berupa relasi toleransi.'
        };
    }

    const { isTransitif } = cekTransitif(R);
    if (isTransitif) {
        return {
            isToleransi: true,
            jumlahKomposisi: 0,
            matriksAkhir: R,
            keterangan: 'R sudah transitif tanpa komposisi tambahan (R adalah relasi ekuivalensi).'
        };
    }

    let Rk = R;
    const maksKomposisi = n - 1;
    for (let k = 1; k <= maksKomposisi; k++) {
        Rk = komposisiMaxMin(Rk, R);
        const result = cekTransitif(Rk);
        if (result.isTransitif) {
            return {
                isToleransi: true,
                jumlahKomposisi: k,
                matriksAkhir: Rk,
                keterangan: `R^${k + 1} = R komposisi (max-min) sebanyak ${k} kali sudah transitif.`
            };
        }
    }

    return {
        isToleransi: false,
        jumlahKomposisi: null,
        alasan: `Relasi R merupakan proximity, namun tetap tidak transitif meski sudah dikomposisikan sebanyak (n-1) = ${maksKomposisi} kali. Berarti R BUKAN relasi toleransi.`
    };
}

/**
 * Full analysis of a relation matrix
 */
function analisisRelasi(R) {
    const refl = cekRefleksif(R);
    const sim = cekSimetris(R);
    const transitifResult = cekTransitif(R);
    const prox = cekProximity(R);
    const tolResult = cekToleransi(R);

    const isEkuivalensi = refl && sim && transitifResult.isTransitif;

    return {
        refleksif: refl,
        simetris: sim,
        transitif: transitifResult.isTransitif,
        pelanggaran: transitifResult.pelanggaran,
        proximity: prox,
        toleransi: tolResult,
        ekuivalensi: isEkuivalensi
    };
}

/**
 * Generate a random matrix value (fuzzy or classic)
 */
function randomValue(type = 'fuzzy') {
    if (type === 'classic') {
        return Math.random() < 0.5 ? 0 : 1;
    }
    // Fuzzy: round to 1 decimal
    return Math.round(Math.random() * 10) / 10;
}

/**
 * Generate a random n×n matrix
 */
function generateRandomMatrix(n, type = 'fuzzy', symmetric = false) {
    const R = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                R[i][j] = 1; // refleksif by default for random
            } else if (symmetric && j < i) {
                R[i][j] = R[j][i]; // symmetric copy
            } else {
                R[i][j] = randomValue(type);
            }
        }
    }
    return R;
}

/**
 * Generate a proximity relation (reflexive + symmetric + NOT transitive)
 */
function generateProximityMatrix(n) {
    let attempts = 0;
    while (attempts < 200) {
        const R = generateRandomMatrix(n, 'fuzzy', true);
        const result = analisisRelasi(R);
        if (result.proximity) return R;
        attempts++;
    }
    // Fallback: use the known example
    return [
        [1, 0.6, 0, 0.3, 0.2],
        [0.6, 1, 0.5, 0.8, 0],
        [0, 0.5, 1, 0, 0.4],
        [0.3, 0.8, 0, 1, 0.5],
        [0.2, 0, 0.4, 0.5, 1]
    ];
}

/**
 * Generate a tolerance relation
 */
function generateToleranceMatrix(n) {
    let attempts = 0;
    while (attempts < 300) {
        const R = generateRandomMatrix(n, 'fuzzy', true);
        const result = analisisRelasi(R);
        if (result.toleransi.isToleransi && result.toleransi.jumlahKomposisi > 0) return R;
        attempts++;
    }
    // Fallback
    return [
        [1, 0.6, 0, 0.3, 0.2],
        [0.6, 1, 0.5, 0.8, 0],
        [0, 0.5, 1, 0, 0.4],
        [0.3, 0.8, 0, 1, 0.5],
        [0.2, 0, 0.4, 0.5, 1]
    ];
}

/**
 * Generate an equivalence relation (reflexive + symmetric + transitive)
 */
function generateEquivalenceMatrix(n) {
    // Strategy: create a partition, then build the equivalence matrix
    // Assign each element to a random cluster
    const clusters = [];
    for (let i = 0; i < n; i++) {
        clusters.push(Math.floor(Math.random() * Math.max(2, Math.floor(n / 2))));
    }

    const R = Array.from({ length: n }, () => Array(n).fill(0));

    // Within the same cluster, assign a high fuzzy value
    // Between clusters, assign a low one
    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            if (i === j) {
                R[i][j] = 1;
            } else if (clusters[i] === clusters[j]) {
                const v = Math.round((0.5 + Math.random() * 0.5) * 10) / 10;
                R[i][j] = v;
                R[j][i] = v;
            } else {
                const v = Math.round(Math.random() * 0.3 * 10) / 10;
                R[i][j] = v;
                R[j][i] = v;
            }
        }
    }

    // Now make transitive via max-min closure
    let current = R;
    for (let iter = 0; iter < n; iter++) {
        const next = komposisiMaxMin(current, R);
        // Check if converged
        let same = true;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (Math.abs(next[i][j] - current[i][j]) > TOL) {
                    same = false;
                    break;
                }
            }
            if (!same) break;
        }
        current = next;
        if (same) break;
    }

    return current;
}

// Export for use in app.js
window.FuzzyEngine = {
    cekRefleksif,
    cekSimetris,
    cekTransitif,
    komposisiMaxMin,
    cekProximity,
    cekToleransi,
    analisisRelasi,
    generateRandomMatrix,
    generateProximityMatrix,
    generateToleranceMatrix,
    generateEquivalenceMatrix,
    randomValue
};
