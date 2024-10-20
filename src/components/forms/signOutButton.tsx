import { signOut } from "@/auth"

export default function SignOutButton() {
  return (
    <form
      className="flex m-0 p-0"
      action={async () => {
        "use server"
        await signOut()
      }}
    >
      <button className='max-sm:ml-0 ml-auto bg-transparent p-0 hover:underline hover:bg-transparent' type="submit">logout</button>
    </form>
  )
} 