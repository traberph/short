import { CustomPage } from "@prisma/client";
import Image from "next/image";
import prisma from "../../prisma/prisma";
import LinkFavicon from "./LinkFavicon";

export default async function CustomPageComponent(params: { customPage: CustomPage }) {
  const customPage = params.customPage;

  const linkBlocks = await prisma.linkBlock.findMany({
    where: {
      customPageUuid: customPage.uuid
    },
    orderBy: {
      order: "asc"
    },
    include: {
      redirect_page: { include: { page: true } }
    }
  });

  return (
    <div className="flex flex-col items-center justify-center">
      <Image
        src={`data:image/png;base64,${customPage.image}`}
        alt=" "
        width={100}
        height={100}
        className="rounded-full"
      />

      <h1 className="mt-5 text-center">{customPage.title}</h1>
      <div className="w-full max-w-96">

        {linkBlocks.map((block) => (
          <button key={block.uuid} className="bg-slate-600 hover:bg-slate-500 w-full m-2">
            <a href={`/${block.redirect_page.page.shortcode}`}>
              <div className="relative flex items-center">
                <div className="flex-shrink-0"><LinkFavicon url={block.redirect_page.dest} /></div>
                <div className="absolute left-1/2 transform -translate-x-1/2 text-center font-bold">{block.title}</div>
              </div>
            </a>
          </button>
        ))}
      </div>
    </div>
  );
}