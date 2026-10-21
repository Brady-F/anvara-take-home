import { Router, type Response, type IRouter } from 'express';
import { requireAuth, roleMiddleware, type AuthRequest } from '../auth.js';
import { prisma, PlacementStatus } from '../db.js';
import { getParam } from '../utils/helpers.js';

const router: IRouter = Router();

router.use(requireAuth);

// GET /api/placements - List placements
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { campaignId, publisherId, status } = req.query;
    if (
      status !== undefined &&
      (typeof status !== 'string' ||
        !Object.values(PlacementStatus).includes(status as PlacementStatus))
    ) {
      res.status(400).json({ error: 'Invalid status filter' });
      return;
    }
    if (
      [campaignId, publisherId].some((id) => id !== undefined && (typeof id !== 'string' || !id))
    ) {
      res.status(400).json({ error: 'Invalid placement ID filter' });
      return;
    }

    const placements = await prisma.placement.findMany({
      where: {
        OR: [
          { campaign: { sponsor: { userId: req.user!.id } } },
          { publisher: { userId: req.user!.id } },
        ],
        ...(campaignId && { campaignId: getParam(campaignId) }),
        ...(publisherId && { publisherId: getParam(publisherId) }),
        ...(status && {
          status: status as PlacementStatus,
        }),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(placements);
  } catch (error) {
    console.error('Error fetching placements:', error);
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
});

// POST /api/placements - Create new placement
router.post('/', roleMiddleware(['SPONSOR']), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user!.publisherId) {
      res
        .status(403)
        .json({ error: 'Placement creation requires ownership of the target publisher' });
      return;
    }

    const {
      campaignId,
      creativeId,
      adSlotId,
      publisherId,
      agreedPrice,
      pricingModel,
      startDate,
      endDate,
    } = req.body;

    if (!campaignId || !creativeId || !adSlotId || !publisherId || !agreedPrice) {
      res.status(400).json({
        error: 'campaignId, creativeId, adSlotId, publisherId, and agreedPrice are required',
      });
      return;
    }

    const [campaign, adSlot, creative] = await Promise.all([
      prisma.campaign.findUnique({ where: { id: campaignId }, select: { sponsorId: true } }),
      prisma.adSlot.findUnique({ where: { id: adSlotId }, select: { publisherId: true } }),
      prisma.creative.findUnique({ where: { id: creativeId }, select: { campaignId: true } }),
    ]);
    if (!campaign || !adSlot || !creative) {
      res.status(404).json({ error: 'Placement resource not found' });
      return;
    }
    // Strict owner-only policy also applies to indirect campaign/ad-slot writes.
    if (
      campaign.sponsorId !== req.user!.sponsorId ||
      adSlot.publisherId !== req.user!.publisherId ||
      publisherId !== req.user!.publisherId ||
      creative.campaignId !== campaignId
    ) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const placement = await prisma.placement.create({
      data: {
        campaignId,
        creativeId,
        adSlotId,
        publisherId,
        agreedPrice,
        pricingModel: pricingModel || 'CPM',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    res.status(201).json(placement);
  } catch (error) {
    console.error('Error creating placement:', error);
    res.status(500).json({ error: 'Failed to create placement' });
  }
});

export default router;
