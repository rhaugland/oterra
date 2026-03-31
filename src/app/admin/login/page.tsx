"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed. Please try again.");
        return;
      }

      router.push("/admin");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ottera-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Image
          src="/ottera-logo.png"
          alt="OTTera"
          width={160}
          height={48}
          priority
        />
        <p className="mt-3 text-sm text-gray-400 font-[var(--font-jura)]">
          Secure Data Room
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-gray-200 rounded-xl sm:px-10">
          <h2 className="text-center text-lg font-semibold text-gray-900 mb-6">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 shadow-sm focus:border-ottera-red-600 focus:outline-none focus:ring-1 focus:ring-ottera-red-600 sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 shadow-sm focus:border-ottera-red-600 focus:outline-none focus:ring-1 focus:ring-ottera-red-600 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                href="/admin/forgot-password"
                className="text-sm text-ottera-red-600 hover:text-ottera-red-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-ottera-red-600 hover:bg-ottera-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ottera-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        {/* Security Badges */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <svg
              className="w-4 h-4 text-green-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs">256-bit AES encrypted</span>
          </div>

          <div className="flex items-center gap-6">
            {/* AWS */}
            <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-[#FF9900]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 01-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 01-.287-.375 6.18 6.18 0 01-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.03-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.032-.863.104-.296.072-.583.16-.863.272a2.287 2.287 0 01-.28.104.488.488 0 01-.127.024c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.288a.596.596 0 01.216-.16 4.37 4.37 0 011.005-.36 4.8 4.8 0 011.246-.168c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .535-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.048-.191.08-.423.08-.694v-.335a6.66 6.66 0 00-.735-.136 6.02 6.02 0 00-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.064-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 01-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 01.32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 01.311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 01-.056.2l-1.923 6.17c-.048.16-.104.264-.168.312a.549.549 0 01-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.271-.15.327-.064.056-.176.08-.32.08zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.216-.151-.248-.223a.563.563 0 01-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.32.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 00.415-.758.777.777 0 00-.215-.559c-.144-.151-.415-.287-.806-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.813a1.902 1.902 0 01-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.415.32-.096.655-.136 1.006-.136.176 0 .36.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 01.24.2.43.43 0 01.071.263v.375c0 .168-.064.256-.184.256a.83.83 0 01-.303-.096 3.652 3.652 0 00-1.532-.311c-.455 0-.815.071-1.062.223-.248.152-.375.383-.375.71 0 .224.08.416.24.567.16.152.454.304.878.44l1.134.358c.574.184.99.44 1.237.767.248.328.375.703.375 1.118 0 .344-.072.659-.207.942-.144.284-.335.535-.575.742-.24.216-.535.376-.886.488-.36.12-.735.176-1.142.176z"/>
                <path d="M21.408 16.79c-2.199 1.624-5.39 2.488-8.134 2.488-3.847 0-7.312-1.421-9.931-3.788-.207-.183-.024-.44.223-.296 2.83 1.645 6.322 2.639 9.931 2.639 2.435 0 5.114-.503 7.578-1.549.375-.152.686.248.333.506z"/>
                <path d="M22.268 15.822c-.28-.36-1.861-.168-2.571-.088-.216.024-.248-.16-.056-.296 1.261-.886 3.327-.63 3.567-.335.24.303-.064 2.38-1.246 3.37-.183.152-.358.072-.279-.128.271-.678.886-2.163.585-2.523z"/>
              </svg>
              <span className="text-[11px] text-gray-500 font-medium">AWS</span>
            </div>

            {/* Vercel */}
            <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L24 22H0L12 1z"/>
              </svg>
              <span className="text-[11px] text-gray-500 font-medium">Vercel</span>
            </div>

            {/* PostgreSQL */}
            <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4 text-[#336791]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.128 0a10.134 10.134 0 00-2.755.403l-.063.02A10.922 10.922 0 0012.6.258C11.422.238 10.41.524 9.594 1 8.79.721 7.122.24 5.364.336 4.14.403 2.804.775 1.814 1.82.827 2.865.305 4.482.415 6.682c.03.607.203 1.597.49 2.879s.69 2.783 1.193 4.152c.503 1.37 1.054 2.6 1.915 3.436.43.419.95.695 1.544.685.498-.008.952-.256 1.37-.627.039.106.088.2.149.279.503.658 1.199.644 1.741.369a2.18 2.18 0 001.037-1.07c.036-.085.063-.173.092-.262.233.135.484.204.737.191.38-.02.723-.211.988-.477l.01.005c-.01.232-.022.45-.028.652-.032 1.057-.053 1.738.216 2.303.158.333.504.793 1.16.997.627.194 1.39.088 2.13-.378a.678.678 0 00.06-.044c.438-.348.762-.924.97-1.478.208-.555.337-1.093.399-1.407.038-.191.093-.492.128-.783.062.008.122.016.185.02 1.04.073 1.928-.26 2.572-.741.644-.481 1.06-1.06 1.293-1.474l.043-.083c.142-.286.166-.49.089-.652-.077-.163-.253-.226-.378-.267-.494-.159-.94-.076-1.32.074.14-.343.232-.653.273-.906.06-.378.069-.756-.065-1.082a1.088 1.088 0 00-.558-.537c-.173-.083-.35-.127-.52-.142.138-.143.245-.307.332-.482.244-.493.303-1.089.167-1.776a3.225 3.225 0 00-.462-1.083c.192-.776.24-1.565.153-2.334-.15-1.31-.617-2.52-1.503-3.36A5.023 5.023 0 0017.128 0z"/>
              </svg>
              <span className="text-[11px] text-gray-500 font-medium">PostgreSQL</span>
            </div>
          </div>

          <p className="text-[10px] text-gray-600 text-center mt-4 leading-relaxed">
            Hosted on AWS with enterprise-grade encryption.<br />
            Your data is protected with AES-256 encryption at rest<br />
            and TLS 1.3 in transit.
          </p>
        </div>
      </div>
    </div>
  );
}
