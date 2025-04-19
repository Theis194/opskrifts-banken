export type Role = 'admin' | 'user' | 'guest';
export type Permission = 'read' | 'write' | 'delete';
export type Ressource = 'post' | 'comment'

export type User = {
    email: string;
    username: string;
    master_password: string;
    role: Role;
}

const ressourcePermissions: Record<Ressource, Record<Role, Permission[]>> = {
    post: {
        admin: ['read', 'write', 'delete'],
        user: ['read', 'write'],
        guest: ['read'],
    },
    comment: {
        admin: ['read', 'write', 'delete'],
        user: ['read', 'write'],
        guest: ['read'],
    },
};

export function hasRessourcePermission(role: Role, ressource: Ressource, permission: Permission): boolean {
    return ressourcePermissions[ressource][role].includes(permission);
}

export function authorizeRessource(user: User, ressource: Ressource, permission: Permission): boolean {
    return hasRessourcePermission(user.role, ressource, permission);
}