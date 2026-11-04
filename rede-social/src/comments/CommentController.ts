import type { PrismaClient } from '@prisma/client';
import { PostNotFoundError, ValidationError } from '../shared/errors.js';

export class CommentController {
  constructor(private prisma: PrismaClient) {}

  async create(userId: number, postId: number, content: string) {
    if (!content || content.trim() === '') {
      throw new Error('O conteúdo do comentário é obrigatório');
    }

    return this.prisma.comment.create({
      data: {
        content: content,
        authorId: userId,
        postId: postId,
      },
      include: {
        author: true,
        likes: true,
        _count: { select: { likes: true } }
      }
    });
  }

  async listByPost(postId: number) {
    return this.prisma.comment.findMany({
      where: { postId },
      include: {
        author: true,
        likes: true, 
        _count: { select: { likes: true } }
      },
      orderBy: [
        { likes: { _count: 'desc' } },
        { createdAt: 'asc' }
      ]
    });
  }

  async remove(id: number) {
    await this.prisma.comment.delete({ where: { id } });
  }

  async update(id: number, content: string) {
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new ValidationError('"content" é obrigatório');
    }
    return this.prisma.comment.update({
      where: { id },
      data: { content },
    });
  }
}