export class InputManager {
    mappings: { [id: string]: () => void; };
    keys2mappings: Map<Set<string>, string>;
    register(keys: Set<string> | string, name: string, fn: () => void) {
        this.mappings[name] = fn;
        this.keys2mappings.set(keys instanceof Set ? keys : new Set(keys.split('+')), name);
    }
    constructor() {
        let e = this;
        this.mappings = {};
        this.keys2mappings = new Map();
        let keyset = new Set<string>();;
        window.onkeyup = (({ code }) => {
            keyset.delete(code);
        });
        window.onkeydown = (({ code }) => {
            keyset.add(code);
        })
        function f() {
            nxk: for (let [k, v] of e.keys2mappings) {
                for (let e of k) {
                    if (!keyset.has(e)) continue nxk;
                }
                e.mappings[v]();
            }
            requestAnimationFrame(f);
        }
        f();
    }
}