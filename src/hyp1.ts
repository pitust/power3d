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
    let bb = new RoundedBox();
    let rb = new Sphere();
    let rb2 = new Sphere();
    let c = new Combiner(rb, 'smooth_sub', bb, 1);
    let c2 = new Combiner(c, 'add', rb2);;
    c2.conf('color', 1, 1, 1);
    c.conf('color', 1, 1, 0)
    rb.conf('pos', 0, 0, -10);
    rb.conf('radius', 0.5);
    rb2.conf('pos', 0, 0, -10);
    rb2.conf('radius', 0.5);
    bb.conf('pos', 0, 1, -10);
    bb.conf('size', 4, 1, 4);
    bb.conf('radius', 0.1);
    return c2;
})();
engine.add(box, floor, a, b);
floor.conf('pos', 0, 6, 0);
floor.conf('color', 0, 0, 1);
box.conf('color', 0, 1, 0);
box.conf('pos', 0, 0, 0);
box.conf('size', 2, 2, 2);
engine.cam.conf('pos', 2, 0, 2);
engine.cam.conf('rot', 0, 180);
engine.go();
