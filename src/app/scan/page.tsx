import { ScanFlow } from "@/components/scan/ScanFlow";

export const metadata = {
  title: "Scan · Figurinhas Copa do Mundo 2026",
};

export default function ScanPage() {
  return (
    <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-7 sm:px-10 lg:px-16">
      <ScanFlow />
    </main>
  );
}
