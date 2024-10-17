import prisma from "../../../prisma/prisma";
import { headers } from "next/headers";
import { notFound, redirect, RedirectType } from "next/navigation";
import { sha256 } from "js-sha256";
import CustomPageComponent from "@/components/CustomPageComponent";
import { PageProps } from "../../../.next/types/app/layout";

export default async function RedirectToUrl({ params }: PageProps) {

    const { shortcode } = await params;

    const page = await prisma.page.findUnique({
        where: {shortcode: shortcode},
        include: {
            redirectPage: true,
            customPage: true
        }
    });


    if (!page) {
        return notFound()
    }

    // Log the visit
    const requestHeaders = await headers();
    const userAgent = requestHeaders.get('user-agent') || 'unknown';
    const ip = requestHeaders.get('x-forwarded-for') || 'unknown';
    const anonymIp = ip.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, '$1.$2.$3.0');
    const hash = sha256(`${anonymIp}-${userAgent}`);
    await prisma.stat.create({
        data: {
            pageUuid: page.uuid,
            userAgent: userAgent,
            hash: hash
        }
    });

    if (page.redirectPage.length>0) {
        
        // Redirect to the destination
        const redirectPage = page.redirectPage[0];
        redirect(redirectPage.dest);

    }else if (page.customPage.length>0) {

        // Show the custom page
        const customPage = page.customPage[0];
        return <CustomPageComponent customPage={customPage}/>

    } else {
        return notFound()
    }

}