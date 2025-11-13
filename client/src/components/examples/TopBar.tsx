import { TopBar } from '../top-bar';
import { SidebarProvider } from "@/components/ui/sidebar";

export default function TopBarExample() {
  return (
    <SidebarProvider>
      <div className="w-full">
        <TopBar />
      </div>
    </SidebarProvider>
  );
}