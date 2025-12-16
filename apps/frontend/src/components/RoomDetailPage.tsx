import { Map } from "@/components/Map";

export function RoomDetailPage() {
  return (
    <div className="flex justify-center items-end w-screen h-screen overflow-hidden">
      <Map participants={[]} />
    </div>
  );
}
