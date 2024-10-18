import { signOut } from "@/auth"

export default function SignOutButton() {
  return (
    <form
      className="flex"
      action={async () => {
        "use server"
        await signOut()
      }}
    >
      <button className='ml-auto bg-transparent p-1 hover:underline hover:bg-transparent' type="submit">logout</button>
    </form>
  )
} 