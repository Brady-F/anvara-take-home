import { Router, type Response, type IRouter } from 'express';
import { requireAuth, type AuthRequest } from '../auth.js';
import { prisma } from '../db.js';

const router: IRouter = Router();

// GET /api/dashboard/stats - Get overall platform stats
router.get('/stats', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const placementScope = {
      OR: [
        { campaign: { sponsor: { userId: req.user!.id } } },
        { publisher: { userId: req.user!.id } },
      ],
    };
    const [sponsorCount, publisherCount, activeCampaigns, totalPlacements, placementMetrics] =
      await Promise.all([
        prisma.sponsor.count({ where: { isActive: true, userId: req.user!.id } }),
        prisma.publisher.count({ where: { isActive: true, userId: req.user!.id } }),
        prisma.campaign.count({ where: { status: 'ACTIVE', sponsor: { userId: req.user!.id } } }),
        prisma.placement.count({ where: placementScope }),
        prisma.placement.aggregate({
          where: placementScope,
          _sum: {
            impressions: true,
            clicks: true,
            conversions: true,
          },
        }),
      ]);

    res.json({
      sponsors: sponsorCount,
      publishers: publisherCount,
      activeCampaigns,
      totalPlacements,
      metrics: {
        totalImpressions: placementMetrics._sum.impressions || 0,
        totalClicks: placementMetrics._sum.clicks || 0,
        totalConversions: placementMetrics._sum.conversions || 0,
        avgCtr: placementMetrics._sum.impressions
          ? (
              ((placementMetrics._sum.clicks || 0) / placementMetrics._sum.impressions) *
              100
            ).toFixed(2)
          : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
