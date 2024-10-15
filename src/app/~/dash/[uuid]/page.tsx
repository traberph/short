import Image from "next/image";
import prisma from "../../../../../prisma/prisma";
import { redirect } from "next/navigation";
import DeletePageForm from "@/components/forms/deletePageForm";
import { hashToColor } from "@/utils";
import Link from "next/link";
import CreateCustomPageForm from "@/components/forms/createCustomPageForm";
import CreateLinkBlockForm from "@/components/forms/createLinkBlockForm";
import CustomPageDashboard from "@/components/CustomPageDashboard";
import LinkFavicon from "@/components/LinkFavicon";

export default async function DetailedStats({ params }: { params: { uuid: string } }) {

    const page = await prisma.page.findUnique({
        where: { uuid: params.uuid },
        include: {
            RedirectPage: true,
            CustomPage: true,
            Stat: { orderBy: { accessed_at: "desc" } },
            _count: {
                select: { Stat: true }
            }
        }
    });

    // group stats by hash

    const stats = await prisma.stat.groupBy({
        by: ['hash', 'user_agent'],
        where: {
            pageUuid: params.uuid
        },
        _count: {
            uuid: true
        },
        _max: {
            accessed_at: true
        },
        orderBy: {
            _max: {
                accessed_at: "desc"
            }
        }
    });

    if (!page) {
        redirect("/~/dash");
        //return notFound();
    }

    const redirectPage = page.RedirectPage[0];
    const customPage = page.CustomPage[0];

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
                            />}
                    </div>
                    : ""}

                <div>
                    <p>Shortcode: {page.shortcode}</p>
                    {page.RedirectPage.length > 0 ?
                        <p><a className="underline" href={page.RedirectPage[0].dest}>{page.RedirectPage[0].dest}</a></p> : ""}
                </div>
                <div className="ml-auto">
                    <Link href={`/${page.shortcode}`}><button>View</button></Link>
                </div>
                <div className="ml-5">
                    <DeletePageForm uuid={page.uuid} />
                </div>
            </div>
            <br className="mt-2"></br>

            {customPage ? <CustomPageDashboard customPage={customPage} /> : ""}

            <h2 className="mt-5">Stats</h2>
            <p className="mt-5">All visits (not unique): {page._count.Stat}</p>
            <br></br>
            <h2>Visitors</h2>
            {stats.map((stat) => (<div className="my-5" key={stat.hash}>
                <p>{stat.user_agent}</p>
                <p style={{ color: hashToColor(stat.hash) }}>{stat.hash}</p>
                <p>Visits: {"" + stat._count.uuid}</p>
                <p>Last Visit: {stat._max.accessed_at?.toDateString()}</p>
            </div>))}

            <h2>All Visits</h2>

            {page.Stat.map((stat) => (<div className="my-5" key={stat.uuid}>
                <p>{stat.accessed_at.toDateString()}</p>
                <p>{stat.user_agent}</p>
                <p style={{ color: hashToColor(stat.hash) }}>{stat.hash}</p>
            </div>))}
        </div>
    );
}