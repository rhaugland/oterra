"use client";

import { useState } from "react";

function StatCard({
  label,
  value,
  names,
  labelColor,
}: {
  label: string;
  value: number;
  names: string[];
  labelColor?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="bg-gray-50 rounded-lg p-3 relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p className={`text-[10px] font-semibold uppercase ${labelColor || "text-gray-400"}`}>
        {label}
      </p>
      <p className="text-xl font-bold text-gray-900 mt-0.5 cursor-default">{value}</p>
      {hovered && names.length > 0 && (
        <span className="absolute z-50 left-0 top-full mt-1 w-56">
          <span className="block bg-white border border-gray-200 rounded-lg shadow-lg p-2">
            <span className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">
              {label}
            </span>
            {names.slice(0, 15).map((n, i) => (
              <span key={i} className="block text-xs text-gray-700 py-0.5 truncate">
                {n}
              </span>
            ))}
            {names.length > 15 && (
              <span className="block text-[10px] text-gray-400 pt-0.5">
                +{names.length - 15} more
              </span>
            )}
          </span>
        </span>
      )}
    </div>
  );
}

interface ReceiptCardProps {
  weekLabel: string;
  isCurrent: boolean;
  receiptNumber: number;
  newContacts: number;
  newContactNames: string[];
  ndasSent: number;
  ndaSentNames: string[];
  ndasSigned: number;
  ndaSignedNames: string[];
  totalDocViews: number;
  docViewDetails: string[];
  magicLinksSent: number;
  magicLinkNames: string[];
}

export function ReceiptCard({
  weekLabel,
  isCurrent,
  receiptNumber,
  newContacts,
  newContactNames,
  ndasSent,
  ndaSentNames,
  ndasSigned,
  ndaSignedNames,
  totalDocViews,
  docViewDetails,
  magicLinksSent,
  magicLinkNames,
}: ReceiptCardProps) {
  const hasActivity =
    newContacts > 0 ||
    ndasSent > 0 ||
    ndasSigned > 0 ||
    totalDocViews > 0 ||
    magicLinksSent > 0;

  return (
    <div
      className={`bg-white rounded-xl border ${
        isCurrent ? "border-ottera-red-600/30 shadow-md" : "border-gray-200"
      } p-6`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{weekLabel}</h2>
          {isCurrent && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-ottera-red-50 text-ottera-red-600 mt-1">
              Current Week
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-[10px] font-semibold text-gray-400 uppercase">
            Receipt #{receiptNumber}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="New Contacts" value={newContacts} names={newContactNames} />
        <StatCard label="NDAs Sent" value={ndasSent} names={ndaSentNames} />
        <StatCard
          label="NDAs Signed"
          value={ndasSigned}
          names={ndaSignedNames}
          labelColor="text-green-600"
        />
        <StatCard label="Doc Views" value={totalDocViews} names={docViewDetails} />
        <StatCard
          label="Rooms Accessed"
          value={magicLinksSent}
          names={magicLinkNames}
          labelColor="text-blue-600"
        />
      </div>

      {!hasActivity && (
        <p className="text-xs text-gray-400 mt-3 text-center">No activity this week</p>
      )}
    </div>
  );
}
