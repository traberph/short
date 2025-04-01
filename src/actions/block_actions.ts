"use server"

import { z } from "zod";
import prisma from "../../prisma/prisma";
import { revalidatePath } from "next/cache";

export async function createLinkBlock(prevState: any, formData: FormData) {

    const schema = z.object({
        customPageUuid: z.string().uuid(),
        redirectPageShortcode: z.string(),
        title: z.string().max(100),
        order: z.coerce.number()
    });

    const data = schema.safeParse({
        customPageUuid: formData.get("customPageUuid"),
        redirectPageShortcode: formData.get("redirectPageShortcode"),
        title: formData.get("title"),
        order: formData.get("order")
    });

    if (!data.success) {
        return {
            message: "Invalid data",
            error: data.error.flatten().fieldErrors,
        };
    }

    const customPage = await prisma.customPage.findUnique({
        where: { uuid: data.data.customPageUuid },
        include: {
            page: true,
            linkBlock: true
        }
    });
    if (!customPage) {
        return {
            message: "Custom page not found",
            error: {}
        };
    }

    const page = await prisma.page.findUnique({
        where: { shortcode: data.data.redirectPageShortcode },
        include: { redirectPage: true }
    });
    const redirectPage = page?.redirectPage[0]
    if (!redirectPage) {
        return {
            message: "Redirect page not found",
            error: {}
        };
    }

    try {
        const currentLinkCount = customPage.linkBlock.length;
        const newOrder = currentLinkCount + 1;

        await prisma.linkBlock.create({
            data: {
                customPageUuid: data.data.customPageUuid,
                redirectPageUuid: redirectPage?.uuid,
                title: data.data.title,
                order: newOrder
            }
        });
    } catch (e: any) {
        return {
            message: "Error adding link to page",
            error: e.message
        };
    }

    revalidatePath("/~/dash");
    revalidatePath(`/~/dash/${data.data.customPageUuid}/page`);
    revalidatePath(`/${customPage.page.shortcode}`);

    return {
        message: "Adding link to page"
    };
}

export async function deleteLinkBlock(prevState: any, formData: FormData) {
    const schema = z.object({
        uuid: z.string().uuid()
    });

    const data = schema.safeParse({
        uuid: formData.get("uuid")
    });

    if (!data.success) {
        return {
            message: "Invalid data",
            error: data.error.flatten().fieldErrors,
        };
    }

    try {
        await prisma.linkBlock.delete({
            where: {
                uuid: data.data.uuid
            }
        });
    } catch (e: any) {
        return {
            message: "Cant delete link from page",
        };
    }

    revalidatePath("/~/dash");

    return {
        message: "Removed link from page"
    };
}

export async function updateLinkBlockOrder(prevState: any, formData: FormData) {
    const schema = z.object({
        linkBlockUuid: z.string().uuid(),
        newOrder: z.coerce.number()
    });

    const data = schema.safeParse({
        linkBlockUuid: formData.get("linkBlockUuid"),
        newOrder: formData.get("newOrder")
    });

    if (!data.success) {
        return {
            message: "Invalid data",
            error: data.error.flatten().fieldErrors,
        };
    }

    try {
        // Get the link block being moved
        const movedLinkBlock = await prisma.linkBlock.findUnique({
            where: { uuid: data.data.linkBlockUuid },
            include: { customPage: true }
        });

        if (!movedLinkBlock) {
            return {
                message: "Link block not found",
                error: {}
            };
        }

        // Get all link blocks for this custom page ordered by their current order
        const allLinkBlocks = await prisma.linkBlock.findMany({
            where: { customPageUuid: movedLinkBlock.customPageUuid },
            orderBy: { order: "asc" }
        });

        // Find the current index of the moved block
        const currentIndex = allLinkBlocks.findIndex(block => block.uuid === data.data.linkBlockUuid);
        
        // Create a new array with the block moved to its new position
        const reorderedBlocks = [...allLinkBlocks];
        const [movedBlock] = reorderedBlocks.splice(currentIndex, 1);
        reorderedBlocks.splice(data.data.newOrder - 1, 0, movedBlock);

        // Update orders based on the new positions
        const updates = reorderedBlocks.map((block, index) => {
            return prisma.linkBlock.update({
                where: { uuid: block.uuid },
                data: { order: index + 1 }
            });
        });

        // Execute all updates in a transaction
        await prisma.$transaction(updates);
    } catch (e: any) {
        return {
            message: "Error updating link order",
            error: e.message
        };
    }

    revalidatePath("/~/dash");
    revalidatePath(`/~/dash/${data.data.linkBlockUuid}/page`);

    return {
        message: "Link order updated"
    };
}

