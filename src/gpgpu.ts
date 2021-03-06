import { assert } from "./util";
import { SHADER_STORAGE_BUFFER, COMPUTE_SHADER, getComputeContext } from './constants';
export enum UNIFORM_TYPES {
    INT,
    FLOAT,
    VEC2,
    VEC3,
    VEC4,
}
const MAP = {
    INT: '1i',
    FLOAT: '1f',
    VEC2: '2f',
    VEC3: '3f',
    VEC4: '4f',
    [0]: '1i',
    [1]: '1f',
    [2]: '2f',
    [3]: '3f',
    [4]: '4f'
}
const TYPE_MAP = {
    '1i': 'int',
    '1f': 'float',
    '2f': 'vec2',
    '3f': 'vec3',
    '4f': 'vec4'
}
const DEFAULT_VAL = {
    '1i': 0,
    '1f': 0,
    '2f': [0, 0],
    '3f': [0, 0, 0],
    '4f': [0, 0, 0, 0]
}
function rflat<T>(a: T | (T | (T | T[])[])[]): T[] { return (([a] as any).flat() as (T | (T | T[])[])[]).map(e => e instanceof Array ? rflat(e) : e) as any; }
function maptype(t: "int" | "float" | "vec2" | "vec3" | "vec4") { return TYPE_MAP[MAP[t]]; }

function encodeIntoBuf(vals: [keyof typeof MAP, number[]][]) {
    let len = 0;
    for (let [type] of vals) {
        if (MAP[type] == '1f') len += 4;
        if (MAP[type] == '1i') len += 4;
        if (MAP[type] == '2f') len += 8;
        if (MAP[type] == '3f') len += 12;
        if (MAP[type] == '4f') len += 16;
    }
    let buf = new DataView(new ArrayBuffer(len));
    let off = 0;
    for (let [type, val] of vals) {
        val = ([val] as any).flat();
        if (MAP[type] == '1f') { buf.setFloat32(off, val[0], true); }
        if (MAP[type] == '1i') { buf.setInt32(off, val[0], true); }
        if (MAP[type] == '2f') { buf.setFloat32(off, val[0], true); buf.setFloat32(off + 4, val[1], true); }
        if (MAP[type] == '3f') { buf.setFloat32(off, val[0], true); buf.setFloat32(off + 4, val[1], true); buf.setFloat32(off + 8, val[2], true); }
        if (MAP[type] == '4f') { buf.setFloat32(off, val[0], true); buf.setFloat32(off + 4, val[1], true); buf.setFloat32(off + 8, val[2], true); buf.setFloat32(off + 12, val[3], true); }

        if (MAP[type] == '1f') off += 4;
        if (MAP[type] == '1i') off += 4;
        if (MAP[type] == '2f') off += 8;
        if (MAP[type] == '3f') off += 12;
        if (MAP[type] == '4f') off += 16;
    }
    return buf.buffer;
}
/**
 * 
 * @param {*} vals 
 * @param {DataView} buf 
 */
function decodeFromBuf(vals, buf) {
    let off = 0;
    let out = [];
    for (let [type, _val, name, iter] of vals) {
        let result = [];
        if (MAP[type] == '1f') { result = buf.getFloat32(off, true); }
        if (MAP[type] == '1i') { result = buf.getInt32(off, true); }
        if (MAP[type] == '2f') { result = [buf.getFloat32(off, true), buf.getFloat32(off + 4, true)] }
        if (MAP[type] == '3f') { result = [buf.getFloat32(off, true), buf.getFloat32(off + 4, true), buf.getFloat32(off + 8, true)] }
        if (MAP[type] == '4f') { result = [buf.getFloat32(off, true), buf.getFloat32(off + 4, true), buf.getFloat32(off + 8, true), buf.getFloat32(off + 12, true)] }
        out[iter] = out[iter] || {};
        out[iter][name] = result;
        if (MAP[type] == '1f') off += 4;
        if (MAP[type] == '1i') off += 4;
        if (MAP[type] == '2f') off += 8;
        if (MAP[type] == '3f') off += 12;
        if (MAP[type] == '4f') off += 16;
    }
    return out;
}
/**
 * 
 * @param {string} code 
 */
