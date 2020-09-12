import { Engine } from "./engine";

export class Node {
    _children: Node[] = [];
    constructor(public engine: Engine, public parent: Node) {
        engine.dirty = true;
    }
    name: string = '<unnamed>';
    addChild(n: Node) {
        this._children.push(n);
    }
    children(n: Node[] | null = null) {
        if (n) this._children = n;
        return this._children;
    }
    _frame() {
        this._children.forEach(e => e._frame());
        this.onFrame();
    }
    onFrame() {}
}