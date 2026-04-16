"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TOPIC_TAXONOMY } from "@/server/taxonomy";
import {
  TOPIC_DISPLAY_NAMES,
  MIN_TOPIC_SELECTIONS,
  TIMEZONES,
} from "@/lib/constants";

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [timezone, setTimezone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const topics = TOPIC_TAXONOMY.map((t) => ({
    key: t,
    label: TOPIC_DISPLAY_NAMES[t] ?? t,
  }));

  const toggleTopic = (topicKey: string) => {
    const next = new Set(selectedTopics);
    if (next.has(topicKey)) {
      next.delete(topicKey);
    } else {
      next.add(topicKey);
    }
    setSelectedTopics(next);
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (selectedTopics.size < MIN_TOPIC_SELECTIONS) {
      setError(
        `Please select at least ${MIN_TOPIC_SELECTIONS} topics (you've selected ${selectedTopics.size})`
      );
      return;
    }

    if (!timezone) {
      setError("Please select your timezone");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topics: Array.from(selectedTopics),
            timezone,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Something went wrong. Please try again.");
        } else {
          setSuccess(true);
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push("/feed");
          }, 1500);
        }
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  };

  if (success) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-black">
        <div className="w-full max-w-2xl space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-lg text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Welcome aboard!
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Your preferences are saved. Taking you to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Personalize your brief
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Select at least {MIN_TOPIC_SELECTIONS} topics that interest you, and choose
            your timezone.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Topic Grid */}
          <fieldset>
            <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
              Choose your topics (selected: {selectedTopics.size}/
              {MIN_TOPIC_SELECTIONS}+ required)
            </legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map(({ key, label }) => {
                const isSelected = selectedTopics.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleTopic(key)}
                    className={`flex items-center rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm"
                        : "border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                        isSelected
                          ? "border-blue-500 bg-blue-500 dark:border-blue-400 dark:bg-blue-400"
                          : "border-zinc-400 dark:border-zinc-600"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Timezone Selection */}
          <div className="mt-8">
            <label
              htmlFor="timezone"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Timezone
            </label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
              className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="">Select your timezone</option>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
