export function assert(c: any, v: string): asserts c {
    if (!c) throw new Error(v);
}
    