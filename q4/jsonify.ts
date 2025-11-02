type Jsonify<T> = T extends { toJSON(): infer U }
  ? Jsonify<U>
  : T extends Array<infer V>
  ? Jsonify<V>[]
  : T extends object
  ? { [K in keyof T]: Jsonify<T[K]> }
  : T;

interface User {
  name: string;
  created: Date | null;
  number: number;
}
type UserJSON = Jsonify<User>;

const u: UserJSON = JSON.parse(
  JSON.stringify({ name: "A", created: new Date() })
);

/*Tradeoff or limitations
1. complex nested object types will lead to deep recursion and slower type checking
2. drop or ignore unsupported values such as bigint
*/
