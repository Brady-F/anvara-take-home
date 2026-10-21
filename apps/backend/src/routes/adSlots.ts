import { Router, type Response, type IRouter } from 'express';
import { requireAuth, roleMiddleware, type AuthRequest } from '../auth.js';
import { prisma, AdSlotType } from '../db.js';
import { getParam } from '../utils/helpers.js';

const router: IRouter = Router();

router.use(requireAuth, roleMiddleware(['PUBLISHER']));

// Check every ID route, including future PUT/DELETE handlers and booking helpers.
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
// BUG: No input validation for basePrice (could be negative or zero)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, type, basePrice, publisherId } = req.body;

    if (!name || !type || !basePrice) {
      res.status(400).json({
        error: 'Name, type, basePrice are required',
      });
      return;
    }

    // TODO: Validate that basePrice is positive
    // TODO: Validate that 'type' is valid enum value

    if (publisherId !== undefined && publisherId !== req.user!.publisherId) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const adSlot = await prisma.adSlot.create({
      data: {
        name,
        description,
        type,
        basePrice,
        publisherId: req.user!.publisherId!,
      },
      include: {
        publisher: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(adSlot);
  } catch (error) {
    console.error('Error creating ad slot:', error);
    res.status(500).json({ error: 'Failed to create ad slot' });
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

// TODO: Add PUT /api/ad-slots/:id endpoint
// TODO: Add DELETE /api/ad-slots/:id endpoint

export default router;
