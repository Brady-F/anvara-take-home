import { Router, type IRouter } from 'express';
import { requireAuth, roleMiddleware } from '../auth.js';
import { prisma } from '../db.js';
import { getParam } from '../utils/helpers.js';

const router: IRouter = Router();
router.use(requireAuth, roleMiddleware(['SPONSOR', 'PUBLISHER']));

// Catalog reads must not expose private placements, pricing floors, or publisher accounts.
const listingSelect = {
  id: true,
  name: true,
  description: true,
  type: true,
  basePrice: true,
  isAvailable: true,
  publisherId: true,
  publisher: { select: { id: true, name: true, website: true } },
} as const;

router.get('/ad-slots', async (_req, res) => {
  try {
    const adSlots = await prisma.adSlot.findMany({
      select: listingSelect,
      orderBy: { basePrice: 'desc' },
    });
    res.json(adSlots);
  } catch (error) {
    console.error('Error fetching marketplace:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace' });
  }
});

router.get('/ad-slots/:id', async (req, res) => {
  try {
    const adSlot = await prisma.adSlot.findUnique({
      where: { id: getParam(req.params.id) },
      select: listingSelect,
    });
    if (!adSlot) {
      res.status(404).json({ error: 'Ad slot not found' });
      return;
    }
    res.json(adSlot);
  } catch (error) {
    console.error('Error fetching marketplace listing:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace listing' });
  }
});

export default router;
