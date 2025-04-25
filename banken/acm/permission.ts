import { SafeUser } from "../db/user-db.ts";

export type Role = 'admin' | 'user' | 'guest';
export type Permission = 'read' | 'write' | 'delete';
export type Ressource = 'recipe' | 'comment'

const ressourcePermissions: Record<Ressource, Record<Role, Permission[]>> = {
    recipe: {
        admin: ['read', 'write', 'delete'],
        user: [],
        guest: [],
    },
    // just an example
    comment: {
        admin: ['read', 'write', 'delete'],
        user: ['read', 'write'],
        guest: ['read'],
    },
};

export function hasRessourcePermission(role: Role, ressource: Ressource, permission: Permission): boolean {
    return ressourcePermissions[ressource][role].includes(permission);
}

export function authorizeRessource(user: SafeUser, ressource: Ressource, permission: Permission): boolean {
    return hasRessourcePermission(user.role, ressource, permission);
}