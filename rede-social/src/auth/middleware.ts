import type { NextFunction, Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.redirect('/login');
    return;
  }
  next();
}

export function requireOwnPost(prisma: PrismaClient) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const postId = Number(req.params.id);
    const post = await prisma.post.findUnique({ where: { id: postId } });

    if (!post) {
      res.status(404).render('error', { status: 404, message: 'Post não encontrado' });
      return;
    }
    if (post.authorId !== req.session.userId) {
      res.status(403).render('error', { status: 403, message: 'Você não pode apagar um post de outra pessoa' });
      return;
    }
    next();
  };
}

// NOVO: Middleware para garantir que o usuário só apague/edite o próprio comentário
export function requireOwnComment(prisma: PrismaClient) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const commentId = Number(req.params.id);
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });

    if (!comment) {
      res.status(404).json({ message: 'Comentário não encontrado' });
      return;
    }
    if (comment.authorId !== req.session.userId) {
      res.status(403).json({ message: 'Você não pode alterar um comentário de outra pessoa' });
      return;
    }
    next();
  };
}