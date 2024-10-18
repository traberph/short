import Image from "next/image";
import Link from "next/link";
import prisma from "../../prisma/prisma";
import { redirect } from "next/navigation";

export default async function Home() {

  const pinnedPage = await prisma.pinnedPage.findFirst({ where: { id: 1 }, include: { page: true } });

  if (pinnedPage) {
    redirect(pinnedPage.page.shortcode);
  }

  return (
    (<div className="vcenter">
      <h1>Welcome</h1>
      <p>This is a url shortner</p>
      <p>Currently there is no default root page defined</p>
      <Link href="/~/dash" className="mt-5 hover:underline">Set pin a page in the dashboard</Link>
      <Link href="https:github.com/traberph/short" className="hover:underline">Or check out the project page</Link>
    </div>
    )
  );
}
