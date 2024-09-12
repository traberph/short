"use server"

import { z } from "zod";
import prisma from "../../prisma/prisma";
import { revalidatePath } from "next/cache";

export async function createUrl(prevState: any, fromData: FormData){

    const schema = z.object({
        original_url: z.string().url().max(1000),
        short_code: z.string().min(1).max(100)
    });

    const data = schema.safeParse({
        original_url: fromData.get("original_url"),
        short_code: fromData.get("short_code")
    });

    console.log("Data received in backend:");
    console.log(data);

    if (!data.success){
        return {
            message: "Invalid data",
            error: data.error.flatten().fieldErrors
        };
    }

    await prisma.uRL.create({
        data: {
            original_url: data.data.original_url,
            short_code: data.data.short_code
        }
    });

    revalidatePath("/dash");

    return {
        message: "URL created",
    };

}

export async function deleteUrl(prevState: any, fromData: FormData){
    const schema = z.object({
        url_id: z.coerce.number()
        
    });

    const data = schema.safeParse({
        url_id: fromData.get("url_id")
    });

    console.log("Data received in backend:");
    console.log(data);
    console.log(data.error?.flatten().fieldErrors);

    if (!data.success){
        return {
            message: "Invalid data",
            error: data.error.flatten().fieldErrors
        };
    }

    await prisma.uRL.delete({
        where: {
            url_id: data.data.url_id
        }
    });

    revalidatePath("/dash");

    return {
        message: "URL deleted",
    };

}