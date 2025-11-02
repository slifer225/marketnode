// create a enum for the roles
export enum Role {
  Admin = "admin",
  Member = "member",
}

export type User = {
  id: string;
  name?: string;
  email: string;
  role: Role; // use enum
};

const cache: Record<string, Readonly<User>> = {}; // make cache immutable

// simple validation rules to ensure user structure
function isUser(x: unknown): x is User {
  if (x === null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const hasStr = (k: string) => typeof o[k] === "string";
  const hasOptStr = (k: string) =>
    o[k] === undefined || typeof o[k] === "string";
  const roleOk = o.role === Role.Admin || o.role === Role.Member;
  return hasStr("id") && hasStr("email") && roleOk && hasOptStr("name");
}

// type guard for admin users
export function isAdmin(u: User | null): u is User & { role: Role.Admin } {
  return !!u && u.role === Role.Admin;
}

export async function getUser(id: string): Promise<User> {
  const hit = cache[id];
  if (hit) return { ...hit }; // return a defensive copy

  const res = await fetch(`https://example.com/api/users/${id}`);
  if (!res.ok)
    throw new Error(
      `Failed to fetch user "${id}": ${res.status} ${res.statusText}`
    );

  const data: unknown = await res.json();
  if (!isUser(data)) throw new Error(`Invalid user payload for "${id}"`);

  const user: User = {
    id: data.id,
    email: data.email,
    role: data.role,
    ...(data.name ? { name: data.name } : {}),
  };

  cache[id] = Object.freeze(user);
  return { ...user }; // return a defensive copy
}

export async function getAdmins(
  ids: string[]
): Promise<Array<User & { role: Role.Admin }>> {
  const users = await Promise.all(ids.map(getUser));
  return users.filter(isAdmin);
}
