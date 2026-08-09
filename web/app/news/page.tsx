import { redirect } from "next/navigation";

// Renamed to /explore, which says what you came to do rather than what the
// content is. Kept so existing links and bookmarks don't break.
export default function NewsPage() {
  redirect("/explore");
}
