"use client";
// Loads all stores once when user signs in. 
// Replaces the data-loading logic that was in UserDataProvider.
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useProgressStore } from "./progress-store";
import { useBookmarkStore } from "./bookmark-store";
import { useNotesStore } from "./notes-store";
import { useDailyTargetStore } from "./daily-target-store";

export function StoreBootstrap() {
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    // Parallel load all stores
    Promise.all([
      useProgressStore.getState().load(),
      useBookmarkStore.getState().load(),
      useNotesStore.getState().load(),
      useDailyTargetStore.getState().load(),
    ]).catch(err => console.error("[StoreBootstrap]", err));
  }, [isLoaded, isSignedIn]);

  return null;
}
