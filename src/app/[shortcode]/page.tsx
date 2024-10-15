import prisma from "../../../prisma/prisma";
import { headers } from "next/headers";
import { notFound, redirect, RedirectType } from "next/navigation";
import { sha256 } from "js-sha256";
import CustomPageComponent from "@/components/CustomPageComponent";

export default async function RedirectToUrl({ params }: { params: { shortcode: string } }) {


    const page = await prisma.page.findUnique({
        where: {shortcode: params.shortcode},
        include: {
            RedirectPage: true,
            CustomPage: true
        }
    });


    if (!page) {
        return notFound()
    }

    // Logg the visit
    const requestHeaders = headers();
    const userAgent = requestHeaders.get('user-agent') || 'unknown';
    const ip = requestHeaders.get('x-forwarded-for') || 'unknown';
    const anonymIp = ip.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, '$1.$2.$3.0');
    const hash = sha256(`${anonymIp}-${userAgent}`);
    await prisma.stat.create({
        data: {
            pageUuid: page.uuid,
            user_agent: userAgent,
            hash: hash
        }
    });

    if (page.RedirectPage.length>0) {
        
        // Redirect to the destination
        const redirectPage = page.RedirectPage[0];
        redirect(redirectPage.dest);

    }else if (page.CustomPage.length>0) {

        // Show the custom page
        const customPage = page.CustomPage[0];
        return <CustomPageComponent customPage={customPage}/>

    } else {
        return notFound()
    }

}