import { Engine, Sphere, Plane, BoundingBox, RoundedBox, Combiner, Box } from "./low-level";

let engine = new Engine();
let box = new Box();
let sph = new Sphere();
sph.conf('color', 1, 1, 0);
sph.conf('radius', 1);
sph.conf('pos', 2, 2, 2);
let floor = new Plane();
let a = (() => {
    let bb = new BoundingBox();
    let rb = new RoundedBox();
    let c = new Combiner(bb, 'and', rb);
    c.conf('color', 1, 0, 0);
    rb.conf('pos', 10, 0, 0);
    rb.conf('size', 3, 3, 3);
    rb.conf('radius', 1);
    bb.conf('pos', 10, 0, 0);
    bb.conf('size', 4, 4, 4);
    bb.conf('thickness', 1);
    return c;
})();
let b = (() => {
    let bb = new Box();
    let rb = new Sphere();
    let c = new Combiner(rb, 'smooth_add', bb, 1);
    c.conf('color', 1, 1, 0)
    rb.conf('pos', 0, 1, -10);
    rb.conf('radius', 2);
    bb.conf('pos', 0, 1, -10);
    bb.conf('size', 1, 1, 1);
    let delta = -0.1;
    let off = 0;
    let p = () => {
        rb.conf('pos', 0, 1, -10 + off);
        off += delta;
        if (off < -20) off = 10;
        requestAnimationFrame(p);
    };
    requestAnimationFrame(p);
    return c;
})();
engine.add(box, floor, a, b);
floor.conf('pos', 0, 6, 0);
floor.conf('color', 0, 0, 1);
box.conf('color', 0, 1, 0);
box.conf('pos', 0, 0, 0);
box.conf('size', 2, 2, 2);
engine.cam.conf('pos', 2, 0, 2);
let rp = 0;
let ry = 0;
engine.cam.conf('rot', 0, 0);
engine.go();
document.onclick = () => { document.body.requestPointerLock(); }
let e = document.createElement('div');
document.body.appendChild(e);
e.innerHTML = '[chat off]';
e.style.color = 'white';
document.body.onmousemove = ({ movementX, movementY }) => {
    rp += movementY / 3;
    ry -= movementX / 3;
    rp += 360;
    ry += 360;
    rp = rp % 360;
    ry = ry % 360;
    if (rp > 90 && rp < 180) rp = 90;
    if (rp > 180 && rp < 270) rp = 270;
    engine.cam.conf('rot', rp, ry);
};
function move(m: number, off: number) {
    let np = engine.cam.applicants.pos;
    np[2] -= Math.cos(ry / 180 * Math.PI + off) * m / 2;
    np[0] -= Math.sin(ry / 180 * Math.PI + off) * m / 2;
}
let keyset = new Set<string>();;
window.onkeyup = (({ code }) => {
    keyset.delete(code);
});
window.onkeydown = (({ code }) => {
    keyset.add(code);
})
let vel = [0, 0, 0];
let shouldFly = true;
let inp = '';
let chatting = false;
function go(vela: number) {
    vel = [0, 0, 0];
    {
        let x = [0, 0, 0];
        x[2] -= Math.cos(ry / 180 * Math.PI) / 2;
        x[0] -= Math.sin(ry / 180 * Math.PI) / 2;
        vel = x.map((e, i) => vel[i] + (e * vela / 10));
    }
    {
        let x = [0, 0, 0];
        x[1] -= Math.sin(rp / 180 * Math.PI) / 2;
        vel = x.map((e, i) => vel[i] + (e * vela / 10 * -1));
    }
    let div = Math.sqrt(vel.reduce((e, f) => (f * f) + e, 0));
    vel = vel.map(e => e / div)
    engine.cam.applicants.pos[1] += 0.5;
    shouldFly = false;
}
function shoot(vela: number) {
    let localVel = [0, 0, 0];
    {
        let x = [0, 0, 0];
        x[2] -= Math.cos(ry / 180 * Math.PI) / 2;
        x[0] -= Math.sin(ry / 180 * Math.PI) / 2;
        localVel = x.map((e, i) => localVel[i] + (e * vela / 10));
    }
    {
        let x = [0, 0, 0];
        x[1] -= Math.sin(rp / 180 * Math.PI) / 2;
        localVel = x.map((e, i) => localVel[i] + (e * vela / 10 * -1));
    }
    let div = Math.sqrt(localVel.reduce((e, f) => (f * f) + e, 0));
    localVel = localVel.map(e => e / div);
    let c = new Sphere();
    let xcs = [...engine.cam.applicants.pos];
    c.conf('pos', ...xcs);
    c.conf('radius', 1);
    c.conf('color', 0, 1, 1);
    engine.add(c);
    engine.reload();
    let cur = -1;
    function f(z: number) {
        if (cur == -1) cur = z;
        z -= cur;
        localVel[1] += 0.03;
        xcs = xcs.map((e, i) => localVel[i] + e);
        c.conf('pos', ...xcs);
        if (z > 8000) {
            engine.del(c);
            // engine.reload();
            return;
        }
        requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
}
function f() {
    if (!shouldFly) engine.cam.applicants.pos[0] += vel[0];
    if (!shouldFly) engine.cam.applicants.pos[1] += vel[1];
    if (!shouldFly) engine.cam.applicants.pos[2] += vel[2];
    if (!shouldFly) vel[1] += 0.04;
    if (!shouldFly) if (engine.cam.applicants.pos[1] >= -1) {
        engine.cam.applicants.pos[1] = -1;
        vel = [0, 0, 0];
    }
    if (keyset.has('KeyA') && !chatting) move(1, Math.PI / 2);
    if (keyset.has('KeyD') && !chatting) move(1, -Math.PI / 2);
    if (keyset.has('KeyW') && !chatting) move(1, 0);
    if (keyset.has('KeyS') && !chatting) move(-1, 0);
    if (keyset.has('Space') && !chatting) {
        if (!shouldFly) vel[1] = -0.35;
        else {
            engine.cam.applicants.pos[1] -= 0.3;
        }
    }
    if (keyset.has('ShiftLeft') && shouldFly && !chatting) {
        engine.cam.applicants.pos[1] += 0.3;
    }
    if (keyset.has('Space') && chatting) {
        inp += ' ';
        keyset.delete('Space');
    }
    for (let e of keyset) if (e.startsWith('Key') && chatting) {
        let k = e.slice(3).toString().toLowerCase();
        if (keyset.has('ShiftLeft') && chatting) {
            k = k.toUpperCase();
        }
        inp += k;
        console.log(inp);
        keyset.delete(e);
    }
    for (let e of keyset) if (e.startsWith('Digit') && chatting) {
        let k = e.slice(5).toString().toLowerCase();
        inp += k;
        console.log(inp);
        keyset.delete(e);
    }
    if (keyset.has('Enter')) {
        chatting = !chatting;
        if (!chatting) {
            console.log(inp);
            if (inp == 'fly') {
                vel = [0, 0, 0];
                shouldFly = !shouldFly;
            }
            if (inp == 'home') {
                engine.cam.conf('pos', 2, 0, 2);

            }
            if (inp.startsWith('go ')) {
                let vel = +inp.slice(3);
                go(vel);
            }
            inp = '';
        }
        keyset.delete('Enter');
    }
    e.innerHTML = chatting ? '] ' + inp + '█' : '';
    requestAnimationFrame(f);
}
f();
onmousedown = () => {

    shoot(5);
}