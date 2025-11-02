## Assumptions

- Assume that the code is copied from version control diff; lines prefixed with `-` are deletions and `+` are additions.
- The review is made based on the added code only.

## Reviewed Code

```ts
app.post("/login", async (req, res) => {
  const body = req.body as any;
  const user = await db.users.findOne({ email: body.email });
  if (!user) return res.status(401).end();
  if (user.passwordHash == hash(body.password)) {
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "dev");
    res.cookie("auth", token);
    return res.json({ user });
  }
  res.status(401).end();
});
```

## Code Review Notes

- **Type-safe**: `const body = req.body as any;` removes type safety where it is most needed. Define a `LoginBody` interface (for example, `{ email: string; password: string }`) and perform validation on the data before use.

- **Correctness**: `db.users.findOne({ email: body.email });` should normalize email input (e.g., lowercase/trim) and rely on a normalized unique index. When fetching, project only required fields to avoid pulling sensitive data.'

- **Guard clause**: `res.status(401).end();` is return in different claused and reduce readability. And it can lead to multple if/else statement if not grouped logically. A guard clause pattern will improve readability and make maintenance easier in future. The condition can be split if different status code is required

```ts
if (!user) {
  throw A;
}
if (user.passwordHash != hash(body.password)) {
  throw B;
}
const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "dev");
res.cookie("auth", token);
return res.json({ user });
```

- **Security — enumeration**: `if (!user) return res.status(401).end();` You can chain it with express `next(newAuthorizationError)` or nest `throw new UnauthorizedException('Invalid credentials');` and use a catch class to handle global exception to handle the error response structure.

- **Security — password check**: `if (user.passwordHash == hash(body.password))` shown that the system is simply hash and compare the user hash explicitly in the system, which will cause unnecessary risk on the password leakage if not handle properly. Furthermore, seeing the hash feature does not include salt as part of the method, which suggest the salt is not used during the password hashing. Risk such as brute force may occur. Imagine if multiple users is using the same password, and hashed with same algorithm and stored in the database. Hacker can easily brute force the system by using common hashing algorithm. Library such as **brypt** should be use to store the use password and perform password comparison.

- **JWT token generation**: `jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'dev');` will fail fast if `JWT_SECRET` is absent. Also standard claims such as (`sub`, `iss`, `exp`) is missing.

- **Cookie Options**: Options such as `secure, httpOnly, domain, path and expres` should included while setting a cookie. `secure` ensure that browser only to send the cookies over HTTPsS. `httpOnly` protect the cookie against cross-site scripting.
  `domain and path` will compare against the domain and path requested. `expires` to ensure the cookies does not persist forever in the client browser

- **Data privacy**: `return res.json({ user });` is exposing the raw database entity and leak the database structure schema. Instead return a DTO and ensure only user info and not sensitive fews such as **password** also included as part of the payload.
