import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { AuthController } from './auth/AuthController.js';
import { UserController } from './users/UserController.js';
import { PostController } from './posts/PostController.js';
import { requireAuth, requireOwnPost } from './auth/middleware.js';
import { upload } from './uploads/upload.js';
import type { ImageStorage } from './uploads/storage.js';
import { asyncHandler } from './shared/http.js';
import { DuplicateEmailError, InvalidCredentialsError, ValidationError } from './shared/errors.js';

export function createWebRoutes(prisma: PrismaClient, imageStorage: ImageStorage): Router {
  const router = Router();
  const authController = new AuthController(prisma);
  const userController = new UserController(prisma);
  const postController = new PostController(prisma);

  router.get('/register', (req, res) => {
    res.render('register', { error: null });
  });

  router.post(
    '/register',
    upload.single('avatar'),
    asyncHandler(async (req, res) => {
      try {
        let avatarUrl: string | undefined;
        if (req.file) {
          avatarUrl = await imageStorage.upload(req.file);
        }
        const user = await authController.register(req.body, avatarUrl);
        req.session.userId = user.id;
        res.redirect('/');
      } catch (err) {
        if (err instanceof ValidationError) {
          res.status(400).render('register', { error: err.message });
          return;
        }
        if (err instanceof DuplicateEmailError) {
          res.status(409).render('register', { error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.get('/login', (req, res) => {
    res.render('login', { error: null });
  });

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      try {
        const user = await authController.login(req.body);
        req.session.userId = user.id; 
        res.redirect('/');
      } catch (err) {
        if (err instanceof InvalidCredentialsError) {
          res.status(401).render('login', { error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  });

  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req, res) => {
      const currentUserId = req.session.userId!;
      const [currentUser, feed, others] = await Promise.all([
        userController.get(currentUserId),
        userController.feed(currentUserId),
        userController.listOthers(currentUserId),
      ]);
      res.render('feed', { currentUser, feed, others });
    }),
  );

  router.get('/posts/new', requireAuth, (req, res) => {
    res.render('newPost', { error: null });
  });

  router.post(
    '/posts',
    requireAuth, 
    upload.array('images', 5),
    asyncHandler(async (req, res) => {
      try {
        const imageUrls: string[] = [];
        
        
        if (req.files && Array.isArray(req.files)) {
         
          for (const file of req.files) {
            const url = await imageStorage.upload(file);
            imageUrls.push(url);
          }
        }
        
        const tags = typeof req.body.tags === 'string'
          ? req.body.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : undefined;

        await postController.create(req.session.userId!, { content: req.body.content, tags }, imageUrls);
        res.redirect('/');
      } catch (err) {
        if (err instanceof ValidationError) {
          res.status(400).render('newPost', { error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.post(
    '/posts/:id/delete',
    requireAuth,
    requireOwnPost(prisma),
    asyncHandler(async (req, res) => {
      await postController.remove(Number(req.params.id));
      res.redirect('/');
    }),
  );

  router.post(
    '/follow',
    requireAuth,
    asyncHandler(async (req, res) => {
      await userController.follow(req.session.userId!, { targetId: Number(req.body.targetId) });
      res.redirect('/');
    }),
  );

  router.get(
    '/posts/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const postId = Number(req.params.id);
      const currentUserId = req.session.userId!;

      const [currentUser, post] = await Promise.all([
        userController.get(currentUserId),
        prisma.post.findUnique({
          where: { id: postId },
          include: {
            author: true,
            tags: true,
            images: { orderBy: { order: 'asc' } },
            likes: true, 
            _count: { select: { likes: true } },
            comments: {
              include: { 
                author: true, 
                likes: true,
                _count: { select: { likes: true } }
              },
              orderBy: [
                { likes: { _count: 'desc' } },
                { createdAt: 'asc' }
              ]
            }
          }
        })
      ]);

      if (!post) {
        res.status(404).render('error', { status: 404, message: 'Post não encontrado' });
        return;
      }

      res.render('post', { currentUser, post });
    }),
  );

  return router;
}