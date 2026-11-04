import type { PrismaClient } from '@prisma/client';
import { PostNotFoundError } from '../shared/errors.js';

export class LikeController {
  constructor(private readonly prisma: PrismaClient) {}

  // Alterna a curtida de um post (Toggle: se já curtiu, descurte; se não, curte)
  async togglePostLike(userId: number, postId: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new PostNotFoundError(postId);

    const existingLike = await this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existingLike) {
      await this.prisma.like.delete({ where: { userId_postId: { userId, postId } } });
      return { liked: false };
    } else {
      await this.prisma.like.create({ data: { userId, postId } });
      return { liked: true };
    }
  }

  // Alterna a curtida de um comentário
  async toggleCommentLike(userId: number, commentId: number) {
    const existingLike = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existingLike) {
      await this.prisma.commentLike.delete({ where: { userId_commentId: { userId, commentId } } });
      return { liked: false };
    } else {
      await this.prisma.commentLike.create({ data: { userId, commentId } });
      return { liked: true };
    }
  }
}