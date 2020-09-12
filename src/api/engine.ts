import { Node } from "./node";
import { InputManager } from "./input";
import * as ll from '../low-level';
export class Engine extends Node {
    inputManager: InputManager;
    shadow: ll.Engine;
    dirty: boolean = false;
    constructor() {
        super(null, null);
        this.engine = this;
        this.shadow = new ll.Engine();
        this.shadow.go(false);
        this.inputManager = new InputManager();
        this._frame();
    }
    onFrame() {
        if (this.dirty) {
            this.dirty = false;
            this.shadow.reload();
        }
        this.shadow.frame(false);
        requestAnimationFrame(this._frame.bind(this) as any);
    }
}