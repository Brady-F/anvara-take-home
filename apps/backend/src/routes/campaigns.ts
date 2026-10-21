import { Router, type Response, type IRouter } from 'express';
import { requireAuth, roleMiddleware, type AuthRequest } from '../auth.js';
import { prisma, CampaignStatus } from '../db.js';
import { getParam } from '../utils/helpers.js';
import { campaignInput, checkDateRange, objectInput } from '../utils/mutation-input.js';
import { mutationError } from '../utils/mutation-error.js';
import { Prisma } from '../generated/prisma/client.js';

const router: IRouter = Router();

router.use(requireAuth, roleMiddleware(['SPONSOR']));

// Check ownership before reading or mutating an individual campaign.
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
    const body = objectInput(req.body);
    if (body.sponsorId !== undefined && body.sponsorId !== req.user!.sponsorId) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    const data = campaignInput(body);

    const campaign = await prisma.campaign.create({
      data: {
        ...data,
        // Required fields were checked by campaignInput.
        name: data.name!,
        budget: data.budget!,
        startDate: data.startDate!,
        endDate: data.endDate!,
        targetCategories: data.targetCategories ?? [],
        targetRegions: data.targetRegions ?? [],
        sponsorId: req.user!.sponsorId!,
      },
      include: {
        sponsor: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(campaign);
  } catch (error) {
    mutationError(res, error, 'Campaign', 'create');
  }
});

// PUT /api/campaigns/:id - Update supplied campaign fields
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const body = objectInput(req.body);
    if (body.sponsorId !== undefined && body.sponsorId !== req.user!.sponsorId) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    const data = campaignInput(body, true);
    const where = { id: getParam(req.params.id), sponsorId: req.user!.sponsorId! };
    // Keep validation and the write on the same snapshot when edits overlap.
    const campaign = await prisma.$transaction(
      async (tx) => {
        const current = await tx.campaign.findUnique({
          where,
          select: { startDate: true, endDate: true },
        });
        if (!current) return null;
        checkDateRange(data.startDate ?? current.startDate, data.endDate ?? current.endDate);
        return tx.campaign.update({ where, data });
      },
      { isolationLevel: 'Serializable' }
    );
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(campaign);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      res.status(409).json({ error: 'Campaign changed during this request; retry the update' });
      return;
    }
    mutationError(res, error, 'Campaign', 'update');
  }
});

// DELETE /api/campaigns/:id - Schema cascades to creatives and placements
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.campaign.delete({
      where: { id: getParam(req.params.id), sponsorId: req.user!.sponsorId! },
    });
    res.status(204).end();
  } catch (error) {
    mutationError(res, error, 'Campaign', 'delete');
  }
});

export default router;
