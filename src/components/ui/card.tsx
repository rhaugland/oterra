import * as React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: boolean;
  header?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, padding = true, header, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          "bg-white border border-gray-200 rounded-xl shadow-sm",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {header && (
          <div className="border-b border-gray-200 px-6 py-4">{header}</div>
        )}
        <div className={padding ? "px-6 py-5" : undefined}>{children}</div>
      </div>
    );
  }
);

Card.displayName = "Card";
