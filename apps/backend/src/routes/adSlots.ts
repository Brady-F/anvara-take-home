import { Router, type Response, type IRouter } from 'express';
import { requireAuth, roleMiddleware, type AuthRequest } from '../auth.js';
import { prisma, AdSlotType } from '../db.js';
import { getParam } from '../utils/helpers.js';
import { adSlotInput, objectInput } from '../utils/mutation-input.js';
import { mutationError } from '../utils/mutation-error.js';

const router: IRouter = Router();

router.use(requireAuth, roleMiddleware(['PUBLISHER']));

// Check ownership before reading or mutating an individual ad slot.
router.use('/:id', async (req: AuthRequest, res, next) => {
  try {
    const resource = await prisma.adSlot.findUnique({
      where: { id: getParam(req.params.id) },
      select: { publisherId: true },
    });
    if (!resource) {
      res.status(404).json({ error: 'Ad slot not found' });
      return;
    }
    if (resource.publisherId !== req.user!.publisherId) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  } catch (error) {
    console.error('Error checking ownership:', error);
    res.status(500).json({ error: 'Failed to verify ownership' });
  }
});

// GET /api/ad-slots - List available ad slots
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type, available } = req.query;
    if (
      type !== undefined &&
      (typeof type !== 'string' || !Object.values(AdSlotType).includes(type as AdSlotType))
    ) {
      res.status(400).json({ error: 'Invalid type filter' });
      return;
    }
    if (available !== undefined && available !== 'true' && available !== 'false') {
      res.status(400).json({ error: 'Invalid available filter' });
      return;
    }
    if (req.query.publisherId !== undefined && req.query.publisherId !== req.user!.publisherId) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const adSlots = await prisma.adSlot.findMany({
      where: {
        publisherId: req.user!.publisherId!,
        ...(type && {
          type: type as AdSlotType,
        }),
        ...(available === 'true' && { isAvailable: true }),
      },
      include: {
        publisher: { select: { id: true, name: true, category: true, monthlyViews: true } },
        _count: { select: { placements: true } },
      },
      orderBy: { basePrice: 'desc' },
    });

    res.json(adSlots);
  } catch (error) {
    console.error('Error fetching ad slots:', error);
    res.status(500).json({ error: 'Failed to fetch ad slots' });
  }
});

// GET /api/ad-slots/:id - Get single ad slot with details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const adSlot = await prisma.adSlot.findUnique({
      where: { id, publisherId: req.user!.publisherId! },
      include: {
        publisher: true,
        placements: true,
      },
    });

    if (!adSlot) {
      res.status(404).json({ error: 'Ad slot not found' });
      return;
    }

    res.json(adSlot);
  } catch (error) {
    console.error('Error fetching ad slot:', error);
    res.status(500).json({ error: 'Failed to fetch ad slot' });
  }
});

// POST /api/ad-slots - Create new ad slot
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const body = objectInput(req.body);
    if (body.publisherId !== undefined && body.publisherId !== req.user!.publisherId) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    const data = adSlotInput(body);

    const adSlot = await prisma.adSlot.create({
      data: {
        ...data,
        // Required fields were checked by adSlotInput.
        name: data.name!,
        type: data.type!,
        basePrice: data.basePrice!,
        publisherId: req.user!.publisherId!,
      },
      include: {
        publisher: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(adSlot);
  } catch (error) {
    mutationError(res, error, 'Ad slot', 'create');
  }
});

// Sponsor booking requires cross-owner access, excluded by Challenge 3's private policy.
router.post('/:id/book', (_req, res) => {
  res.status(403).json({ error: 'Booking is unavailable under the owner-only policy' });
});

// POST /api/ad-slots/:id/unbook - Reset ad slot to available (for testing)
router.post('/:id/unbook', async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);

    const updatedSlot = await prisma.adSlot.update({
      where: { id, publisherId: req.user!.publisherId! },
      data: { isAvailable: true },
      include: {
        publisher: { select: { id: true, name: true } },
      },
    });

    res.json({
      success: true,
      message: 'Ad slot is now available again',
      adSlot: updatedSlot,
    });
  } catch (error) {
    console.error('Error unbooking ad slot:', error);
    res.status(500).json({ error: 'Failed to unbook ad slot' });
  }
});

// PUT /api/ad-slots/:id - Update supplied ad slot fields
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const body = objectInput(req.body);
    if (body.publisherId !== undefined && body.publisherId !== req.user!.publisherId) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    const data = adSlotInput(body, true);
    const adSlot = await prisma.adSlot.update({
      where: { id: getParam(req.params.id), publisherId: req.user!.publisherId! },
      data,
    });
    res.json(adSlot);
  } catch (error) {
    mutationError(res, error, 'Ad slot', 'update');
  }
});

// DELETE /api/ad-slots/:id - Schema cascades to placements
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.adSlot.delete({
      where: { id: getParam(req.params.id), publisherId: req.user!.publisherId! },
    });
    res.status(204).end();
  } catch (error) {
    mutationError(res, error, 'Ad slot', 'delete');
  }
});

export default router;
