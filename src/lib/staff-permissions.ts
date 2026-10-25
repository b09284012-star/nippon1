export function staffPermissions(manager: boolean, responsibilities: readonly string[]) {
  return {
    manager,
    forum: manager || responsibilities.includes("forum"),
    disputes: manager || responsibilities.includes("disputes"),
    finance: manager,
    privateUsers: manager,
    assignStaff: manager,
  };
}