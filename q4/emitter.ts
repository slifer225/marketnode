class TypedEventEmitter<E extends object> {
  on<K extends Extract<keyof E, string>>(
    event: K,
    handler: (p: E[K]) => void
  ): this {
    return this;
  }
  emit<K extends Extract<keyof E, string>>(event: K, payload: E[K]): boolean {
    return true;
  }
}

interface Events {
  "task:created": { id: string };
  "task:done": { id: string; ok: boolean };
}

const emitter = new TypedEventEmitter<Events>();
emitter.on("task:done", (p) => console.log(p.ok));
emitter.emit("task:done", { id: "1", ok: true });
emitter.emit("task:done", { id: "1", ok: "yes" }); // the event value should be boolean
emitter.emit("task:todo", { id: "1", ok: true }); // todo event is not defined

/*Tradeoff or limitations
1. The limitations is it wont support dynamic events where event names are not known at compile time.
*/
