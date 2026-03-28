"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoomSidebar } from "@/components/contact/room-sidebar";
import { NdaGate } from "@/components/contact/nda-gate";
import { TagFilter } from "@/components/contact/tag-filter";
import { FileList } from "@/components/contact/file-list";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface FileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  tags: Tag[];
}

interface AccessRecord {
  id: string;
  ndaStatus: string;
  approvalStatus: string;
}

interface Room {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface RoomData {
  room: Room;
  access: AccessRecord;
  files?: FileItem[];
  tags?: Tag[];
}

type PageState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "gate"; room: Room; access: AccessRecord }
  | { phase: "browser"; room: Room; access: AccessRecord; files: FileItem[]; tags: Tag[] };

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [state, setState] = useState<PageState>({ phase: "loading" });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/contact/rooms/${roomId}`);

      if (res.status === 401 || res.status === 403) {
        router.replace("/room/login");
        return;
      }

      if (res.status === 404) {
        setState({ phase: "error", message: "This data room was not found or you do not have access." });
        return;
      }

      if (!res.ok) {
        setState({ phase: "error", message: "Something went wrong. Please try again." });
        return;
      }

      const data = (await res.json()) as RoomData;

      if (data.files !== undefined && data.tags !== undefined) {
        setState({
          phase: "browser",
          room: data.room,
          access: data.access,
          files: data.files,
          tags: data.tags,
        });
      } else {
        setState({
          phase: "gate",
          room: data.room,
          access: data.access,
        });
      }
    }

    load().catch(() => {
      setState({ phase: "error", message: "An unexpected error occurred." });
    });
  }, [roomId, router]);

  if (state.phase === "loading") {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <p className="text-amber-600 text-sm">Loading…</p>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="text-amber-800 font-medium">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 flex">
      <RoomSidebar currentRoomId={roomId} />

      <main className="flex-1 px-8 py-8 max-w-4xl">
        {state.phase === "gate" && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-amber-900">{state.room.name}</h1>
              {state.room.description && (
                <p className="text-amber-700 mt-1 text-sm">{state.room.description}</p>
              )}
            </div>
            <NdaGate access={state.access} room={state.room} />
          </>
        )}

        {state.phase === "browser" && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-amber-900">{state.room.name}</h1>
              {state.room.description && (
                <p className="text-amber-700 mt-1 text-sm">{state.room.description}</p>
              )}
            </div>

            {state.tags.length > 0 && (
              <div className="mb-6">
                <TagFilter
                  tags={state.tags}
                  selectedTagIds={selectedTagIds}
                  onChange={setSelectedTagIds}
                />
              </div>
            )}

            <div className="bg-white border border-amber-200 rounded-lg px-6">
              <FileList
                files={state.files}
                roomId={roomId}
                selectedTagIds={selectedTagIds}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
