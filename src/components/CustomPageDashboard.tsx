import { CustomPage } from "@prisma/client"
import prisma from "../../prisma/prisma"
import CreateLinkBlockForm from "./forms/createLinkBlockForm"
import DeleteLinkBlockForm from "./forms/deleteLinkBlockForm"
import { ArrowTopRightOnSquareIcon, ArrowTrendingUpIcon, ArrowUpCircleIcon, ArrowUpRightIcon } from "@heroicons/react/24/solid"

export default async function CustomPageDashboard(params: { customPage: CustomPage }) {

    const customPage = params.customPage
    const redirectPages = await prisma.redirectPage.findMany({ include: { page: true } })
    const shortcodes = redirectPages.map((p) => p.page.shortcode)

    const linkBlocks = await prisma.linkBlock.findMany({
        where: {
            customPageUuid: customPage.uuid
        },
        orderBy: {
            order: "asc"
        },
        include: {
            redirectPage: { include: { page: true } }
        }
    });

    return (<>
        <h2 className="mb-5">Links on Page</h2>
        {linkBlocks.map((block) => (

            <div key={block.uuid} className="flex items-center justify-between zebra max-sm:flex-col max-sm:items-start">
                <div className="flex">
                    <div className="mr-5">order: {block.order}</div>
                    <div className="mr-5">title: <span className="font-bold">{block.title}</span></div>
                    <div>link page: <span className="font-bold">{block.redirectPage.page.shortcode}</span></div>
                </div>
                <div className="flex max-sm:mt-3 max-sm:w-full max-sm:justify-between">
                    <button>
                        <a href={`/${block.redirectPage.page.shortcode}`} className="btn btn-primary"><ArrowTopRightOnSquareIcon className="button-icon" /></a>
                    </button>
                    <button className="ml-3">
                        <a href={`/~/dash/${block.redirectPage.page.uuid}`} className="btn btn-primary"><ArrowTrendingUpIcon className="button-icon" /></a>
                    </button>
                    <DeleteLinkBlockForm linkBlockUuid={block.uuid} />
                </div>
            </div>
        ))}
        <h2 className="mt-10">Add new link page connection</h2>
        <CreateLinkBlockForm customPage={customPage.uuid} shortcodes={shortcodes || []} />

    </>
    )
}