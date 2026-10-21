import { Router, type Response, type IRouter } from 'express';
import { requireAuth, roleMiddleware, type AuthRequest } from '../auth.js';
import { prisma, CampaignStatus } from '../db.js';
import { getParam } from '../utils/helpers.js';

const router: IRouter = Router();

router.use(requireAuth, roleMiddleware(['SPONSOR']));

// Check every ID route, including future PUT/DELETE handlers.
router.use('/:id', async (req: AuthRequest, res, next) => {
  try {
    const resource = await prisma.campaign.findUnique({
      where: { id: getParam(req.params.id) },
      select: { sponsorId: true },
    });
    if (!resource) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    if (resource.sponsorId !== req.user!.sponsorId) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  } catch (error) {
    console.error('Error checking ownership:', error);
    res.status(500).json({ error: 'Failed to verify ownership' });
  }
});

// GET /api/campaigns - List all campaigns
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    if (
      status !== undefined &&
      (typeof status !== 'string' ||
        !Object.values(CampaignStatus).includes(status as CampaignStatus))
    ) {
      res.status(400).json({ error: 'Invalid status filter' });
      return;
    }
    if (req.query.sponsorId !== undefined && req.query.sponsorId !== req.user!.sponsorId) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        ...(status && { status: status as CampaignStatus }),
        sponsorId: req.user!.sponsorId!,
      },
      include: {
        sponsor: { select: { id: true, name: true, logo: true } },
        _count: { select: { creatives: true, placements: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /api/campaigns/:id - Get single campaign with details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const campaign = await prisma.campaign.findUnique({
      where: { id, sponsorId: req.user!.sponsorId! },
      include: {
        sponsor: true,
        creatives: true,
        placements: true,
      },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    res.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// POST /api/campaigns - Create new campaign
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      budget,
      cpmRate,
      cpcRate,
      startDate,
      endDate,
      targetCategories,
      targetRegions,
      sponsorId,
    } = req.body;

    if (!name || !budget || !startDate || !endDate) {
      res.status(400).json({
        error: 'Name, budget, startDate, endDate are required',
      });
      return;
    }

    if (sponsorId !== undefined && sponsorId !== req.user!.sponsorId) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        budget,
        cpmRate,
        cpcRate,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        targetCategories: targetCategories || [],
        targetRegions: targetRegions || [],
        sponsorId: req.user!.sponsorId!,
      },
      include: {
        sponsor: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// TODO: Add PUT /api/campaigns/:id endpoint
// Update campaign details (name, budget, dates, status, etc.)

export default router;
