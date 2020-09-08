import { Engine, Sphere, Plane, BoundingBox, RoundedBox, Combiner, Box } from "./rapi1";

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
    setInterval(() => {
        c.k += delta;
        c.k = Math.max(c.k, 0);
        c.k = Math.min(c.k, 1);
        if (c.k == 0) delta = 0.1;
        if (c.k == 1) delta = -0.1;
    }, 100)
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
document.body.onmousemove = ({movementX, movementY}) => {
    rp += movementY;
    ry -= movementX;
    engine.cam.conf('rot', rp, ry);
};
function move(m: number, off: number) {
    let np = engine.cam.applicants.pos;
    np[2] -= Math.cos(ry / 180 * Math.PI + off) * m;
    np[0] -= Math.sin(ry / 180 * Math.PI + off) * m;
}
window.onkeydown = (({ code }) => {
    if (code == 'KeyA') move(1,  Math.PI / 2);
    if (code == 'KeyD') move(1, -Math.PI / 2);
    if (code == 'KeyW') move(1, 0);
    if (code == 'KeyS') move(-1, 0);    
    console.log(code);
    if (code == 'Space') engine.cam.vel = -0.25;
})