function programFactory(code: string) {
    let canvas = new OffscreenCanvas(1, 1)
    const context = getComputeContext(canvas);
    const computeShaderSource = code;
    const computeShader = context.createShader(COMPUTE_SHADER as number);
    context.shaderSource(computeShader, computeShaderSource);
    context.compileShader(computeShader);
    const computeProgram = context.createProgram();
    context.attachShader(computeProgram, computeShader);
    context.linkProgram(computeProgram);
    function run<T extends ArrayBufferView | ArrayBuffer>(uniforms: { type: string | number; name: string; data: number[]; }[], inbuf: T, nodeCount: number): T {
        const buffer = context.createBuffer();
        context.bindBuffer(SHADER_STORAGE_BUFFER, buffer);
        context.bufferData(SHADER_STORAGE_BUFFER, inbuf, context.DYNAMIC_COPY);
        context.bindBufferBase(SHADER_STORAGE_BUFFER, 0, buffer);
        context.useProgram(computeProgram);
        if (context.getShaderInfoLog(computeShader)) throw new Error(context.getShaderInfoLog(computeShader));
        if (context.getProgramInfoLog(computeProgram)) throw new Error(context.getProgramInfoLog(computeProgram));
        for (let u of uniforms) {
            let x = context.getUniformLocation(computeProgram, u.name);
            if (x) context['uniform' + MAP[u.type]](x, ...rflat([u.data]));
            else console.warn('Unable to find unform ' + u.name);
        }
        context.dispatchCompute(nodeCount, 1, 1);
        const result = new Uint8Array(inbuf.byteLength);
        context.getBufferSubData(SHADER_STORAGE_BUFFER, 0, result);
        if (inbuf instanceof ArrayBuffer) return result.buffer as any;
        return new (inbuf.constructor as any)(result.buffer);
    }
    return run;
}
// lel = programFactory(`#version 310 es
// uniform int testInt;
// layout (local_size_x = 2, local_size_y = 1, local_size_z = 1) in;
// layout (std430, binding = 0) buffer SSBO {
//        int data[];
//        } ssbo;
// void main() { int threadIndex = int(gl_GlobalInvocationID.x); ssbo.data[threadIndex] = threadIndex + ssbo.data[threadIndex] + testInt; } `)
// lel([{ type: UNIFORM_TYPES.INT, data: [2], name: 'testInt' }], new Int32Array([1, 1, 4]), 3);
type IInput = { type: string | number, name: string }[];
class ComputeShader {
    _run: <T extends ArrayBufferView | ArrayBuffer>(uniforms: {
        type: string | number;
        name: string;
        data: number[];
    }[], inbuf: T, nodeCount: number) => T;
    /**
     * 
     * @param {string} code 
     * @param {{ type: string | number, name: string }[]} globalInputs 
     * @param {{ type: string | number, name: string }[]} inputs 
     * @param {{ type: string | number, name: string }[]} outputs 
     */
    constructor(public code: string, public globalInputs: IInput, public inputs: IInput, public outputs: IInput) {
        this._run = programFactory(code);
    }
    /**
     * 
     * @param {number} nodeCount 
     * @param {{ [key: string]: number | number[] }} data 
     * @returns {{ [key: string]: number }[]}
     */
    run(nodeCount, data) {
        let bufa = [];
        let bufb = [];
        for (let i = 0; i < nodeCount; i++) {
            for (let e of this.inputs) {
                if (data[e.name]) {
                    assert(data[e.name] instanceof Array, 'Bad input to run(): wrong type of ' + e.name);
                    assert(data[e.name].length == nodeCount, 'Bad input to run(): wrong amount of inputs to ' + e.name);
                    bufb.push([e.type, data[e.name][i], e.name, i]);
                }
            }

            for (let e of this.outputs) {
                bufb.push([e.type, DEFAULT_VAL[MAP[e.type]], e.name, i]);
            }
        }
        for (let e of this.globalInputs) {
            if (data[e.name]) {
                bufa.push({ type: e.type, name: 'u_' + e.name, data: data[e.name] });
            }
        }
        return decodeFromBuf(bufb, new DataView(this._run(bufa, encodeIntoBuf(bufb), nodeCount)));
    }
}
interface FnBuilder {
    assign(to: LVal, val: Exp): BuiltNode;
    fmt(pattern: string, ...vals: any[]): Exp;
}
type BuiltNode = Exp | LVal | string;
interface LVal {
    assignfmt: string;
}
interface Exp {
    exp: string;
}
class ComputeShaderBuilder {
    INT: any;
    FLOAT: any;
    VEC2: any;
    VEC3: any;
    VEC4: any;
    _main = '__undef__';
    idgenb = 0;
    id() {
        return '_id_' + this.idgenb++;
    }
    constructor() {
        Object.assign(this, UNIFORM_TYPES);
    }
    _code = '';
    function(rets: string, args: string[], build: (b: FnBuilder) => BuiltNode[]) {
        function str(elem: Exp | LVal | any) {
            return String(elem.exp || elem.assignfmt || String(elem));
        }
        let id = this.id();
        let code = rets + ' ' + id + '(' + args.map((e, i) => e + ' arg' + i) + ') {' + rflat(build(Object.assign({
            assign(to: LVal, val: Exp) {
                return this.fmt('$1 = $2;', to.assignfmt, val.exp).toString();
            },
            fmt(pattern: string, ...vals: any[]): Exp {
                let res = pattern.replace(/\$[0-9]+/g, (v: string) => '(' + str(vals[(+v.slice(1)) - 1]) + ')');
                return {  exp: res, toString() { return res; }, id: res } as any;
            }
        }, (Object as any).fromEntries(args.map((e, i) => (['arg' + i, { type: ['exp'], exp: 'arg' + i }])))))).join('\n') + '}';
        this._code += '\n' + code;
        return id;
    }
    main(id: string) {
        this._main = id;
    }
    codegen() {
        this._code = `#version 310 es
layout (local_size_x = 2, local_size_y = 1, local_size_z = 1) in;
struct z {
    ${this._codegen_info}
};
layout (std430, binding = 0) buffer BufferData {
    z io[];
} buf;
${this._code}
void main() {
    ${this._main}();
}`;
        return this._code;
    }
    gins = [];
    inp = [];
    outp = [];
    _codegen_info = '';
    global_input(type, name) {
        this.gins.push([type, name]);
        this._code += '\nuniform ' + maptype(type) + ' u_' + name + ';';
        return { type: ['exp', 'id'], exp: 'u_' + name, id: 'u_' + name };
    }
    input(type, name) {
        this.inp.push([type, name]);
        this._codegen_info += '\n' + maptype(type) + ' ' + name + ';';
        return { type: ['exp'], exp: 'buf.io[gl_GlobalInvocationID.x].' + name };
    }
    output(type, name) {
        this.outp.push([type, name]);
        this._codegen_info += '\n' + maptype(type) + ' ' + name + ';';
        return { type: ['lval'], assignfmt: 'buf.io[gl_GlobalInvocationID.x].' + name };
    }
    build() {
        return new ComputeShader(this.codegen(),
            this.gins.map(e => ({ type: e[0], name: e[1] })),
            this.inp.map(e => ({ type: e[0], name: e[1] })),
            this.outp.map(e => ({ type: e[0], name: e[1] })));
    }
}

let b = new ComputeShaderBuilder();
let ntc = b.global_input(b.FLOAT, 'number_to_cube');
let res = b.output(b.FLOAT, 'cubing_result');
b.main(b.function('void', [], bldr => ([
    bldr.assign(res, bldr.fmt('$1 * $1 * $1', ntc))
])));
let s = b.build();
console.log(s.run(1, { number_to_cube: 3 })[0].cubing_result);