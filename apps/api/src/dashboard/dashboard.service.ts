import { Injectable } from '@nestjs/common';
import { LeadStatus, OpportunityStage, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics() {
    const now = new Date();

    const leadTotal = await this.prisma.lead.count();
    const leadByStatus = await this.prisma.lead.groupBy({
      by: ['status'],
      _count: { _all: true },
      orderBy: { status: 'asc' },
    });

    const oppTotal = await this.prisma.opportunity.count();
    const pipelineByStage = await this.prisma.opportunity.groupBy({
      by: ['stage'],
      where: {
        stage: {
          notIn: [OpportunityStage.CLOSED_LOST, OpportunityStage.CLOSED_WON],
        },
      },
      _count: { _all: true },
      _sum: { estimatedValue: true },
      orderBy: { stage: 'asc' },
    });

    const overdueRows = await this.prisma.task.groupBy({
      by: ['ownerId'],
      where: {
        dueDate: { lt: now },
        status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELED] },
      },
      _count: { _all: true },
      orderBy: { ownerId: 'asc' },
    });

    const leadConverted =
      leadByStatus.find((r) => r.status === LeadStatus.CONVERTED)?._count
        ?._all ?? 0;

    const leadConversionRate = leadTotal === 0 ? 0 : leadConverted / leadTotal;

    const overdueOwnerIds = overdueRows.map((r) => r.ownerId);
    const overdueOwners =
      overdueOwnerIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: overdueOwnerIds } },
            select: { id: true, fullName: true, email: true },
          });

    const ownerById = new Map(overdueOwners.map((o) => [o.id, o]));

    const overdueByOwner = overdueRows.map((r) => {
      const owner = ownerById.get(r.ownerId);
      return {
        ownerId: r.ownerId,
        ownerFullName: owner?.fullName ?? null,
        ownerEmail: owner?.email ?? null,
        overdueCount: r._count?._all ?? 0,
      };
    });

    const overdueTotal = overdueByOwner.reduce(
      (sum, r) => sum + r.overdueCount,
      0,
    );

    return {
      generatedAt: now,
      leads: {
        total: leadTotal,
        byStatus: leadByStatus.map((r) => ({
          status: r.status,
          count: r._count?._all ?? 0,
        })),
        converted: leadConverted,
        conversionRate: leadConversionRate,
      },
      opportunities: {
        total: oppTotal,
        pipelineByStage: pipelineByStage.map((r) => ({
          stage: r.stage,
          count: r._count?._all ?? 0,
          estimatedValueSum: r._sum?.estimatedValue ?? 0,
        })),
      },
      tasks: {
        overdueTotal,
        overdueByOwner,
      },
    };
  }
}
