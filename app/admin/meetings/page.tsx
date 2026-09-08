import { redirect } from "next/navigation";

// Meeting minutes moved from admin-only to /meetings (open to all signed-in users). This keeps
// old bookmarks/links working.
export default function AdminMeetingsRedirect() {
  redirect("/meetings");
}
