import bcrypt from 'bcryptjs';
import prisma from '../../config/prisma';
import { AppError } from '../../errors/AppError';
import { CreateUserInput, UpdateUserInput } from './users.schema';
import { Role } from '@prisma/client';

export class UsersService {
  static async listUsers() {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            stockLogs: true,
            challansCreated: true,
          },
        },
      },
    });

    return users;
  }

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            stockLogs: true,
            challansCreated: true,
          },
        },
      },
    });

    if (!user) {
      throw AppError.notFound(`User with ID "${id}" not found`);
    }

    return user;
  }

  static async createUser(data: CreateUserInput) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw AppError.conflict(`A user with email "${data.email}" already exists`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role as Role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            stockLogs: true,
            challansCreated: true,
          },
        },
      },
    });

    return user;
  }

  static async updateUser(id: string, data: UpdateUserInput, currentUserId: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw AppError.notFound(`User with ID "${id}" not found`);
    }

    // Safety check: Prevent demoting the only admin
    if (user.role === Role.ADMIN && data.role && data.role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        throw AppError.badRequest('Cannot demote the only administrator in the system');
      }
    }

    // Check email conflict if changing email
    if (data.email && data.email.toLowerCase() !== user.email.toLowerCase()) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (emailConflict) {
        throw AppError.conflict(`A user with email "${data.email}" already exists`);
      }
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email.toLowerCase();
    if (data.role) updateData.role = data.role as Role;
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(data.password, salt);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            stockLogs: true,
            challansCreated: true,
          },
        },
      },
    });

    return updated;
  }

  static async deleteUser(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw AppError.badRequest('You cannot delete your own administrator account');
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stockLogs: true,
            challansCreated: true,
          },
        },
      },
    });

    if (!user) {
      throw AppError.notFound(`User with ID "${id}" not found`);
    }

    if (user.role === Role.ADMIN) {
      const adminCount = await prisma.user.count({
        where: { role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        throw AppError.badRequest('Cannot delete the sole administrator in the system');
      }
    }

    // Enforce audit integrity safeguard
    if (user._count.stockLogs > 0 || user._count.challansCreated > 0) {
      throw AppError.badRequest(
        `Cannot delete user "${user.name}" because they have authored ${user._count.challansCreated} challan(s) and ${user._count.stockLogs} stock audit log(s). Reassign their role instead to retain audit trail integrity.`
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return { message: `User "${user.name}" deleted successfully` };
  }
}
