type Brand<T, B extends string> = T & { readonly __brand: B };
type UserId = Brand<string, "UserId">;
type TaskId = Brand<string, "TaskId">;
type HAHHA = Brand<string, "TaskId">;

const userId = "u1" as UserId;
const taskId = "t1" as TaskId;

function getUser(id: UserId) {}
function getTask(id: TaskId) {}
getUser(userId); // valid UserId type
getUser(taskId); // TaskId type is not UserId type
getUser("u1"); // string is not UserId type

getTask(taskId); // valid TaskId type
getTask(userId); // UserId type is not TaskId type
getTask("t1"); // string is not TaskId type

/*Tradeoff or limitations
1. need to do manual casting in usage
2. usage of "any" can bypass the type safety
*/
