'use server'

import prisma from "../../prisma/prisma";

export async function getDailyStats(pageUuid: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyStats = await prisma.stat.groupBy({
        by: ['accessedAt'],
        where: {
            pageUuid: pageUuid,
            accessedAt: {
                gte: sevenDaysAgo
            }
        },
        _count: {
            uuid: true
        },
        orderBy: {
            accessedAt: 'asc'
        }
    });

    // Group by date only (ignoring time)
    const groupedByDate = dailyStats.reduce((acc, stat) => {
        const date = stat.accessedAt.toISOString().split('T')[0];
        if (!acc[date]) {
            acc[date] = {
                date: stat.accessedAt.toISOString(),
                clicks: 0
            };
        }
        acc[date].clicks += stat._count.uuid;
        return acc;
    }, {} as Record<string, { date: string; clicks: number }>);

    return Object.values(groupedByDate);
}

export async function getPageData(uuid: string) {
    return await prisma.page.findUnique({
        where: { uuid: uuid },
        include: {
            pinnedPage: true,
            redirectPage: true,
            customPage: true,
            stat: { orderBy: { accessedAt: "desc" } },
            _count: {
                select: { stat: true }
            }
        }
    });
}

export async function getPageStats(uuid: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [stats, clicksToday, lastVisit] = await Promise.all([
        prisma.stat.groupBy({
            by: ['hash', 'userAgent'],
            where: {
                pageUuid: uuid
            },
            _count: {
                uuid: true
            },
            _max: {
                accessedAt: true
            },
            orderBy: {
                _max: {
                    accessedAt: "desc"
                }
            }
        }),
        prisma.stat.count({
            where: {
                pageUuid: uuid,
                accessedAt: {
                    gte: today
                }
            }
        }),
        prisma.stat.findFirst({
            where: {
                pageUuid: uuid
            },
            orderBy: {
                accessedAt: 'desc'
            }
        })
    ]);

    return {
        stats,
        clicksToday,
        lastVisit: lastVisit?.accessedAt
    };
}

export async function getCustomPageData(customPageUuid: string) {
    const [linkPages, linkBlocks] = await Promise.all([
        prisma.redirectPage.findMany({ 
            include: { page: true } 
        }),
        prisma.linkBlock.findMany({
            where: {
                customPageUuid: customPageUuid
            },
            orderBy: {
                order: "asc"
            },
            include: {
                redirectPage: { include: { page: true } }
            }
        })
    ]);

    const shortcodes = linkPages.map((p) => p.page.shortcode);

    return {
        linkPages,
        linkBlocks,
        shortcodes
    };
} 