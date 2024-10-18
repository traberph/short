import { auth } from "@/auth";
import SignInButton from "@/components/forms/signInButton";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminRoot() {

    const session = await auth();
    const awSession =  await session;
    const user = awSession?.user;

    if (user) {
        redirect("/~/dash/");
    }

    return (<div className="vcenter">

        <Link href="https://github.com/traberph/short"><h1>traberph/short</h1></Link>
        <SignInButton />
        <Link href="/" className="mt-3 hover:underline">or back to root</Link>
    </div>
    )

}