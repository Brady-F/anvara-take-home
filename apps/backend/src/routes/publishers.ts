import { Router, type Response, type IRouter } from 'express';
import { requireAuth, roleMiddleware, type AuthRequest } from '../auth.js';
import { prisma } from '../db.js';
import { getParam } from '../utils/helpers.js';

const router: IRouter = Router();

router.use(requireAuth, roleMiddleware(['PUBLISHER']));

// GET /api/publishers - List all publishers
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const publishers = await prisma.publisher.findMany({
      where: { userId: req.user!.id },
      include: {
        _count: {
          select: { adSlots: true, placements: true },
        },
      },
      orderBy: { monthlyViews: 'desc' },
    });
    res.json(publishers);
  } catch (error) {
    console.error('Error fetching publishers:', error);
    res.status(500).json({ error: 'Failed to fetch publishers' });
  }
});

// GET /api/publishers/:id - Get single publisher with ad slots
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const publisher = await prisma.publisher.findUnique({
      where: { id },
      include: {
        adSlots: true,
        placements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!publisher) {
      res.status(404).json({ error: 'Publisher not found' });
      return;
    }

    if (publisher.userId !== req.user!.id) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    res.json(publisher);
  } catch (error) {
    console.error('Error fetching publisher:', error);
    res.status(500).json({ error: 'Failed to fetch publisher' });
  }
});

export default router;
