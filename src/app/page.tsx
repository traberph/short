import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    (<>
      <h1>Home</h1>
      <p>This is a url shortner</p>
      <Link href="~/dash">Dashboard</Link>
    </>
    )
  );
}
