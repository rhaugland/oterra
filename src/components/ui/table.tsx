import * as React from "react";

interface TableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Table({ children, className = "", ...props }: TableProps) {
  return (
    <div
      className={["overflow-x-auto rounded-lg border border-gray-200", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <table className="min-w-full divide-y divide-gray-200">{children}</table>
    </div>
  );
}

interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function TableHead({ children, className = "", ...props }: TableHeadProps) {
  return (
    <thead
      className={["bg-gray-50", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </thead>
  );
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function TableBody({ children, className = "", ...props }: TableBodyProps) {
  return (
    <tbody
      className={["bg-white divide-y divide-gray-200", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </tbody>
  );
}

interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export function Th({ children, className = "", ...props }: ThProps) {
  return (
    <th
      scope="col"
      className={[
        "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </th>
  );
}

interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export function Td({ children, className = "", ...props }: TdProps) {
  return (
    <td
      className={["px-6 py-4 whitespace-nowrap text-sm text-gray-900", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </td>
  );
}
