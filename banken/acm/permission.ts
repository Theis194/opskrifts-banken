import { SafeUser } from "../db/user-db.ts";

export type Role = 'admin' | 'editor' | 'user' | 'guest';
export type Permission = 'read' | 'write' | 'delete';
export type Resource = 'recipe' | 'comment' | 'admin' | 'lists';

const resourcePermissions: Record<Resource, Record<Role, Permission[]>> = {
    recipe: {
        admin: ['read', 'write', 'delete'],
        editor: ['read', 'write'],
        user: [],
        guest: [],
    },
    // just an example
    comment: {
        admin: ['read', 'write', 'delete'],
        editor: ['read', 'write'],
        user: ['read', 'write'],
        guest: ['read'],
    },
    admin: {
        admin: ['read', 'write', 'delete'],
        editor: [],
        user: [],
        guest: [],
    },
    lists: {
        admin: ['read', 'write', 'delete'],
        editor: ['read', 'write', 'delete'],
        user: ['read', 'write', 'delete'],
        guest: ['read'],
    }
};

export function hasResourcePermission(role: Role, ressource: Resource, permission: Permission): boolean {
    return resourcePermissions[ressource][role].includes(permission);
}

export function authorizeRessource(user: SafeUser, ressource: Resource, permission: Permission): boolean {
    return hasResourcePermission(user.role, ressource, permission);
}
