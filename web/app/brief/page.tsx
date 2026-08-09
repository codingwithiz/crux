import { redirect } from "next/navigation";

// The Daily Brief is now the "Curated for you" section of /news (and the single
// pick on /today). Keep this path working for old links/bookmarks.
export default function BriefPage() {
  redirect("/explore");
}
