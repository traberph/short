import prisma from "../../../../../prisma/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import DeletePageForm from "@/components/forms/deletePageForm";
import CustomPageDashboard from "@/components/CustomPageDashboard";
import LinkFavicon from "@/components/LinkFavicon";
import { hashToColor } from "@/utils";
import PinPageToRootForm from "@/components/forms/pinPageToRootForm";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";

interface PageProps {
    params: Promise<{
        uuid: string
    }>
}

export default async function DetailedStats({ params }: PageProps) {

    const { uuid } = await params;

    const page = await prisma.page.findUnique({
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



    // group stats by hash

    const stats = await prisma.stat.groupBy({
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
    });

    if (!page) {
        redirect("/~/dash");
        //return notFound();
    }

    const redirectPage = page.redirectPage[0];
    const customPage = page.customPage[0];

    // get shortcodes if the page is a custom page to use in the link block form
    const linkPages = customPage ? await prisma.redirectPage.findMany({ include: { page: true } }) : undefined
    const shortcodes = linkPages ? linkPages.map((p) => p.page.shortcode) : undefined

    return (
        <div>
            <div className="flex items-center">
                {redirectPage || customPage.image ?
                    <div className=" h-10 w-10  mr-4 ">
                        {redirectPage ? <LinkFavicon url={redirectPage.dest} /> :
                            <Image
                                src={`data:image/png;base64,${customPage.image}`}
                                width={100}
                                height={100}
                                alt=" "
                                className="rounded-full"
                            />}
                    </div>
                    : ""}

                <div>
                    <p>Shortcode: {page.shortcode}</p>
                    {page.redirectPage.length > 0 ?
                        <p><a className="underline" href={page.redirectPage[0].dest}>{page.redirectPage[0].dest}</a></p> : ""}
                </div>
                <div className="ml-5">
                    {page.pinnedPage ? <p className="common-red">Pinned to root</p> : ""}
                </div>
                <div className="ml-auto">
                    <Link href={`/${page.shortcode}`}><button><ArrowTopRightOnSquareIcon className="button-icon" /></button></Link>
                </div>
                <div className="ml-5">
                    <PinPageToRootForm pageUuid={page.uuid} pinned={!!page.pinnedPage} />
                </div>
                <div className="ml-5">
                    <DeletePageForm uuid={page.uuid} />
                </div>
            </div>
            <br className="mt-2"></br>

            {customPage ? <CustomPageDashboard customPage={customPage} /> : ""}

            <h2 className="mt-5">Stats</h2>
            <p className="mt-5">All visits (not unique): {page._count.stat}</p>
            <br></br>
            <h2>Visitors</h2>
            {stats.map((stat) => (<div className="zebra" key={stat.hash}>
                <p>{stat.userAgent}</p>
                <p style={{ color: hashToColor(stat.hash) }}>{stat.hash}</p>
                <p>Visits: {"" + stat._count.uuid}</p>
                <p>Last Visit: {stat._max.accessedAt?.toDateString()}</p>
            </div>))}

            {/* <h2>All Visits</h2>
            {page.stat.map((stat) => (<div className="my-5" key={stat.uuid}>
                <p>{stat.accessedAt.toDateString()}</p>
                <p>{stat.userAgent}</p>
                <p style={{ color: hashToColor(stat.hash) }}>{stat.hash}</p>
            </div>))} */}
        </div>
    );
}