import path from 'node:path';
import express, { type Express } from 'express';
import type { PrismaClient } from '@prisma/client';
import { UserController } from './users/UserController.js';
import { PostController } from './posts/PostController.js';
import { LikeController } from './likes/LikeController.js';
import { CommentController } from './comments/CommentController.js';
import { createRoutes } from './routes.js';
import { createWebRoutes } from './webRoutes.js';
import { requireAuth } from './auth/middleware.js';
import { createSessionMiddleware } from './auth/session.js';
import { createImageStorage } from './uploads/createImageStorage.js';
import { UPLOAD_DIR } from './uploads/localStorage.js';
import type { ImageStorage } from './uploads/storage.js';
import { errorHandler } from './shared/errorHandler.js';
import { asyncHandler } from './shared/http.js';

export function createServer(prisma: PrismaClient, imageStorage: ImageStorage = createImageStorage()): Express {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(import.meta.dirname, 'views'));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(createSessionMiddleware());

  app.use('/uploads', express.static(UPLOAD_DIR));

  const userController = new UserController(prisma);
  const postController = new PostController(prisma);
  const likeController = new LikeController(prisma);
  const commentController = new CommentController(prisma);

  app.use(createWebRoutes(prisma, imageStorage));
  app.use('/api', createRoutes(userController, postController));


  app.get('/api/feed', requireAuth, asyncHandler(async (req, res) => {
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const posts = await userController.feed(req.session.userId!, cursor, limit);
    res.json(posts);
  }));

  app.post('/api/posts/:id/like', requireAuth, asyncHandler(async (req, res) => {
    const result = await likeController.togglePostLike(req.session.userId!, Number(req.params.id));
    res.json(result);
  }));

  app.post('/api/comments/:id/like', requireAuth, asyncHandler(async (req, res) => {
    const result = await likeController.toggleCommentLike(req.session.userId!, Number(req.params.id));
    res.json(result);
  }));

  app.post('/api/posts/:id/comments', requireAuth, asyncHandler(async (req, res) => {
    const comment = await commentController.create(req.session.userId!, Number(req.params.id), req.body.content);
    res.json(comment);
  }));

  app.get('/api/posts/:id/comments', asyncHandler(async (req, res) => {
    const comments = await commentController.listByPost(Number(req.params.id));
    res.json(comments);
  }));

  app.use(errorHandler);

  return app;
}