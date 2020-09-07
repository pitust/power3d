(() => {
    function rfold(over, thongs) {
        if (thongs.length > 1) return over(rfold(over, thongs.slice(1)), thongs[0]);
        return thongs[0];
    }
    function degtotxyz(face) {
        return [...face.map(e => e * Math.PI / 180), 0];
    }
    window.PPObject = class PPObject {
        confable = [];
        engine = null;
        has_color = true
        applicants = {};
        conf(opt, ...args) {
            if (this.confable.includes(opt)) this.applicants[opt] = args;
        }
        apply() { if (this.confable.length) console.warn('PPObject ' + this.constructor.name + ' cannot be applied!'); }
        frame() {
            this.apply();
        }
        init() { }
        createSDF() { return '1.0/0.0'; }
    }
    window.AxisWarper = class AxisWarper {
        constructor(obj, axis, warpdst) {
            this._obj = obj;
            this._axis = axis;
            this._warpdst = warpdst;
        }
        _obj = null;
        _axis = 'x';
        _warpdst = 1;
        set engine(v) {
            this._obj.engine = v;
        }
        get id() {
            return this._obj.id;
        }
        has_color = true;
        apply() { this._obj.apply(); }
        frame() {
            this._obj.frame();
        }
        init() { console.log(this.engine); this._obj.init(); }
        createSDF() { return this._obj.createSDF().replace(/(\W)pos/g, '$1modulate_' + this._axis + '(pos, float(' + this._warpdst + '))'); }
    }
    window.Camera = class Camera extends PPObject {
        confable = ['pos', 'rot'];
        has_color = false
        vel = 0;
        constructor() {
            super();   
            window.onkeydown = (({ code }) => {
                if (code == 'KeyA')        this.applicants.pos[0] -= 0.5;
                if (code == 'KeyD')        this.applicants.pos[0] += 0.5;
                if (code == 'KeyW')        this.applicants.pos[2] -= 0.5;
                if (code == 'KeyS')        this.applicants.pos[2] += 0.5;
                if (code == 'ArrowUp')     this.applicants.rot[0] += 5.0;
                if (code == 'ArrowDown')   this.applicants.rot[0] -= 5.0;
                if (code == 'ArrowLeft')   this.applicants.rot[1] -= 5.0;
                if (code == 'ArrowRight')  this.applicants.rot[1] += 5.0;
                console.log(code);
                if (code == 'Space') this.vel = -0.25;
            }).bind(this);
        }
        frame() {
            this.engine.depends('u_campos');
            this.engine.depends('u_camrot');
            this.applicants.pos[1] += this.vel;
            this.vel += 0.01;
            if (this.applicants.pos[1] > -1) { this.applicants.pos[1] = -1; }
            this.apply();
        }
        apply() {
            this.engine.data.u_campos = this.applicants.pos;
            this.engine.data.u_camrot = degtotxyz(this.applicants.rot);
        }
    }
    window.Box = class Box extends PPObject {
        confable = ['pos', 'size', 'color'];
        init() {
            this.id = this.engine.id();
            this.engine.depends(this.id + 'pos');
            this.engine.depends(this.id + 'size');
            this.engine.depends(this.id + 'color');
        }
        apply() {
            this.engine.data[this.id + 'pos'] = this.applicants.pos;
            this.engine.data[this.id + 'size'] = this.applicants.size;
            this.engine.data[this.id + 'color'] = this.applicants.color;
        }
        createSDF() { return `box(pos - ${this.id}pos, ${this.id}size)`; }
    }
    const combineOps = ['and', 'add', 'sub', 'smooth_and', 'smooth_add', 'smooth_sub'];
    window.Combiner = class Combiner {
        has_color = true;
        constructor(l, op, r, k = null) {
            this.k = k;
            this.left = l;
            this.right = r;
            this.op = op;
            if (!combineOps.includes(op)) throw new Error('Invalid combiner op: ' + op);
        }
        _engine = null;
        set engine(v) {
            this._engine = v;
            this.left.engine = v;
            this.right.engine = v;
        }
        confable = ['color'];
        init() {
            this.id = this._engine.id();
            this._engine.depends(this.id + 'color');
            this._engine.depends(this.id + 'k');
            this.left.init();
            this.right.init();
        }
        conf(opt, ...vals) {
            if (opt != 'color') return;
            this.left.conf('color', ...vals);
            this.right.conf('color', ...vals);
            this.color = vals;
        }
        frame() {
            this.left.frame();
            this.right.frame();
            this.apply();
        }
        apply() {
            this._engine.data[this.id + 'color'] = this.color;
            this._engine.data[this.id + 'k'] = [this.k || 0, 0, 0];
        }
        createSDF() { return `${this.op}(${this.left.createSDF()}, ${this.right.createSDF()}${this.k ? (', ' + this.id + 'k.x') : ''})`; }
    }
    window.BoundingBox = class BoundingBox extends PPObject {
        confable = ['pos', 'size', 'color', 'thickness'];
        init() {
            this.id = this.engine.id();
            this.engine.depends(this.id + 'pos');
            this.engine.depends(this.id + 'size');
            this.engine.depends(this.id + 'color');
            this.engine.depends(this.id + 'thickness');
        }
        apply() {
            this.engine.data[this.id + 'pos'] = this.applicants.pos;
            this.engine.data[this.id + 'size'] = this.applicants.size;
            this.engine.data[this.id + 'color'] = this.applicants.color;
            this.engine.data[this.id + 'thickness'] = [this.applicants.thickness[0], 0, 0];
        }
        createSDF() { return `bounding_box(pos - ${this.id}pos, ${this.id}size, ${this.id}thickness.x)`; }
    }
    window.RoundedBox = class RoundedBox extends PPObject {
        confable = ['pos', 'size', 'color', 'radius'];
        init() {
            this.id = this.engine.id();
            this.engine.depends(this.id + 'pos');
            this.engine.depends(this.id + 'size');
            this.engine.depends(this.id + 'color');
            this.engine.depends(this.id + 'radius');
        }
        apply() {
            this.engine.data[this.id + 'pos'] = this.applicants.pos;
            this.engine.data[this.id + 'size'] = this.applicants.size;
            this.engine.data[this.id + 'color'] = this.applicants.color;
            this.engine.data[this.id + 'radius'] = [this.applicants.radius[0], 0, 0];
        }
        createSDF() { return `rounded_box(pos - ${this.id}pos, ${this.id}size, ${this.id}radius.x)`; }
    }
    window.Sphere = class Sphere extends PPObject {
        confable = ['pos', 'radius', 'color'];
        init() {
            this.id = this.engine.id();
            this.engine.depends(this.id + 'pos');
            this.engine.depends(this.id + 'color');
            this.engine.depends(this.id + 'radius_vec');
        }
        apply() {
            this.engine.data[this.id + 'pos'] = this.applicants.pos;
            this.engine.data[this.id + 'radius_vec'] = [this.applicants.radius[0], 0, 0];
            this.engine.data[this.id + 'color'] = this.applicants.color;
        }
        createSDF() { return `sphere(pos - ${this.id}pos, ${this.id}radius_vec.x)`; }
    }
    window.Plane = class Plane extends PPObject {
        confable = ['pos', 'color'];
        init() {
            this.id = this.engine.id();
            this.engine.depends(this.id + 'pos');
            this.engine.depends(this.id + 'color');
        }
        apply() {
            this.engine.data[this.id + 'pos'] = this.applicants.pos;
            this.engine.data[this.id + 'color'] = this.applicants.color;
        }
        createSDF() { return `plane(pos - ${this.id}pos)`; }
    }
    window.Engine = class Engine {
        _cam = new Camera();
        get cam() {
            return this._cam;
        }
        set cam(ncam) {
            this._cam.engine = null;
            this._cam = ncam;
            ncam.engine = this;
        }
        nodes = [this._cam];
        idgen = 0;
        deps = ['u_campos'];
        data = { u_campos: [0, 0, 0] };
        add(...nodes) {
            this.nodes.push(...nodes);
            for (let n of nodes) {
                n.engine = this;
                n.init();
                n.engine = null;
            }
        }
        id() { console.trace('u_' + (++this.idgen) + '_'); return 'u_' + (this.idgen) + '_'; }
        depends(wut) { if (!this.deps.includes(wut)) this.deps.push(wut); }
        go() {
            this.frame();
            let clasa = rfold((a, b) => 'min((' + a + '), (' + b + '))', this.nodes.map(e => e.createSDF()));
            let cf = 'highp float prev_best = 1.0/0.0;highp vec3 cur_color = vec3(0.0, 0.0, 0.0);' + this.nodes.filter(e=>e.has_color).map(e => `if ((${e.createSDF()}) < prev_best) { cur_color = ${e.id}color; prev_best = (${e.createSDF()}); }`).join('\n') + '\nreturn cur_color;';
            this._reloader = startGL(this.deps, `
                return ${clasa};
            `, this.data, cf);
        }
        reload() {
            let clasa = rfold((a, b) => 'min((' + a + '), (' + b + '))', this.nodes.filter(e=>e.has_color).map(e => e.createSDF()));
            let cf = 'highp float prev_best = 1.0/0.0;highp vec3 cur_color = vec3(0.0, 0.0, 0.0);' + this.nodes.filter(e=>e.has_color).map(e => `if ((${e.createSDF()}) < prev_best) { cur_color = ${e.id}color; prev_best = (${e.createSDF()}); }`).join('\n') + '\nreturn cur_color;';
            this._reloader(`
                return ${clasa};
            `, this.deps, cf);
        }
        frame() {
            for (let n of this.nodes) {
                n.engine = this;
                n.frame();
                n.engine = null;
            }
            requestAnimationFrame(this.frame.bind(this));
        }
    }
})();
