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
            page: true
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
        await prisma.linkBlock.create({
            data: {
                customPageUuid: data.data.customPageUuid,
                redirectPageUuid: redirectPage?.uuid,
                title: data.data.title,
                order: data.data.order
            }
        });
    } catch (e: any) {
        return {
            message: "Error creating link block",
            error: e.message
        };
    }

    revalidatePath("/~/dash");
    revalidatePath(`/~/dash/${data.data.customPageUuid}/page`);
    revalidatePath(`/${customPage.page.shortcode}`);

    return {
        message: "Link block created"
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

    await prisma.linkBlock.delete({
        where: {
            uuid: data.data.uuid
        }
    });

    revalidatePath("/~/dash");

    return {
        message: "Link block deleted"
    };
}

