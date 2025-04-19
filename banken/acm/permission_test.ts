import { assertEquals } from "@std/assert";
import { hasRessourcePermission, authorizeRessource, Role, User, Permission } from "./permission.ts";

const adminUser: User = { email: 'admin@example.com', username: 'Alice', master_password: '123', role: 'admin' };
const regularUser: User = { email: 'regular@example.com', username: 'Bob', master_password: '123', role: 'user' };
const guestUser: User = { email: 'guest@example.com', username: 'Charlie', master_password: '123', role: 'guest' };

// Testing authroize
// Admin
Deno.test("adminUserAuthrizeRead", () => {
    const authorizedPost = authorizeRessource(adminUser, 'post', 'read');
    const authorizedComment = authorizeRessource(adminUser, 'comment', 'read');
    assertEquals(authorizedPost, true);
    assertEquals(authorizedComment, true);
})

Deno.test("adminUserAuthrizeWrite", () => {
    const authorizedPost = authorizeRessource(adminUser, 'post', 'write');
    const authorizedComment = authorizeRessource(adminUser, 'comment', 'write');
    assertEquals(authorizedPost, true);
    assertEquals(authorizedComment, true);
})

Deno.test("adminUserAuthrizeDelete", () => {
    const authorizedPost = authorizeRessource(adminUser, 'post', 'delete');
    const authorizedComment = authorizeRessource(adminUser, 'comment', 'delete');
    assertEquals(authorizedPost, true);
    assertEquals(authorizedComment, true);
})

// User
Deno.test("regularUserAuthrizeRead", () => {
    const authorizedPost = authorizeRessource(regularUser, 'post', 'read');
    const authorizedComment = authorizeRessource(regularUser, 'comment', 'read');
    assertEquals(authorizedPost, true);
    assertEquals(authorizedComment, true);
})

Deno.test("regularUserAuthrizeWrite", () => {
    const authorizedPost = authorizeRessource(regularUser, 'post', 'write');
    const authorizedComment = authorizeRessource(regularUser, 'comment', 'write');
    assertEquals(authorizedPost, true);
    assertEquals(authorizedComment, true);
})

Deno.test("regularUserAuthrizeDelete", () => {
    const authorizedPost = authorizeRessource(regularUser, 'post', 'delete');
    const authorizedComment = authorizeRessource(regularUser, 'comment', 'delete');
    assertEquals(authorizedPost, false);
    assertEquals(authorizedComment, false);
})

// Guest
Deno.test("guestUserAuthrizeRead", () => {
    const authorizedPost = authorizeRessource(guestUser, 'post', 'read');
    const authorizedComment = authorizeRessource(guestUser, 'comment', 'read');
    assertEquals(authorizedPost, true);
    assertEquals(authorizedComment, true);
})

Deno.test("guestUserAuthrizeWrite", () => {
    const authorizedPost = authorizeRessource(guestUser, 'post', 'write');
    const authorizedComment = authorizeRessource(guestUser, 'comment', 'write');
    assertEquals(authorizedPost, false);
    assertEquals(authorizedComment, false);
})

Deno.test("guestUserAuthrizeDelete", () => {
    const authorizedPost = authorizeRessource(guestUser, 'post', 'delete');
    const authorizedComment = authorizeRessource(guestUser, 'comment', 'delete');
    assertEquals(authorizedPost, false);
    assertEquals(authorizedComment, false);
})

// Testing hasPermission
// Admin
Deno.test("adminReadPermission", () => {
    const permissionPost = hasRessourcePermission('admin', 'post', 'read');
    const permissionComment = hasRessourcePermission('admin', 'comment', 'read');
    assertEquals(permissionPost, true);
    assertEquals(permissionComment, true);
})

Deno.test("adminWritePermission", () => {
    const permissionPost = hasRessourcePermission('admin', 'post', 'write');
    const permissionComment = hasRessourcePermission('admin', 'comment', 'write');
    assertEquals(permissionPost, true);
    assertEquals(permissionComment, true);
})

Deno.test("adminDeletePermission", () => {
    const permissionPost = hasRessourcePermission('admin', 'post', 'delete');
    const permissionComment = hasRessourcePermission('admin', 'comment', 'delete');
    assertEquals(permissionPost, true);
    assertEquals(permissionComment, true);
})

// User
Deno.test("userReadPermission", () => {
    const permissionPost = hasRessourcePermission('user', 'post', 'read');
    const permissionComment = hasRessourcePermission('user', 'comment', 'read');
    assertEquals(permissionPost, true);
    assertEquals(permissionComment, true);
})

Deno.test("userWritePermission", () => {
    const permissionPost = hasRessourcePermission('user', 'post', 'write');
    const permissionComment = hasRessourcePermission('user', 'comment', 'write');
    assertEquals(permissionPost, true);
    assertEquals(permissionComment, true);
})

Deno.test("userDeletePermission", () => {
    const permissionPost = hasRessourcePermission('user', 'post', 'delete');
    const permissionComment = hasRessourcePermission('user', 'comment', 'delete');
    assertEquals(permissionPost, false);
    assertEquals(permissionComment, false);
})

// Guest
Deno.test("guestReadPermission", () => {
    const permissionsPost = hasRessourcePermission('guest', 'post', 'read');
    const permissionsComment = hasRessourcePermission('guest', 'comment', 'read');
    assertEquals(permissionsPost, true);
    assertEquals(permissionsComment, true);
})

Deno.test("guestWritePermission", () => {
    const permissionsPost = hasRessourcePermission('guest', 'post', 'write');
    const permissionsComment = hasRessourcePermission('guest', 'comment', 'write');
    assertEquals(permissionsPost, false);
    assertEquals(permissionsComment, false);
})

Deno.test("guestDeletePermission", () => {
    const permissionsPost = hasRessourcePermission('guest', 'post', 'delete');
    const permissionsComment = hasRessourcePermission('guest', 'comment', 'delete');
    assertEquals(permissionsPost, false);
    assertEquals(permissionsComment, false);
})