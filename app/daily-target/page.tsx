import { AppShell } from "@/components/shared/app-shell";
import { DailyTargetStudio } from "@/components/shared/daily-target-studio";

export const metadata = { title: "Daily Target — InterviewOS" };

export default function DailyTargetPage() {
  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <DailyTargetStudio />
      </div>
    </AppShell>
  );
}
