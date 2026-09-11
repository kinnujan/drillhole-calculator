/**
 * Regression tests for calculateDipDirection.
 *
 *   node test_calculations.mjs
 *
 * Validated against 11,761 logged drillhole structure measurements from a
 * production database export carrying its own computed dip/azimuth to three
 * decimals: median plane-to-plane error 0.000 deg,
 * 97.9% within 0.1 deg. The residual 1% sits in four holes and is explained by a
 * constant per-hole azimuth offset between survey versions, not by the math.
 *
 * That validation runs against Mawson drillhole data and is deliberately not in
 * this repository. The cases below are synthetic.
 */

// measurements.js reaches browser globals through its import chain; stub the few
// the modules touch at load time so the pure calculation can be tested in node
globalThis.window = globalThis;
globalThis.document = { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null,
    addEventListener: () => {}, createElement: () => ({ style: {}, classList: { add(){}, remove(){} }, appendChild(){}, setAttribute(){} }) };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const { calculateDipDirection } = await import('./measurements.js');
const { calculateStrike } = await import('./utils.js');

let failed = 0;
const angDiff = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const pole = (dip, dir) => { const d = dip * Math.PI / 180, a = dir * Math.PI / 180;
    return [Math.sin(d) * Math.sin(a), Math.sin(d) * Math.cos(a), Math.cos(d)]; };
// angle between two planes, so that a dip direction flipped by 180 counts as equal
const planeAngle = (d1, a1, d2, a2) => { const p = pole(d1, a1), q = pole(d2, a2);
    return Math.acos(Math.min(1, Math.abs(p[0]*q[0] + p[1]*q[1] + p[2]*q[2]))) * 180 / Math.PI; };
