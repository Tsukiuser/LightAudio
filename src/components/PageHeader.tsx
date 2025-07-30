import * as React from 'react';

export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-4 p-4 pt-6 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground font-headline">
        {title}
      </h1>
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </header>
  );
}
