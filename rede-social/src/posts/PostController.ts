import type { PrismaClient } from '@prisma/client';
import { PostNotFoundError, TagNotFoundError, UserNotFoundError, ValidationError } from '../shared/errors.js';

export class PostController {
  constructor(private readonly prisma: PrismaClient) {}

  // Atualizado para receber um array de imageUrls em vez de uma única string
  async create(authorId: number, body: unknown, imageUrls: string[] = []) {
    const { content, tags } = (body ?? {}) as { content?: unknown; tags?: unknown };

    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new ValidationError('"content" é obrigatório');
    }
    if (tags !== undefined && (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string'))) {
      throw new ValidationError('"tags", quando informado, deve ser uma lista de strings');
    }

    const author = await this.prisma.user.findUnique({ where: { id: authorId } });
    if (!author) {
      throw new UserNotFoundError(authorId);
    }

    const tagNames = (tags as string[] | undefined) ?? [];

    return this.prisma.post.create({
      data: {
        content,
        author: { connect: { id: authorId } },
        tags: {
          connectOrCreate: tagNames.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
        // Nova relação 1:N com PostImage (cria os registros na tabela filha automaticamente)
        images: {
          create: imageUrls.map((url, index) => ({
            url,
            order: index, // Mantém a ordem em que as imagens foram enviadas para o carrossel
          })),
        },
      },
      include: { 
        author: true, 
        tags: true, 
        images: { orderBy: { order: 'asc' } } 
      },
    });
  }

  async get(id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      // Incluindo as imagens e ordenando-as
      include: { 
        author: true, 
        tags: true, 
        images: { orderBy: { order: 'asc' } }
      },
    });
    if (!post) {
      throw new PostNotFoundError(id);
    }
    return post;
  }

  async listByTag(name: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { name },
      include: { 
        posts: { 
          include: { 
            author: true,
            images: { orderBy: { order: 'asc' } }
          }, 
          orderBy: { createdAt: 'desc' } 
        } 
      },
    });
    if (!tag) {
      throw new TagNotFoundError(name);
    }
    return tag.posts;
  }

  async remove(id: number): Promise<void> {
    await this.prisma.post.delete({ where: { id } });
  }
}