function check(name, cond, detail = '') {
    if (cond) console.log(`  ok    ${name}${detail ? '  ' + detail : ''}`);
    else { failed++; console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`); }
}

console.log('hand-derived cases');
{
    // horizontal hole due north, plane at 45 deg to the core, beta 0 -> dips 45 north
    const [dip, dir] = calculateDipDirection(45, 0, 0, 0);
    check('horizontal hole 000, alpha 45, beta 0', near(dip, 45) && angDiff(dir, 0) < 1e-6, `got ${dip.toFixed(1)}/${dir.toFixed(1)}`);
}
{
    // a plane perpendicular to a hole plunging 60 north dips 30 south, whatever beta is
    for (const beta of [0, 37, 180, 312]) {
        const [dip, dir] = calculateDipDirection(90, beta, -60, 0);
        check(`alpha 90 (plane normal to core), beta ${beta}`, near(dip, 30) && angDiff(dir, 180) < 1e-6, `got ${dip.toFixed(1)}/${dir.toFixed(1)}`);
    }
}
{
    // alpha = 90 - |hole dip| with beta 0 puts the plane exactly vertical
    const [dip] = calculateDipDirection(30, 0, -60, 0);
    check('alpha 30 in a -60 hole gives a vertical plane', near(dip, 90), `got dip ${dip.toFixed(1)}`);
}
{
    // both of these returned NaN before the vector rewrite
    const a = calculateDipDirection(35, 0, -55, 0);
    check('vertical-plane case is finite', isFinite(a[0]) && isFinite(a[1]), `got ${a[0].toFixed(1)}/${a[1].toFixed(1)}`);
    const b = calculateDipDirection(0, 90, -60, 0);
    check('alpha 0 with beta 90 is finite', isFinite(b[0]) && isFinite(b[1]), `got ${b[0].toFixed(1)}/${b[1].toFixed(1)}`);
}

console.log('\ngolden values (lock the result against future refactors)');
{
    // [alpha, beta, holeDip, holeAz, expectedDip, expectedDipDirection]
    const golden = [
        [30,  45, -60,   0,  82.713755,  218.123432],
        [45,  90, -60,  90,  52.238756,  333.434949],
        [60, 135, -60, 180,  22.062191,   70.266102],
        [75, 225, -60, 270,  21.871349,   60.575389],
        [20, 315, -45,  30,  76.820557,  346.965555],
        [50, 200, -45, 120,  14.353697,  237.524985],
        [80,  10, -45, 210,  54.869418,   32.112962],
        [10, 170, -45, 300,  36.043286,  283.103869],
        [35,   0, -75,  45,  70.000000,  225.000000],
        [55, 180, -75, 135,  20.000000,  135.000000],
        [65,  95, -30, 225,  60.984073,   73.779348],
        [25, 285, -30, 315,  89.532129,   73.901096],
        [ 0,  60, -50, 100,  71.252763,  166.141345],
        [90, 123, -50, 100,  40.000000,  280.000000],
        [ 5, 355, -85, 355,  89.981070,  170.019074],
        [85,   5, -20,   5,  74.981513,  185.450623],
    ];
    let bad = 0;
    for (const [alpha, beta, holeDip, holeAz, expDip, expDir] of golden) {
        const [dip, dir] = calculateDipDirection(alpha, beta, holeDip, holeAz);
        if (!near(dip, expDip, 5e-6) || angDiff(dir, expDir) > 5e-6) {
            bad++;
            console.log(`        alpha ${alpha} beta ${beta} hole ${holeDip}/${holeAz}: got ${dip.toFixed(6)}/${dir.toFixed(6)}, expected ${expDip}/${expDir}`);
        }
    }
    check(`${golden.length} golden values reproduce`, bad === 0, bad ? `${bad} drifted` : '');
}

console.log('\nproperties over the full input range');
{
    let cases = 0, nan = 0, outOfRange = 0, ruleViolation = 0, strikeRejected = 0;
    for (let holeDip = -90; holeDip <= 90; holeDip += 1)
        for (let holeAz = 0; holeAz < 360; holeAz += 15)
            for (let alpha = 0; alpha <= 90; alpha += 1)
                for (let beta = 0; beta < 360; beta += 5) {
                    cases++;
                    const [dip, dir] = calculateDipDirection(alpha, beta, holeDip, holeAz);
                    if (!isFinite(dip) || !isFinite(dir)) { nan++; continue; }
                    if (dip < -1e-9 || dip > 90 + 1e-9 || dir < 0 || dir >= 360) outOfRange++;
                    // every dip direction must be acceptable to calculateStrike
                    try { calculateStrike(dir, 'negative'); } catch (e) { strikeRejected++; }
                    // at beta 0 or 180 the plane's dip vector lies in the vertical plane through
                    // the hole, so dip direction must be the hole azimuth or its reverse
                    if ((beta === 0 || beta === 180) && dip > 1 && dip < 89) {
                        if (Math.min(angDiff(dir, holeAz), angDiff(dir, holeAz + 180)) > 1e-6) ruleViolation++;
                    }
                }
    check('no NaN', nan === 0, `${cases.toLocaleString('en-US')} cases, ${nan} NaN`);
    check('dip in [0,90], dip direction in [0,360)', outOfRange === 0, `${outOfRange} out of range`);
    check('every dip direction accepted by calculateStrike', strikeRejected === 0, `${strikeRejected} rejected`);
    check('beta 0/180 => dip direction along hole azimuth', ruleViolation === 0, `${ruleViolation} violations`);
}

console.log('');
console.log('vertical planes (pole is horizontal, so either direction names the same plane)');
{
    // alpha = 90 - |holeDip| with beta 0 or 180 puts the plane exactly vertical.
    // nz is then floating point noise near 1e-17, so without a tie-break two
    // all-but-identical inputs could report dip directions 180 apart.
    let notVertical = 0, unpinned = 0, cases = 0;
    for (let holeDip = -89; holeDip <= -1; holeDip += 1)
        for (let holeAz = 0; holeAz < 360; holeAz += 3)
            {
                cases++;
                const [dip, dir] = calculateDipDirection(90 + holeDip, 0, holeDip, holeAz);
                if (Math.abs(dip - 90) > 1e-6) notVertical++;
                else if (!(dir >= 0 && dir < 180)) unpinned++;
            }
    check('the construction really is vertical', notVertical === 0, `${cases} cases, ${notVertical} were not`);
    check('dip direction pinned to [0,180)', unpinned === 0, `${unpinned} unpinned`);

    // Neighbouring inputs must describe the same plane. Compared as planes, not as
    // azimuths: any half circle convention is discontinuous at its own seam, and
    // dip direction 179.9 and 0.1 are the same vertical plane.
    let jumps = 0;
    for (let holeAz = 0; holeAz < 360; holeAz += 1) {
        const [d1, a1] = calculateDipDirection(30, 0, -60, holeAz);
        const [d2, a2] = calculateDipDirection(30, 0, -60, holeAz + 1e-9);
        if (planeAngle(d1, a1, d2, a2) > 1e-3) jumps++;
    }
    check('neighbouring inputs describe the same plane', jumps === 0, `${jumps} differ`);
}

console.log(failed === 0 ? '\nall passed' : `\n${failed} failed`);
process.exit(failed ? 1 : 0);
