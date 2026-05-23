"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    const school = await prisma.school.upsert({
        where: { code: 'KT01' },
        update: {},
        create: {
            code: 'KT01',
            name: 'KimThanh Kindergarten — Main Campus',
            address: '123 Sample Street, District 1, Ho Chi Minh City',
            phone: '+84 28 0000 0000',
            email: 'hello@kimthanh.school',
        },
    });
    const passwordHash = await bcrypt.hash('Password123', 10);
    await prisma.user.upsert({
        where: { email: 'admin@kimthanh.school' },
        update: {},
        create: {
            email: 'admin@kimthanh.school',
            passwordHash,
            fullName: 'System Administrator',
            role: client_1.UserRole.SUPER_ADMIN,
            schoolId: school.id,
        },
    });
    await prisma.user.upsert({
        where: { email: 'teacher@kimthanh.school' },
        update: {},
        create: {
            email: 'teacher@kimthanh.school',
            passwordHash,
            fullName: 'Demo Teacher',
            role: client_1.UserRole.TEACHER,
            schoolId: school.id,
        },
    });
    await prisma.user.upsert({
        where: { email: 'parent@kimthanh.school' },
        update: {},
        create: {
            email: 'parent@kimthanh.school',
            passwordHash,
            fullName: 'Demo Parent',
            role: client_1.UserRole.PARENT,
            schoolId: school.id,
        },
    });
    console.warn('Seed completed for school', school.code);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map