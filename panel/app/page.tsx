import { redirect } from "next/navigation";
export default function Home() {
  redirect("/inbox"); // CEO default landing (/dashboard) arrives with EX-204
}
