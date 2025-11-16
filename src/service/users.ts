import bcrypt from "bcrypt";

const DEMO_USER = {
    id: "u1",
    email: "medic@example.org",
    passwordHash: bcrypt.hashSync("safePass123", 10)
};

export async function findUserByEmail(email: string) {
    if (email === DEMO_USER.email) return DEMO_USER;
    return null;
    }

export async function verifyPassword(user: typeof DEMO_USER, password: string) {
    return bcrypt.compare(password, user.passwordHash);
}
