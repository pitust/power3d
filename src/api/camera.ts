import { Vec2, Vec3 } from './vec';
import { Node } from './node';
import { Engine } from './engine';
export class Camera extends Node {
    rotation = new Vec2(0, 0);
    position = new Vec3(0, 0, 0);
    constructor(engine: Engine) {
        super(engine, engine);
        this.engine.shadow.cam.conf('rot', 0, 0);
        this.engine.shadow.cam.conf('pos', 0, 0, 0);
    }
    onFrame() {
        this.engine.shadow.cam.conf('rot', this.rotation.x, this.rotation.y);
        this.engine.shadow.cam.conf('pos', this.position.x, this.position.y, this.position.z);
    }
}