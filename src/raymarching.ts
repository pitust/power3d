//let fpsm = new FPSMeter(null, { theme: 'dark', graph: 1, heat: 1 });

import { assert } from "./util";

function generate_fragment_shader(distance_func: string, binds: string[], albedoFunc: string) {
    return `precision highp float;
    const int MAX_ITER = 100;
    const highp float MAX_DIST = 300.0;
    const highp float EPSILON = 0.01;
${binds.map(e => '    uniform highp vec3 ' + e + ';').join('\n')}


    
    highp float add(float d1, float d2) { return min(d1,d2); }

    highp float sub(float d1, float d2) { return (max(-d1,d2)); }

    highp float and(float d1, float d2) { return max(d1,d2); }

    highp float smooth_add(float d1, float d2, float k) {
        highp float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
        return mix( d2, d1, h ) - k*h*(1.0-h); }

    highp float smooth_sub(float d1, float d2, float k) {
        highp float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
        return mix( d2, -d1, h ) + k*h*(1.0-h); }

    highp float smooth_and(float d1, float d2, float k) {
        highp float h = clamp( 0.5 - 0.5*(d2-d1)/k, 0.0, 1.0 );
        return mix( d2, d1, h ) + k*h*(1.0-h); }

    highp vec3 modulate_x(vec3 off, float f) {
        for (int p = 0;p < 256;p++) {
            if (off.x < 0.0) off.x += f;
            else break;
        }
        for (int p = 0;p < 256;p++) {
            if (off.x > f) off.x -= f;
            else break;
        }
        return off;
    }

    highp vec3 modulate_y(vec3 off, float f) {
        for (int p = 0;p < 256;p++) {
            if (off.y < 0.0) off.y += f;
            else break;
        }
        for (int p = 0;p < 256;p++) {
            if (off.y > f) off.y -= f;
            else break;
        }
        return off;
    }

    highp vec3 modulate_z(vec3 off, float f) {
        for (int p = 0;p < 256;p++) {
            if (off.z < 0.0) off.z += f;
            else break;
        }
        for (int p = 0;p < 256;p++) {
            if (off.z > f) off.z -= f;
            else break;
        }
        return off;
    }

    highp float sphere(vec3 pos, float radius) {
        return length(pos) - radius;
    }

    highp float box(vec3 pos, vec3 size) {
        return length(max(abs(pos) - size, 0.0));
    }
    
    highp float rounded_box(vec3 pos, vec3 size, float radius) {
        highp vec3 q = abs(pos) - size;
        return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - radius;
    }
    
    highp float bounding_box(highp vec3 pos, highp vec3 size, highp float width) {
        pos = abs(pos)-size;
        highp vec3 q = abs(pos+width) - width;
        return min(min(
            length(max(vec3(pos.x,q.y,q.z),0.0))+min(max(pos.x,max(q.y,q.z)),0.0),
            length(max(vec3(q.x,pos.y,q.z),0.0))+min(max(q.x,max(pos .y,q.z)),0.0)),
            length(max(vec3(q.x,q.y,pos.z),0.0))+min(max(q.x,max(q.y,pos.z)),0.0));
    }
    
    highp float torus(vec3 pos, vec2 size) {
        highp vec2 q = vec2(length(pos.xz)-size.x,pos.y);
        return length(q)-size.y;
    }
    
    highp float plane(vec3 pos) {
        return box(pos, vec3(1.0/0.0, EPSILON, 1.0/0.0));
    }

    highp float distfunc(vec3 pos) {
        ${distance_func}
    }

    highp vec3 albedo_for(vec3 pos) {
        ${albedoFunc}
    }
    highp vec4 diffuse(highp vec3 pos, highp vec3 rayDir, highp float dist) {
        highp vec2 eps = vec2(0.0, 0.1);
        highp vec3 normal = normalize(vec3(
            distfunc(pos + eps.yxx) - distfunc(pos - eps.yxx),
            distfunc(pos + eps.xyx) - distfunc(pos - eps.xyx),
            distfunc(pos + eps.xxy) - distfunc(pos - eps.xxy)));
        highp float diffuse = max(0.0, dot(-rayDir, normal));
        highp float specular = 0.0 * pow(diffuse, 100.0);
        highp vec3 color = albedo_for(pos) * vec3(diffuse);
        return vec4(color, 1.0);
    }
    void main() {
        highp vec3 cameraOrigin = vec3(0.0, 0.0, 1.0);
        highp vec3 cameraTarget = vec3(0.0, 0.0, 0.0);
        highp vec3 upDirection = vec3(0.0, 1.0, 0.0);
        highp vec3 cameraDir = normalize(cameraTarget - cameraOrigin);
        highp vec3 cameraRight = normalize(cross(upDirection, cameraOrigin));
        highp vec3 cameraUp = cross(cameraDir, cameraRight);
        highp vec2 screenPos = -1.0 + 2.0 * gl_FragCoord.xy / vec2(800.0);
        highp vec3 rayDir = normalize(cameraRight * screenPos.x + cameraUp * screenPos.y + cameraDir);
        
        highp mat3 xrot = mat3(
            1.0, 0.0, 0.0,
            0.0, cos(u_camrot.x), -sin(u_camrot.x),
            0.0, sin(u_camrot.x), cos(u_camrot.x));
            
        highp mat3 yrot = mat3(
            cos(u_camrot.y), 0.0, sin(u_camrot.y),
            0.0, 1.0, 0.0,
            -sin(u_camrot.y), 0.0, cos(u_camrot.y));
        rayDir = rayDir * xrot;
        rayDir = rayDir * yrot;

        highp float totalDist = 0.0;
        highp vec3 pos = u_campos;
        highp float dist = EPSILON;
        highp float ever_nearest = 1.0/0.0;
        highp vec3 ever_nearest_p = vec3(255.0,0.0,0.0);
        int stepc = 0;
        for (int i = 0; i < MAX_ITER; i++) {
            stepc++;
            if (dist < EPSILON || totalDist > MAX_DIST)
	            break;
            dist = distfunc(pos);
            totalDist += dist;
            if (ever_nearest > dist) { ever_nearest = dist; ever_nearest_p = pos; }
            pos += dist * rayDir;
        }
        if (dist < EPSILON) {
            gl_FragColor = diffuse(pos, rayDir, dist);
        } else gl_FragColor = vec4(vec3(0.0), 1.0);
    }`;
}
export function startGL(binds: string[], distance_func: string, gbc: { [key: string]: [number, number, number] }, albedo_func: string) {

    const canvas: HTMLCanvasElement = document.querySelector('#glcanvas');
    assert(canvas.nodeName == 'CANVAS', '#glcanvas was not a canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }
    const vsSource = `
    attribute vec4 aVertexPosition;

    void main() {
      gl_Position = aVertexPosition;
    }
    `;
    let fsSource = generate_fragment_shader(distance_func, binds, albedo_func);
    console.log(fsSource);
    let shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    let programInfo = shaderProgram;
    globalThis.prg = programInfo;
    let buffers = initBuffers(gl);
    function f() {
        // fpsm.tickStart();
        drawScene(gl, programInfo, buffers, binds, gbc);
        requestAnimationFrame(f);
        // fpsm.tick();
    }
    f();
    return (ndf: string, nbinds: string[], nsf: string) => {
        distance_func = ndf;
        albedo_func = nsf;
        binds = nbinds;
        fsSource = generate_fragment_shader(distance_func, binds, albedo_func);
        console.log(fsSource);
        shaderProgram = initShaderProgram(gl, vsSource, fsSource);
        gl.deleteProgram(programInfo);
        programInfo = shaderProgram;
        globalThis.prg = programInfo;
    }
}
function initBuffers(gl: WebGLRenderingContext) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
         0,  0,
         0,  1,
         1,  1,
         1,  0,
         0,  0
    ].map(e => (e - 0.5) * 2);
    gl.bufferData(gl.ARRAY_BUFFER,
                new Float32Array(positions),
                gl.STATIC_DRAW);
    return positionBuffer;
}
function drawScene(gl: WebGLRenderingContext, program: WebGLProgram, buffers: WebGLBuffer, binds: string[], gbc: { [key: string]: [number, number, number] }) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers);
        gl.vertexAttribPointer(
            gl.getAttribLocation(program, 'aVertexPosition'),
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(gl.getAttribLocation(program, 'aVertexPosition'));
    }
    gl.useProgram(program);
    for (let b of binds) {
        gl.uniform3f(gl.getUniformLocation(program, b), ...gbc[b]);
    }
    {
        const offset = 0;
        const vertexCount = 5;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}
function initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}
function loadShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}
