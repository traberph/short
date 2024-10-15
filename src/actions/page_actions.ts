"use server"

import { z } from "zod";
import prisma from "../../prisma/prisma";
import { revalidatePath } from "next/cache";

export async function createCustomPage(prevState: any, fromData: FormData) {
    const schema = z.object({
        shortcode: z.string().min(1).max(100),
        title: z.string().min(1).max(100),
        image: z.instanceof(File)
            .refine((file) => ["image/png", "image/jpeg"].includes(file.type)
                , { message: "Only PNG and JPEG images are allowed" })
            .refine((file) => file.size < 1024 * 1024 * 10, { message: "Image must be less than 10MB" })

    });
    const data = schema.safeParse({
        shortcode: fromData.get("shortcode"),
        title: fromData.get("title"),
        image: fromData.get("image")
    });
    if (!data.success) {
        return {
            message: "Invalid data",
            error: data.error.flatten().fieldErrors,
        };
    }

    const imageBase64 = await data.data.image.arrayBuffer().then((buffer) => {
        return Buffer.from(buffer).toString("base64");
    });


    try {
        const page = await prisma.page.create({
            data: {
                shortcode: data.data.shortcode
            }
        });
        const customPage = await prisma.customPage.create({
            data: {
                pageUuid: page.uuid,
                title: data.data.title,
                image: imageBase64
            }
        });
    } catch (e) {
        return {
            message: "Shortcode already exists",
            error: {
                shortcode: "Shortcode already exists"
            }
        };
    }

    revalidatePath("/dash");
    return {
        message: "Page created",
    };
}


export async function createRedirectPage(prevState: any, fromData: FormData) {

    const schema = z.object({
        dest: z.string().url().max(1000),
        shortcode: z.string().min(1).max(100)
    });

    const data = schema.safeParse({
        dest: fromData.get("dest"),
        shortcode: fromData.get("shortcode")
    });

    if (!data.success) {
        return {
            message: "Invalid data",
            error: data.error.flatten().fieldErrors,
        };
    }

    const page = await prisma.page.create({
        data: {
            shortcode: data.data.shortcode
        }
    });

    const redirectPage = await prisma.redirectPage.create({
        data: {
            pageUuid: page.uuid,
            dest: data.data.dest
        }
    });

    revalidatePath("/dash");

    return {
        message: "URL created",
    };

}

export async function deletePage(prevState: any, fromData: FormData) {
    const schema = z.object({
        uuid: z.string().uuid()
    });

    const data = schema.safeParse({
        uuid: fromData.get("uuid")
    });

    if (!data.success) {
        return {
            message: "Invalid data",
            error: data.error.flatten().fieldErrors,
        };
    }

    await prisma.redirectPage.deleteMany({
        where: {
            pageUuid: data.data.uuid
        }
    });

    await prisma.customPage.deleteMany({
        where: {
            pageUuid: data.data.uuid
        }
    });

    await prisma.stat.deleteMany({
        where: {
            pageUuid: data.data.uuid
        }
    });

    await prisma.page.delete({
        where: {
            uuid: data.data.uuid
        }
    });

    revalidatePath("/dash");

    return {
        message: "Page deleted",
    };

}