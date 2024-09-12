import prisma from "../../../prisma/prisma";
import { headers } from "next/headers";
import { notFound, redirect, RedirectType } from "next/navigation";

export default async function RedirectToUrl({ params }: { params: { url_shortcode: string } }) {

    const url = await prisma.uRL.findUnique({
        where: {
            short_code: params.url_shortcode
        }
    });

    if (!url) {
        return notFound()
    }

    const requestHeaders = headers();
    const userAgent = requestHeaders.get('user-agent') || 'unknown';
    const ip = requestHeaders.get('x-forwarded-for') || 'unknown';

    await prisma.stat.create({
        data: {
            url_id: url.url_id,
            user_agent: userAgent,
            hashed_ip: ip
        }
    });

    redirect(url.original_url);

}