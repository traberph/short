import Image from "next/image";
import Link from "next/link";
import prisma from "../../prisma/prisma";
import { redirect } from "next/navigation";

export default async function Home() {

  const pinnedPage = await prisma.pinnedPage.findFirst({where: {id: 1}, include: {page: true}});

  if (pinnedPage) {
    redirect(pinnedPage.page.shortcode);
  }

  return (
    (<>
      <h1>Home</h1>
      <p>This is a url shortner</p>
      <Link href="~/dash">Dashboard</Link>
    </>
    )
  );
}
